var express = require('express');
var passport = require('passport');
var Auth = require('../utils/Auth');
var router = express.Router();

// GET /login
router.get('/', Auth.isLoggedOut, function(req, res, next) {
  res.render('login', {
    message: req.flash('message')
  });
});

// POST /login
router.post('/', Auth.isLoggedOut, passport.authenticate('local-login', {
  successRedirect : '/',
  failureRedirect : '/login',
  failureFlash : true
}));

module.exports = router;
