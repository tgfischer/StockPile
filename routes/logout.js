var express = require('express');
var Auth = require('../utils/Auth');
var router = express.Router();

// GET /logout
router.get('/', Auth.isLoggedIn, function(req, res) {
  req.logout();
  res.redirect('/login');
});

module.exports = router;
