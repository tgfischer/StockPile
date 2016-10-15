var express = require('express');

var Auth = {
  isLoggedIn : function(req, res, next) {
    if (req.user) {
      next();
    } else {
      res.redirect('/login');
    }
  },

  isLoggedOut : function(req, res, next) {
    if (!req.user) {
      next();
    } else {
      res.redirect('/');
    }
  }
}

module.exports = Auth;
