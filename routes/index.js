var express = require('express');
var listings = require('../config/nasdaq-listing-top100');
var Company = require('../models/Company');
var Sentiment = require("../models/Sentiment");
var router = express.Router();
var request = require("request"); 
var dq = require('datatables-query');
var YQL = require('yql');



// var API_KEY = "18bcbc1c281f1431245daff8bbc743e7469e05cc";
//var API_KEY = "7814c8d4f65421498296b5c92824b41944f81bdd";

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
    // console.log(data, null, 2);

    res.json(data);
  
  }, function (err) {
    res.status(500).json(err);
  });
});

/* On initial load, the following routes will be called so that the change percentage and stock price will be updated. They
will also be called when the stock is opened to update it later */
router.get("/stockprice/:companyId", function(req, res, next) {
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
          company.change = parseInt(response.query.results.quote.PercentChange);
          console.log(company.change);
          company.price = response.query.results.quote.Open;
          console.log(company.price);

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
