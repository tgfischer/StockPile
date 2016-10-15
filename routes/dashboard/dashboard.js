var express = require('express');
var passport = require('passport');
var sanitizer = require('sanitizer');
var async = require('async');
var Stock = require('../../models/Stock');
var Company = require('../../models/Company');
var User = require('../../models/User');
var Auth = require('../../utils/Auth');
var router = express.Router();

router.get('/', Auth.isLoggedIn, function(req, res, next) {
  res.render('dashboard');
});

router.post('/buy', Auth.isLoggedIn, function(req, res, next) {
  var numStocks = parseInt(sanitizer.sanitize(req.body.numBuyStocks));
  var pricePerStock = parseFloat(sanitizer.sanitize(req.body.pricePerStock));
  var stocks = [];

  Company.findOne({ _id : sanitizer.sanitize(req.body.companyId) }, function(err, company) {
    for (var i = 0; i < numStocks; i++) {
      stocks.push({
        price: company.open,
        purchaseDate: Date.now(),
        company: company._id
      });
    }

    Stock.insertMany(stocks, function(err, stocks) {
      var stockIds = [];

      stocks.forEach(function(stock) {
        stockIds.push(stock._id);
      });
      console.log(JSON.stringify(stockIds, null, 2));
      User.update({
        _id: req.user._id
      }, {
        $push: {
          stocks: {
            $each: stockIds
          }
        }
      }, {
        upsert: true
      }, function(err) {

        res.json({ msg: 'Success!' });
      });
    });
  })
});

router.post('/get_stocks', Auth.isLoggedIn, function(req, res, next) {
  query.run(req.body).then(function(companies) {
    var populatedList = [];

    async.each(visits, function(company, callback) {
      company.populate('stocks', function(err, stock) {
        populatedList.push(company);
        callback();
      });
    }, function(err) {
      if (err) {
        return next(err);
      }

      res.json(populatedList);
    });
  }, function (err) {
    res.status(500).json(err);
  });
});

module.exports = router;
