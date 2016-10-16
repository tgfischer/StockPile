var express = require('express');
var listings = require('../config/nasdaq-listing-top100');
var Company = require('../models/Company');
var Sentiment = require("../models/Sentiment");
var router = express.Router();
var request = require("request"); 
var dq = require('datatables-query');
var YQL = require('yql');

/* GET home page. */
router.get('/', function(req, res, next) {
  // Company.insertMany(listings, function(err, companies) {
  //   res.render('index');
  // });
  res.render('index');
});

router.post('/get_listings', function(req, res, next) {
  var query = dq(Company);

  console.log(JSON.stringify(req.body, null, 2));
  
  query.run(req.body).then(function(data) {
    // TODO: Check the last time the company's information was updated. If greater
    // than n days, update them again
    console.log(data, null, 2);

    res.json(data);
  
  }, function (err) {
    res.status(500).json(err);
  });
});

/* On initial load, the following routes will be called so that the change percentage and stock price will be updated. They
will also be called when the stock is opened to update it later */
router.get("/update/pricing", function(req, res, next) {
  Company.find(function(err, companies) {
    companies.forEach(function(company) {
      // Check the last time the company got modified.
      var currentDate = new Date();
      if (company.lastModified && company.lastModified.getFullYear() === currentDate.getFullYear() 
            && company.lastModified.getMonth() === currentDate.getMonth() 
            && company.lastModified.getDays() === currentDate.getDays() 
            && company.lastModified.getHours() === currentDate.getHours() 
            && Math.abs(company.lastModified.getMinutes() - currentDate.getHours()) < 50) {
              console.log("Don't need to refresh this. It is the same down to the hour!")
            }
      else {
        var YQL_query = new YQL('SELECT * FROM yahoo.finance.quotes WHERE symbol IN ("' + company.symbol + '")');
        YQL_query.setParam("format", "json");
        YQL_query.exec(function(error, response) {
          if (error) {
            console.log(error);
          } else {
            // Define the new values for price and change
            var percentChange = response.query.results.quote.PercentChange; 
            percentChange = percentChange.substring(0, percentChange.length - 1);
            company.change = percentChange;
            company.price = response.query.results.quote.Open;
            company.lastModified = new Date();

            var upsertData = company.toObject();
            delete upsertData._id;
            Company.update({symbol: company.symbol}, upsertData, {upsert:true}, function(insert_err) {
              if (insert_err) {
                console.log("Error updating company sentiment information: " + insert_err);
              } else {
                console.log("Successfully updated stats");
              }
            });
          }
        });
      }
    });
    res.send("Updated");   

  });
});

router.get("/update/pricing/:companyId", function(req, res, next) {
  Company.findById(req.params.companyId, function(err, company) {
    if (err) {
      console.log("Error finding company to update prices");
    } else {
      var YQL_query = new YQL('SELECT * FROM yahoo.finance.quotes WHERE symbol IN ("' + company.symbol + '")');
      YQL_query.setParam("format", "json");
      YQL_query.exec(function(error, response) {
        if (error) {
          console.log(error);
        } else {
          // Define the new values for price and change
          var percentChange = response.query.results.quote.PercentChange; 
          percentChange = percentChange.substring(0, percentChange.length - 1);
          company.change = percentChange;
          company.price = response.query.results.quote.Open;
          company.lastModified = new Date();

          var upsertData = company.toObject();
          delete upsertData._id;
          Company.update({symbol: company.symbol}, upsertData, {upsert:true}, function(insert_err) {
            if (insert_err) {
              console.log("Error updating company sentiment information: " + insert_err);
            } else {
              res.send("Updated");   
            }
          });
        }
      });
    }
  }); 
});

module.exports = router;
