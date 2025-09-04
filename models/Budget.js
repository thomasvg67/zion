const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: [
      'Yearly', 
      'Half Yearly', 
      '1st Quarter', 
      '2nd Quarter', 
      '3rd Quarter', 
      '4th Quarter', 
      'Mile Stones', 
      'Target',
      'Mind Sets',
      'Dreams',
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

module.exports = mongoose.model('Budget', budgetSchema);