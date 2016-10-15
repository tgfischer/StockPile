var express = require('express');
var sanitizer = require('sanitizer');
var Company = require('../models/Company');
var router = express.Router();

// GET /login
router.get('/:symbol', function(req, res, next) {
  var symbol = sanitizer.sanitize(req.params.symbol);

  // TODO: Populate company with sentiment information
  Company.findOne({ symbol: symbol }, function(err, company) {
    res.render('stock', {
      company: company
    });
  });
});

module.exports = router;
