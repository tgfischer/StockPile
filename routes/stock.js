var express = require('express');
var sanitizer = require('sanitizer');
var request = require('request');
var async = require('async');
var Company = require('../models/Company');
var Stock = require('../models/Stock');
var Sentiment = require("../models/Sentiment");
var Converter = require("csvtojson").Converter;
var router = express.Router();

// API Keys:
var NYT_API_KEY = "3a7cdfc6260b4973992f8aaaedc7f285";
var DANDELION_API_KEY = "8f1d6b453a554e74a6b5e2ea4f98543c";

// GET /login
router.get('/:symbol', function(req, res, next) {
  var symbol = sanitizer.sanitize(req.params.symbol);

  Company.findOne({ symbol: symbol }, function(err, company) {
    var url = "http://ichart.finance.yahoo.com/table.csv?s=" + symbol + "&g=m";

    request({
      url: url,
      method: 'GET'
    }, function(error, response, body) {
      var converter = new Converter({ });
      converter.fromString(body, function(err, history) {
        history = history.slice(0, 10);

        if (req.user) {
          Stock.find({
            user: req.user._id,
            company: company._id
          }, function(err, stocks) {
            res.render('stock', {
              company: company,
              history: history,
              amountOwned: stocks.length
            });
          })
        } else {
          res.render('stock', {
            company: company,
            history: history,
            amountOwned: -1
          });
        }
      });
    });
  });
});

router.get("/update/:symbol", function(req, res, next) {
  var symbol = sanitizer.sanitize(req.params.symbol);

  Company.findOne({ symbol: symbol }, function(err, company) {
    res.send(company);
  });
});


router.get("/sentiment/:_id", function(req, res, next) {
  var companyId = req.params._id;

  Company.findById(companyId, function(error, company) {
    var companyName = company.name;
    console.log(companyName);
    if (error) {
      return res.send("Error occurred when querying the company._id: " + error);
    } else {
      // STEP 1: Make a call to the New York Times API to gather all the artical urls that mention the company name.
      var offsets = [0, 1, 2, 3, 4];
      var offsetCount = 0;
      //offsets.forEach(function(item, i) {
      async.each(offsets, function(offset, callback) {
        request.get({
          url: "https://api.nytimes.com/svc/search/v2/articlesearch.json",
          qs: {
            'api-key': "3a7cdfc6260b4973992f8aaaedc7f285",
            'q': companyName,
            'begin_date':'20160101',
            'end_date': '20161015',
            'page':offset
          },
        }, function(err, response, body) {
          if (err) {
            return res.send("Error occurred when making request to New York Times API: " + err);
          } else {
            var docs = [];
            body = JSON.parse(body);
            if (body && body.response && body.response.docs) {
              if (docs.length == 0) {
                docs = body.response.docs;
              } else {
                docs.concat(body.response.docs);
              }
            }

            callback(docs);
          }
        });
      }, function(results) {
        var allDocs = [].concat.apply([], results);

        handleNewYorkTimesResults(allDocs, function(urls) {
          if (urls) {
            // STEP 2: For each url returned from New York Times API, get the sentiment score from dandelion API.
            handleSentimentParsing(urls, function(sentimentValues) {
              // Hopefully now we have an array of sentiment values for the company with dates associated!
              handleDandelionResults(sentimentValues, function(finalSentimentArray) {
                if (finalSentimentArray && finalSentimentArray.length !== 0) {
                  // This callback will accept an array of the sentiments we need to save to the current company
                  Sentiment.insertMany(finalSentimentArray, function(many_err, sentiments) {
                    if (many_err) {
                      return res.send ("Error entering sentiments: " + many_err);
                    } else {
                      console.log("Successful insert");
                      for (var i = 0; i < sentiments.length; i++) {
                        company.sentiments.push(sentiments[i]._id);
                      }
                      company.lastUpdated = new Date();
                      var upsertData = company.toObject();
                      delete upsertData._id;
                      Company.update({symbol: company.symbol}, upsertData, {upsert:true}, function(insert_err) {
                        if (insert_err) {
                          return res.send("Error updating company sentiment information: " + insert_err);
                        } else {
                          return res.send("Successfully obtained the sentiment data & stored in company: " + JSON.stringify(body, null, 2));
                        }
                      });
                    }
                  });
                } else {
                  return res.send("Unable to get sentiment information");
                }
              });
            });
          } else {
            return res.end("Error handling New York Times results");
          }
        });
      });
      //});
    } // end else
  });// end company.findById
});

function handleNewYorkTimesResults(allDocs, callback) {
  var arrayOfUrls = [];
  if (allDocs.length) {
    for (var i = 0; i < allDocs.length; i++) {
      var urlObj = {
        url: allDocs[i].web_url,
        date: allDocs[i].pub_date
      };
      arrayOfUrls.push(urlObj);
    }
    callback(arrayOfUrls);
  } else {
    callback(null);
  }
}

function handleSentimentParsing(urls, next) {
  async.each(urls, function(item, callback) {
    request.get({
      url: "https://api.dandelion.eu/datatxt/sent/v1/?lang=en&url=" + item.url + "&token=" + DANDELION_API_KEY
    }, function(dand_err, response, body) {
      if (dand_err) {
        res.send("Error occurred when making request to dandelion API: " + dand_err);
      } else {
        body = JSON.parse(body);
        if (body && body.sentiment) {
          var sentimentObj = {
            score: body.sentiment.score,
            date: new Date(item.date)
          };
          callback(sentimentObj);
        } else {
          callback();
        }
      }
    });
  }, function(results) {
    next(results);
  });
}

function handleDandelionResults(arrayOfSentiments, callback) {
  callback(arrayOfSentiments);
}

/* Use this route to retrieve the necessary Sentiment objects based on the ids from the Company list */
router.post("/sentiment", function(req, res, next) {
  var sentimentIds = req.body.sentiments;
  if (sentimentIds) {
    Sentiment.find(function(err, data) {
      if (err) {
        res.send ("An error occurred: " + err);
      } else {
        var necessaryIds = [];
        for (var i = 0; i < data.length; i++) {
          for (var j = 0; j < sentimentIds.length; j++) {
            if (data[i]._id == sentimentIds[j]) {
              necessaryIds.push(data[i]);
            }
          }
        }
        res.send (necessaryIds);
      }
    });
  } else {
    res.send ([]);
  }
});

module.exports = router;
