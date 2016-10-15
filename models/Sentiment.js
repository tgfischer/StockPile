var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var SentimentSchema = new Schema({
  score: Number,
  date: Date
}, {
  collection : 'sentiments'
});

module.exports = mongoose.model('Sentiment', SentimentSchema);
