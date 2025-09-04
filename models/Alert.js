// models/Alert.js
const mongoose = require('mongoose');
const alertSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  startTime: Date,
  endTime: Date,
  subject: String,
  assignedTo: String,
  status: { type: Number, default: 0 },
  crtdOn: { type: Date, default: Date.now },
  crtdBy: String,
  crtdIp: String,
  updtOn: Date,
  updtBy: String,
  updtIp: String,
  dltOn: Date,
  dltBy: String,
  dltIp: String,
  dltSts: { type: Number, default: 0 }
});
module.exports = mongoose.model('alrTbl', alertSchema);
