var express = require('express');
var listings = require('../config/nasdaq-listing');
var Company = require('../models/Company');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  /*
  Company.insertMany(listings, function(err, companies) {
    res.render('index', {
      companies: companies
    });
  });
  */
  Company.find({ }, 'name symbol', function(err, companies) {
    res.render('index', {
      companies: companies
    });
  });
});

module.exports = router;
