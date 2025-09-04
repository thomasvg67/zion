const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  uId: { type: String, unique: true }, // 6-digit user ID
  name: { type: String, required: true },
  email: { type: String, required: true }, // encrypted
  emails: {
  type: [String],
  validate: [arrayLimit, '{PATH} exceeds the limit of 4']
},
  ph: { type: String },
  avtr: { type: String },
  biodata: { type: String },
  job: { type: String },
  loc: { type: String },
  bio: { type: String },
  country: { type: String },
  address: { type: String },
  website: { type: String },
  socials: [{
    facebook: String,
    twitter: String,
    linkedin: String,
    instagram: String,
    github: String
  }],
  skills: [{
    name: String,
    level: Number
  }],
  education: [{
    college: String,
    startMonth: String,
    startYear: String,
    endMonth: String,
    endYear: String,
    description: String
  }],
  workExp: [{
    company: String,
    title: String,
    location: String,
    startMonth: String,
    startYear: String,
    endMonth: String,
    endYear: String,
    description: String
  }],
  act_dt: { type: Date }, // ✅ Activation date-time
  crtdOn: { type: Date, default: Date.now },
  crtdBy: { type: String },
  crtdIp: { type: String },
  updtOn: { type: Date },
  updtBy: { type: String },
  updtIp: { type: String },
  dltOn: { type: Date },
  dltBy: { type: String },
  dltIp: { type: String },
  sts: { type: Number, default: 0 },
  dltSts: { type: Number, default: 0 }
});

function arrayLimit(val) {
  return val.length <= 4;
}

module.exports = mongoose.model('User', userSchema);
