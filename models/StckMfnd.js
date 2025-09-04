const mongoose = require('mongoose');

const stckMfndSchema = new mongoose.Schema({
  type: { type: String, enum: ['Stock', 'Mutual Fund', 'Time Deposit', 'Personal','Other'], required: true },
  name: { type: String, required: true },
  value: { type: Number },
  nsecode: { type: String },
  bsecode: { type: String },
  isin: { type: String },
  sector: { type: String },
  actiontype: { type: String, enum: ['Follow', 'Wishlist', 'Snoozed'] },
  followup: { type: String },
  starton: { type: Date },
  endon: { type: Date},
  description: { type: String },
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

module.exports = mongoose.model('StckMfnd', stckMfndSchema);
