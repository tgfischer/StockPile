var express = require('express');
var listings = require('../config/nasdaq-listing');
var Company = require('../models/Company');
var request = require("request");
var moment = require("moment");
var dq = require('datatables-query')
var router = express.Router();

var API_KEY = "18bcbc1c281f1431245daff8bbc743e7469e05cc";

/* GET home page. */
router.get('/', function(req, res, next) {
  /*
  Company.insertMany(listings, function(err, companies) {
    res.render('index', {
      companies: companies
    });
  });
  */
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
router.get("/news", function(req, res, next) {
  var requestURI = "https://access.alchemyapi.com/calls/data/GetNews?apikey=" + API_KEY + "&return=enriched.url.title,enriched.url.enrichedTitle.docSentiment&start=now-7d&end=now&q.enriched.url.enrichedTitle.entities.entity=|text=" + "Apple" + ",type=company|&count=10000&dedup=true&outputMode=json";

  request({
    uri: requestURI,
    method: "GET",
    timeout: 10000
  }, function(err, response, body) {
    if (err) {
      res.send ("An error occurred: " + err);
    } else {
      // We successfully gathered the sentiment data for this company
      body = JSON.parse(body);
      if (body.result && body.result.docs && body.result.docs.length) {
        for (var i = 0; i < body.result.docs.length; i++) {
          var item = body.result.docs[i];
          if (item.source && item.source.enriched && item.source.enriched.url && item.source.enriched.url.enrichedTitle
                          && item.source.enriched.url.enrichedTitle.docSentiment) {

            var sentiment = item.source.enriched.url.enrichedTitle.docSentiment;
            var score = sentiment.score;
            console.log("Score " + i + ": " + score);
            if (item.timestamp) {
              var a = new Date(item.timestamp * 1000);
              var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
              var year = a.getFullYear();
              var month = months[a.getMonth()];
              var date = a.getDate();
              var hour = a.getHours();
              var min = a.getMinutes();
              var sec = a.getSeconds();
              var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
              console.log("Date " + i + ": " + time);
            }
          }
        }
      }
      res.send ("Successfully obtained the sentiment data: " + JSON.stringify(body, null, 2));
    }
  });
});



module.exports = router;
