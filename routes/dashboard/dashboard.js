var express = require('express');
var passport = require('passport');
var sanitizer = require('sanitizer');
var async = require('async');
var dq = require('datatables-query');
var Utils = require('../../utils/Utils');
var Stock = require('../../models/Stock');
var Company = require('../../models/Company');
var User = require('../../models/User');
var Auth = require('../../utils/Auth');
var router = express.Router();

router.get('/', Auth.isLoggedIn, function(req, res, next) {
  res.render('dashboard/dashboard');
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
        Company.update({
          _id: company._id
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
        Company.update({
          _id: sanitizer.sanitize(req.body.companyId)
        }, {
          $pull: {
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
});

router.post('/get_stocks', Auth.isLoggedIn, function(req, res, next) {
  var user = req.user;

  var draw = Number(req.body.draw);
  var start = Number(req.body.start);
  var length = Number(req.body.length);

  var findParameters = Utils.buildFindParameters(req.body);
  var sortParameters = Utils.buildSortParameters(req.body);
  var selectParameters = Utils.buildSelectParameters(req.body);

  var recordsTotal = 0;
  var recordsFiltered = 0;

  async.series([
    function checkParams (cb) {
      if (Utils.isNaNorUndefined(draw, start, length)) {
        return cb(new Error('Some parameters are missing or in a wrong state. ' +
        'Could be any of draw, start or length'));
      }

      if (!findParameters || !sortParameters || !selectParameters) {
        return cb(new Error('Invalid findParameters or sortParameters or selectParameters'));
      }
      cb();
    },
    function fetchRecordsTotal (cb) {
      var companies = [];

      for (var i = 0; i < user.stocks.length; i++) {
        if (!companies.filter(function(c) { return c._id == user.stocks[i].company._id; }).length) {
          companies.push(user.stocks[i].company);
        }
      }

      recordsTotal = companies.length;
      cb();
    },
    function fetchRecordsFiltered (cb) {
      var companies = [];

      Stock.find({ user: user._id }, function(err, results) {
        for (var i = 0; i < results.length; i++) {
          if (!companies.filter(function(c) {
            return String(c.company) == String(results[i].company);
          }).length) {
            companies.push(results[i]);
          }
        }

        recordsFiltered = companies.length;
        cb();
      });
    },
    function runQuery (cb) {
      selectParameters.stocks = 1;

      var companies = [];

      for (var i = 0; i < user.stocks.length; i++) {
        if (!companies.filter(function(c) { return c._id == user.stocks[i].company._id; }).length) {
          companies.push(user.stocks[i].company._id);
        }
      }

      Company
        .find(findParameters)
        .and([{
          _id: {
            $in: companies
          }
        }])
        .populate('stocks')
        .select(selectParameters)
        .limit(length)
        .skip(start)
        .sort(sortParameters)
        .exec(function(err, results) {
          if (err) {
            return cb(err);
          }

          cb(null, {
            draw: draw,
            recordsTotal: recordsTotal,
            recordsFiltered: recordsFiltered,
            data: results
          });
      });
    }
  ], function resolve (err, results) {
    if (err) {
      reject({
        error: err
      });
    } else {
      var answer = results[results.length - 1];

      res.json(answer);
    }
  });
});

module.exports = router;
