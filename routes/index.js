var express = require('express');
var listings = require('../config/nasdaq-listing');
var Company = require('../models/Company');
var Sentiment = require("../models/Sentiment");
var router = express.Router();
var request = require("request");
var dq = require('datatables-query')

// var API_KEY = "18bcbc1c281f1431245daff8bbc743e7469e05cc";
var API_KEY = "7814c8d4f65421498296b5c92824b41944f81bdd";

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});

router.post('/get_listings', function(req, res, next) {
  var query = dq(Company);

  query.run(req.body).then(function(data) {
    // TODO: Check the last time the company's information was updated. If greater
    // than n days, update them again
    console.log(data, null, 2);
    res.json(data);
  }, function (err) {
    res.status(500).json(err);
  });
});

/* GET sentiment data for 'company' */
router.get("/news/:_id", function(req, res, next) {
  var companyId = req.params._id;
  var requestURI = "https://access.alchemyapi.com/calls/data/GetNews?apikey=" + API_KEY + "&return=enriched.url.title,enriched.url.enrichedTitle.docSentiment&rank=high&start=now-40d&end=now&q.enriched.url.enrichedTitle.entities.entity=|text=" + "Google" + ",type=company|&count=2000&dedup=true&outputMode=json";

  /*The route will be passed the _id of the company. We can do a find by id here to pick out the correct company for making
    the request, and then also use the company _id when saving the sentimentArray into the correct company. Use a callback
    after getting the full array of sentiment data to execute the save all and company save. */
  var handleResponse = function(err, response, body, callback) {
    var arrayOfSentiments = [];       // every sentiment returned, as depicted with date and score
    var finalArrayOfSentiments = [];      // this will be the tempArrayOfSentiments compressed by day
    if (err) {
      res.send ("An error occurred: " + err);
    } else {
      body = JSON.parse(body);  // Put body data into a readable format
      if (body.status && body.statusInfo) {
        res.send ("We could not get a response: " + body.statusInfo);
      }
      // We successfully retrieved the sentiment data for this company
      if (body.result && body.result.docs && body.result.docs.length) {
        for (var i = 0; i < body.result.docs.length; i++) {
          var item = body.result.docs[i];
          if (item && item.source && item.source.enriched && item.source.enriched.url && item.source.enriched.url.enrichedTitle
                  && item.source.enriched.url.enrichedTitle.docSentiment && item.timestamp) {

            // Pull out the important information from the current result.
            var docSentiment = item.source.enriched.url.enrichedTitle.docSentiment;
            var score = docSentiment.score;
            var unixTime = new Date(item.timestamp * 1000);
            var finalDate = new Date(unixTime.getFullYear(), unixTime.getMonth(), unixTime.getDate(), unixTime.getHours(),
                  unixTime.getMinutes(), unixTime.getSeconds(), 0);

            var sentimentObject = {
              score: score,
              date: finalDate
            };
            arrayOfSentiments.push(sentimentObject);
          }
        }

        /* After there has been all the sentiments pushed into the array of sentiments, let's compress this array to each day.
          When running through the array, check what the date is. If it matches a current entry, modify the score of that entry.
          If it does not match, create a new entry. */
        for (var i = 0; i < arrayOfSentiments.length; i++) {
          var exists = false;
          for (var j = 0; j < finalArrayOfSentiments.length; j++) {
            if (finalArrayOfSentiments[j].date.getDay() === arrayOfSentiments[i].date.getDay()
                  && finalArrayOfSentiments[j].date.getMonth() === arrayOfSentiments[i].date.getMonth()
                  && finalArrayOfSentiments[j].date.getFullYear() === arrayOfSentiments[i].date.getFullYear()) {
              finalArrayOfSentiments[j].score += arrayOfSentiments[i].score;
              finalArrayOfSentiments[j].count = finalArrayOfSentiments[j].count + 1;
              exists = true;
              break;
            }
          }

          // If the date doesn't exist, we need to push a new value - this value will include the count... for now.
          if (!exists) {
            var finalSentimentObject = {
              score: arrayOfSentiments[i].score,
              date: arrayOfSentiments[i].date,
              count: 1
            };
            finalArrayOfSentiments.push(finalSentimentObject);
          }
        }

        // Now that we have compressed the arrayOfSentiments into the finalArrayOfSentiments, we need to recalculate the scores
        for (var i = 0; i < finalArrayOfSentiments.length; i++) {
          finalArrayOfSentiments[i].score = (finalArrayOfSentiments[i].score / finalArrayOfSentiments[i].count);
          delete finalArrayOfSentiments[i].count;
        }
        callback(finalArrayOfSentiments);
      } // end first if
    }
  };

  // Fire off the request to the AlchemyNews API to gather more sentiment data
  request({
    uri: requestURI,
    method: "GET",
    timeout: 10000
  }, function(err, response, body) {
      handleResponse(err, response, body, function(sentiments) {
        // This callback will accept an array of the sentiments we need to save to the current company
        Sentiment.insertMany(sentiments, function(many_err, sents) {
          if (many_err) {
            res.send ("Error entering sentiments: " + many_err);
          } else {
            // Saved Sentiments to MongoDB. This is where we will attach the SAVED sentiments in the Company using the id passed.
            Company.findById(companyId, function(comp_err, company) {
              if (comp_err) {
                res.send("Error retrieving company to add sentiment data: " + comp_err);
              } else {
                for (var i = 0; i < sents.length; i++) {
                  company.sentiments.push(sents[i]._id);
                }

                var upsertData = company.toObject();
                delete upsertData._id;
                Company.update({symbol: company.symbol}, upsertData, {upsert:true}, function(insert_err) {
                  if (insert_err) {
                    res.send("Error updating company sentiment information: " + insert_err);
                  } else {
                    res.send ("Successfully obtained the sentiment data & stored in company: " + body);
                  }
                });
              }
            });
          }
        });
      });
    });
  });


module.exports = router;
