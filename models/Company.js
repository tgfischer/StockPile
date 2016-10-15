var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CompanySchema = new Schema({
  name: String,
  symbol: String,
  open: Number,
  prevClose: Number,
  lastUpdated: Date,
  sentiments: [{ type: Schema.Types.ObjectId, ref: 'Sentiment' }],
  stocks: [{ type: Schema.Types.ObjectId, ref: 'Stock' }]
}, {
  collection : 'companies'
});

module.exports = mongoose.model('Company', CompanySchema);
