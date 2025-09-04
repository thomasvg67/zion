const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
    subCategory: { type: String, required: true },
    title: { type: String, required: true },
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

    // Status
    sts: { type: Boolean, default: true }
});

module.exports = mongoose.model('Story', storySchema);
