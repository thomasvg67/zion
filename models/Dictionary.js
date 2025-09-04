const mongoose = require('mongoose');

const dictionarySchema = new mongoose.Schema({
  language: { type: String, required: true },
  words: { type: String, required: true },
  source: { type: String },
  meaning: { type: String },
  noOfAlerts: { type: Number, default: 0 },
  startFrom: { type: Date },
  sts: { type: Boolean, default: true },

  // audit fields
  crtdBy: String,
  crtdIp: String,
  crtdOn: { type: Date, default: Date.now },
  updtBy: String,
  updtIp: String,
  updtOn: Date,
  dltBy: String,
  dltIp: String,
  dltOn: Date,
  dltSts: { type: Boolean, default: false },
});

module.exports = mongoose.model('Dictionary', dictionarySchema);
