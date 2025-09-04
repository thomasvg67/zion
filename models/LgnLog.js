const mongoose = require('mongoose');

const lgnLogSchema = new mongoose.Schema({
    lgn_uid: { type: String, required: true },  // 6-digit user ID (from Lgn)
    lgn_usn: { type: String, required: true },  // username (email or uname)
    lgn_typ: { type: String, enum: ['nrml', 'hscrt'], default: 'nrml' },
    lgn_ip: { type: String },
    lgn_loc: { type: String },
    lgn_bro: { type: String },
    lgn_dt: { type: Date, default: Date.now },
    lgn_lot: { type: Date, default: null }, // Logout time
    success: { type: Boolean, default: false }
});

module.exports = mongoose.model('LgnLog', lgnLogSchema);
