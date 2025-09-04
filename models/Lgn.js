const mongoose = require('mongoose');

const lgnSchema = new mongoose.Schema({
  lgn_uid: { type: String, required: true, ref: 'User' },  // 6-digit uid (FK)
  lgn_usn: { type: String, required: true, unique: true }, // encrypted
  lgn_usp: { type: String, required: true },               // hashed
  lgn_hsp: { type: String},
  lgn_dpn: { type: String },  // display name

  lgn_rol: {
    type: String,
    enum: ['usr', 'emplyT1', 'emplyT2', 'emplyT3', 'offAdm', 'adm'],
    default: 'emplyT1'
  },
  lgn_mim: { type: String },    // avatar/image
  lgn_sts: { type: Number, default: 0 },

  //  Fields for login tracking
  lgn_dt: { type: Date },        // login datetime
  lgn_ip: { type: String },      // login IP address
  lgn_sid: { type: String },     // session ID or token - can store a JWT, session ID, or UUID
  lgn_cki: { type: String },     // cookie string
  lgn_rfr: { type: String },     // referrer (e.g., page they came from)
  lgn_lot: { type: Date },       // logout datetime

  lgn_loc: { type: String },      // Location (e.g., city, region, country)
  lgn_bro: { type: String },      // Browser info
  lgn_os: { type: String },       // OS info

  // Metadata
  crtdOn: { type: Date, default: Date.now },
  crtdBy: { type: String },
  crtdIp: { type: String },
  updtOn: { type: Date },
  updtBy: { type: String },
  updtIp: { type: String },
  dltOn: { type: Date },
  dltBy: { type: String },
  dltIp: { type: String }
});

module.exports = mongoose.model('Lgn', lgnSchema);
