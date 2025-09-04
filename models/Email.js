const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema({
  from: { 
    type: String, 
    required: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please use a valid email address']
  },
  to: {
  type: [String],
  validate: {
    validator: function (emails) {
      return !emails || emails.every(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    },
    message: 'Invalid email address in To field'
  }
},
  cc: {
  type: [String],
  validate: {
    validator: function (emails) {
      // Allow undefined, null, or empty arrays
      if (!emails || emails.length === 0) return true;
      return emails.every(email =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      );
    },
    message: 'One or more CC addresses are invalid'
  },
  default: [] // Also ensures mongoose sets this to empty array if nothing is passed
}
,
  subject: { 
    type: String, 
  },
  content: { 
    type: String, 
  },
  category: { 
    type: String, 
    enum: ['inbox', 'sent', 'drafts', 'trash', 'spam', 'important','personal', 'work', 'social', 'private'], 
    default: 'inbox' 
  },
  // group: { 
  //   type: String, 
  //   enum: ['personal', 'work', 'social', 'private']
  // },
  read: { type: Boolean, default: false },
  attachments: [{
    filename: String,
    path: String,
    size: Number,
    contentType: String,
    publicUrl: String // Add this if using cloud storage
  }],

  // Audit fields
  crtdBy: String,
  crtdIp: String,
  crtdOn: { type: Date, default: Date.now },
  updtBy: String,
  updtIp: String,
  updtOn: Date,
  dltBy: String,
  dltIp: String,
  dltOn: Date,
  dltSts: { type: Boolean, default: false }
});

module.exports = mongoose.model('mlBx', emailSchema);