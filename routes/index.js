var express = require('express');
var listings = require('../config/nasdaq-listing-top100');
var Company = require('../models/Company');
var Sentiment = require("../models/Sentiment");
var router = express.Router();
var request = require("request"); 
var dq = require('datatables-query');

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

  // console.log(JSON.stringify(req.body, null, 2));

  query.run(req.body).then(function(data) {
    // TODO: Check the last time the company's information was updated. If greater
    // than n days, update them again
    // console.log(data, null, 2);
    res.json(data);
  }, function (err) {
    res.status(500).json(err);
  });
});

module.exports = router;
