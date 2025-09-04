const mongoose = require('mongoose');

const ideaSchema = new mongoose.Schema({
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

const businessSchema = new mongoose.Schema({
    name: { type: String, required: true },
    ideas: [ideaSchema],

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

module.exports = mongoose.model('BusinessIdea', businessSchema);
