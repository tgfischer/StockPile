var express = require('express');
var passport = require('passport');
var Auth = require('../utils/Auth');
var router = express.Router();

// GET /signup
router.get('/', Auth.isLoggedOut, function(req, res, next) {
  res.render('signup', {
    message: req.flash('message')
  });
});

// POST /signup
router.post('/', Auth.isLoggedOut, passport.authenticate('local-signup', {
  successRedirect : '/',
  failureRedirect : '/signup',
  failureFlash : true
}));

module.exports = router;
