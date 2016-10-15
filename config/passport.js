var LocalStrategy = require('passport-local').Strategy;
var sanitizer = require('sanitizer');
var User = require('../models/User');
var Auth = require('../utils/Auth');

module.exports = function(passport) {

  // Used to serialize the user for the session
  passport.serializeUser(function (user, done) {
    done(null, user.id);
  });

  // Used to deserialize the user
  passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
      done(err, user);
    });
  });

  // =========================================================================
  // LOCAL SIGNUP ============================================================
  // =========================================================================
  passport.use('local-signup', new LocalStrategy({
    // By default, local strategy uses username and password, we will override with email
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true // allows us to pass back the entire request to the callback
  }, function (req, email, password, done) {
    process.nextTick(function () {
      User.find({ }, function(err, rows) {
        if (err) {
          return done(err);
        }

        // Get the next available ID. If the collection is empty, the id defaults to 0
        var newUser = new User();
        newUser.firstName = sanitizer.sanitize(req.body.firstName);
        newUser.lastName = sanitizer.sanitize(req.body.lastName);
        newUser.email = sanitizer.sanitize(email);
        newUser.password = newUser.generateHash(sanitizer.sanitize(password));

        // Find a user whose email is the same as the forms email
        // We are checking to see if the user trying to login already exists
        User.findOne({ 'email': newUser.email }, function (err, user) {
          if (err) {
            return done(err);
          }

          // Check to see if theres already a user with that email
          if (user) {
            // Wait 3 seconds on wrong email, to deter brute force attacks
            return setTimeout(function() {
              return done(null, false, req.flash('message', 'That email is already taken.'));
            }, 3000);
          } else {
            // Save the user
            newUser.save(function(err) {
              if (err) {
                throw err;
              }

              return done(null, newUser);
            });
          }
        });
      });
    });
  }));

  // =========================================================================
  // LOCAL LOGIN =============================================================
  // =========================================================================
  passport.use('local-login', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true // allows us to pass back the entire request to the callback
  }, function (req, email, password, done) { // callback with email and password from our form
    // Find a user whose email is the same as the forms email
    // We are checking to see if the user trying to login already exists
    User.findOne({ 'email': email }, function (err, user) {
      // If there are any errors, return the error before anything else
      if (err) {
        console.error(JSON.stringify(err, null, 2));
        return done(err);
      }

      // If no user is found, return the message
      if (!user) {
        // Wait 3 seconds on wrong email, to deter brute force attacks
        return setTimeout(function() {
          console.error('That user does not exist');
          return done(null, false, req.flash('message', 'That user does not exist'));
        }, 3000);
      }

      // If the user is found but the password is wrong
      if (!user.validatePassword(password)) {
        // Wait 3 seconds on wrong password, to deter brute force attacks
        return setTimeout(function() {
          console.error('Oops! Wrong password.');
          return done(null, false, req.flash('message', 'Oops! Wrong password.'));
        }, 3000);
      }

      // All is well, return successful user
      return done(null, user);
    });
  }));
};
