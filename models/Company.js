var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CompanySchema = new Schema({
  name: String,
  symbol: String,
  open: Number,
  prevClose: Number,
  sentiments: [{ type: Schema.Types.ObjectId, ref: 'Sentiment' }]
}, {
  collection : 'companies'
});

module.exports = mongoose.model('Company', CompanySchema);
