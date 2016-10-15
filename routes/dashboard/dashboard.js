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
  var numStocks = parseInt(sanitizer.sanitize(req.body.numStocks));
  var pricePerStock = parseFloat(sanitizer.sanitize(req.body.pricePerStock));
  var stocks = [];

  Company.findOne({ _id : sanitizer.sanitize(req.body.companyId) }, function(err, company) {
    for (var i = 0; i < numStocks; i++) {
      stocks.push({
        price: company.open,
        purchaseDate: Date.now(),
        company: company._id,
        user: req.user._id
      });
    }

    Stock.insertMany(stocks, function(err, stocks) {
      var ids = stocks.map(function(stock) {
        return stock._id;
      });

      User.update({
        _id: req.user._id
      }, {
        $push: {
          stocks: {
            $each: ids
          }
        }
      }, {
        upsert: true
      }, function(err) {
        res.json({ msg: 'Success!' });
      });
    });
  });
});

router.post('/sell', Auth.isLoggedIn, function(req, res, next) {
  var numStocks = parseInt(sanitizer.sanitize(req.body.numStocks));
  var pricePerStock = parseFloat(sanitizer.sanitize(req.body.pricePerStock));
  var stocks = [];

  console.log(JSON.stringify(req.body, null, 2));

  Stock.find({
    company : sanitizer.sanitize(req.body.companyId),
    user: req.user._id
  }).limit(numStocks).exec(function(err, stocks) {
    console.log(JSON.stringify(stocks, null, 2));
    var ids = stocks.map(function(stock) {
      return stock._id;
    });

    Stock.remove({
      _id: {
        $in: ids
      }
    }, function (err) {
      User.update({
        _id: req.user._id
      }, {
        $pull: {
          stocks: {
            $in: ids
          }
        }
      }, {
        upsert: true
      }, function(err) {
        res.json({ msg: 'Success!' });
      });
    });
  });
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
