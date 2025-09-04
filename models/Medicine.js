const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  medicine: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  source: { type: String },
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

module.exports = mongoose.model('Medicine', medicineSchema);
