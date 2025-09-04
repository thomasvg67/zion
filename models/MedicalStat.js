const mongoose = require('mongoose');

const medicalStatSchema = new mongoose.Schema({
  subCategory: { type: String, required: true },
  hospital:    { type: String, required: true },
  phone:       { type: String },
  consultedBy: { type: String },
  measures:    { type: Number, required: true },
  checkedOn:   { type: Date },
  description: { type: String },

  // Creation Info
  crtdOn: { type: Date, default: Date.now },
  crtdBy: { type: String },
  crtdIp: { type: String },

  // Update Info
  updtOn: { type: Date },
  updtBy: { type: String },
  updtIp: { type: String },

  // Deletion Info
  dltOn: { type: Date },
  dltBy: { type: String },
  dltIp: { type: String },
  dltSts: { type: Boolean, default: false },

  // General Status
  sts: { type: Boolean, default: true }
});

module.exports = mongoose.model('MedicalStat', medicalStatSchema);
