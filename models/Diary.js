const mongoose = require('mongoose');

const diarySchema = new mongoose.Schema({
  date: { type: String, required: true },
  message: { type: String, required: true },
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

module.exports = mongoose.model('Diary', diarySchema);
