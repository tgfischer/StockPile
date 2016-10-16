var express = require('express');
var sanitizer = require('sanitizer');
var Company = require('../models/Company');
var Sentiment = require("../models/Sentiment");
var router = express.Router();
var request = require("request");

// API Keys:
var NYT_API_KEY = "3a7cdfc6260b4973992f8aaaedc7f285";
var DANDELION_API_KEY = "8f1d6b453a554e74a6b5e2ea4f98543c";

// GET /login
router.get('/:symbol', function(req, res, next) {
  var symbol = sanitizer.sanitize(req.params.symbol);

  // TODO: Populate company with sentiment information
  Company.findOne({ symbol: symbol }, function(err, company) {
    res.render('stock', {
      company: company
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
      res.send("Error occurred when querying the company._id: " + error);
    } else {
      // STEP 1: Make a call to the New York Times API to gather all the artical urls that mention the company name.
      var offsets = [0, 1, 2, 3, 4];
      var allDocs = [];
      var offsetCount = 0;
      offsets.forEach(function(item) {
        request.get({
          url: "https://api.nytimes.com/svc/search/v2/articlesearch.json",
          qs: {
            'api-key': "3a7cdfc6260b4973992f8aaaedc7f285",
            'q': companyName,
            'begin_date':'20160101',
            'end_date': '20161015',
            'page':item
          },
        }, function(err, response, body) {
          offsetCount++;
          if (err) {
            res.send("Error occurred when making request to New York Times API: " + nyt_err);
          } else {
            body = JSON.parse(body);
            if (body && body.response && body.response.docs) {
              if (allDocs.length == 0) {
                allDocs = body.response.docs;
              } else {
                allDocs.concat(body.response.docs);
              }
            }

            if (offsetCount === offsets.length) {
              handleNewYorkTimesResults(allDocs, function(urls) {
                if (urls) {
                  // STEP 2: For each url returned from New York Times API, get the sentiment score from dandelion API.
                  handleSentimentParsing(urls, function(sentimentValues) {
                    // Hopefully now we have an array of sentiment values for the company with dates associated!
                    handleDandelionResults(sentimentValues, function(finalSentimentArray) {
                      // This callback will accept an array of the sentiments we need to save to the current company
                      Sentiment.insertMany(finalSentimentArray, function(many_err, sentiments) {
                        if (many_err) {
                          res.send ("Error entering sentiments: " + many_err);
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
                              res.send("Error updating company sentiment information: " + insert_err);
                            } else {
                              res.send("Successfully obtained the sentiment data & stored in company: " + JSON.stringify(body, null, 2));
                            }
                          });
                        }
                      });
                    });
                  });
                } else {
                  res.send("Error handling New York Times results: " + body);
                }
              });
            }
          }
        });
      });
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

function handleSentimentParsing(urls, callback) {
  var sentimentValues = [];
  urls.forEach(function(item, index) {
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
          sentimentValues.push(sentimentObj);
        }

        if (sentimentValues.length === urls.length) {
          callback(sentimentValues);
        }
      }
    });
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
  }
});

module.exports = router;
