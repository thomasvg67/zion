const mongoose = require('mongoose');

const fundSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: [
      'Rainyday Fund', 
      'Emergency Fund', 
      'Short Term Fund', 
      'Long Term Fund', 
      'Credit', 
      'Friday Investment', 
      'Big Bites', 
      'Others'
    ], 
    required: true 
  },
  title: { type: String, required: true },
  description: { type: String },
  starton: { type: Date },
  endon: { type: Date },
  active: { type: Boolean, default: true },

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

module.exports = mongoose.model('Fund', fundSchema);