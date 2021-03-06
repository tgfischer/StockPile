var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var StockSchema = new Schema({
  price: Number,
  purchaseDate: Date,
  company: { type: Schema.Types.ObjectId, ref: 'Company' },
  user: { type: Schema.Types.ObjectId, ref: 'User' }
}, {
  collection : 'stocks'
});

module.exports = mongoose.model('Stock', StockSchema);
