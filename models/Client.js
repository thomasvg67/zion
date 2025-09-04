// models/Client.js

const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: String,
  occup: String,
  cntry: String,
  city: String,
  ph: { type: String, required: true },
  loc: String,
  subject: { type: String },
  assignedTo: { type: String },
  category: String,
  // startTime: Date,
  // endTime: Date,
  src: String,
  gmap: String,
  audio: [
    {
      file: String,
      uploadedOn: { type: Date, default: Date.now }
    }
  ],
  fdback: [{
    content: String, crtdOn: { type: Date, default: Date.now }, crtdBy: String, crtdIp: String
  }],
  avtr: {
    type: String,
  },
  crtdOn: { type: Date, default: Date.now },
  crtdBy: { type: String },
  crtdIp: { type: String },
  updtOn: { type: Date },
  updtBy: { type: String },
  updtIp: { type: String },
  dltOn: { type: Date },
  dltBy: { type: String },
  dltIp: { type: String },
  dltSts: { type: Number, default: 0 },
  sts: { type: Number, default: 0 },
});

module.exports = mongoose.model('Client', clientSchema);
