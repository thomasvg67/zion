const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  category: { type: String, required: true, enum: ['birthday', 'medical-insurance', 'health-insurance', 'vehicle-insurance', 'deposit', 'wedding-anniversary', 'others'] },
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  badge: { type: String,  }, 
  sts: { type: Boolean, default: true },

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

module.exports = mongoose.model('CalendarEvent', calendarEventSchema);
