const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  msg_sid: { type: String, required: true },        // sender ID
  msg_rid: { type: String, required: true },        // receiver ID
  msg_typ: { type: String, default: 'text' },       // message type
  msg_cnt: { type: String, required: true },        // message content
  msg_sts: { 
    type: Number, 
    default: 1,            // 1=unread, 2=read, 0=deleted
    enum: [0, 1, 2]        // Only allow these values
  },
   isSender: { type: Boolean, default: false },       // whether the message was sent by the current user

  msg_crt: { type: Date, default: Date.now },       // created at
  createdAt: { type: Date, default: Date.now },
  msg_cru: { type: String },                        // created by
  msg_cri: { type: String },                        // created IP

  msg_dlt: { type: Date },                          // deleted at
  msg_dlu: { type: String },                        // deleted by
  msg_dli: { type: String }                         // deleted IP
});

const chatSchema = new mongoose.Schema({
  cht_usr: {
    type: [String], // array of 2 user IDs
    required: true
  },

  cht_msg: [messageSchema],                         // message list

  cht_crt: { type: Date, default: Date.now },       // chat created at
  cht_cru: { type: String },                        // created by
  cht_cri: { type: String },                        // created IP

  cht_dlt: { type: Date },                          // deleted at
  cht_dlu: { type: String },                        // deleted by
  cht_dli: { type: String }                         // deleted IP
}, {
  collection: 'cht_dts'
});

module.exports = mongoose.model('Chat', chatSchema);
