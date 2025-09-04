const mongoose = require('mongoose');

const PlansSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },

    crtdOn: { type: Date, default: Date.now },
    crtdBy: { type: String },
    crtdIp: { type: String },

    updtOn: { type: Date },
    updtBy: { type: String },
    updtIp: { type: String },

    dltOn: { type: Date },
    dltBy: { type: String },
    dltIp: { type: String },
    dltSts: { type: Boolean, default: false },

    sts: { type: Boolean, default: true }
});

const plansSchema = new mongoose.Schema({
    category: { type: String, required: true },
    outcomes: [PlansSchema],

    crtdOn: { type: Date, default: Date.now },
    crtdBy: { type: String },
    crtdIp: { type: String },

    updtOn: { type: Date },
    updtBy: { type: String },
    updtIp: { type: String },

    dltOn: { type: Date },
    dltBy: { type: String },
    dltIp: { type: String },
    dltSts: { type: Boolean, default: false },

    sts: { type: Boolean, default: true }
});

module.exports = mongoose.model('plns', plansSchema);