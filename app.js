var express = require('express');
var ejs = require('ejs');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var passport = require('passport');
var session = require('express-session');
var flash = require('connect-flash');
var bluebird = require('bluebird');

// Create a new express server
var app = express();

mongoose.connect("mongodb://root:babybear@ds013202.mlab.com:13202/stockpile", {
  promiseLibrary: bluebird
});
require('./config/passport')(passport);

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret : 'h4ackWe73Rn',
  resave : true,
  saveUninitialized : true
}));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash());

app.set('view engine', 'ejs');
app.set('port', process.env.PORT || 3000);

// Serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

app.use(function(req, res, next) {
  var user = req.user;

  if (user) {
    user.populate({
      path: 'stocks',
      populate: {
        path: 'company'
      }
    }, function(err, stocks) {
      res.locals.user = user;
      next();
    });
  } else {
    res.locals.user = user;
    next();
  }
});

/* Set up the routes
------------------------------------------------------ */
var index = require('./routes/index');
var stock = require('./routes/stock');
var login = require('./routes/login');
var signup = require('./routes/signup');
var logout = require('./routes/logout');
var dashboard = require('./routes/dashboard/dashboard');

app.use('/', index);
app.use('/stock', stock);
app.use('/login', login);
app.use('/signup', signup);
app.use('/logout', logout);
app.use('/dashboard', dashboard);

/* Start the server
------------------------------------------------------ */
app.listen(app.get('port'), function() {
  console.log("server starting on " + app.get('port'));
});
