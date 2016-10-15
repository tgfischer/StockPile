var express = require('express');
var router = express.Router();
var request = require("request"); 
var moment = require("moment");


var API_KEY = "18bcbc1c281f1431245daff8bbc743e7469e05cc";

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

/* GET sentiment data for 'company' */
router.get("/news", function(req, res, next) {
  var requestURI = "https://access.alchemyapi.com/calls/data/GetNews?apikey=" + API_KEY + "&return=enriched.url.title,enriched.url.enrichedTitle.docSentiment&rank=high&start=now-40d&end=now&q.enriched.url.enrichedTitle.entities.entity=|text=" + "Google" + ",type=company|&count=2000&dedup=true&outputMode=json"; 


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
            //console.log("Score " + i + ": " + score);
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
              if (i == 1) {
                console.log("Date 1:" + time);
              } else if (i == body.result.docs.length - 1) {
                console.log("Date " + i + ": " + time);
              }
            }
          }
        }
      }  
      res.send ("Successfully obtained the sentiment data: " + JSON.stringify(body, null, 2));     
    }
  });
});



module.exports = router;
