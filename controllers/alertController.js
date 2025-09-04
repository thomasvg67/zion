const Alert = require('../models/Alert');
const Client = require('../models/Client');
const TdyAlert = require('../models/TdyAlert');
const moment = require("moment-timezone");


function getISTDayRange() {
  const istStart = moment().tz("Asia/Kolkata").startOf("day").toDate();     // Today 00:00 IST
  const istEnd = moment().tz("Asia/Kolkata").endOf("day").toDate();         // Today 23:59:59.999 IST

  // console.log("IST Start:", istStart.toISOString());
  // console.log("IST End  :", istEnd.toISOString());

  return {
    startOfToday: istStart,
    endOfToday: istEnd
  };
}



exports.getTodayAlerts = async (req, res) => {
  try {
    const uid = req.user?.uid;

    const alerts = await TdyAlert.find({
      dltSts: 0,
      status: 0,
      assignedTo: uid
    }).populate('clientId');

    res.json(alerts);
  } catch (err) {
    res.status(500).send(err.message);
  }
};


exports.editAlert = async (req, res) => {
  try {
    const ip = req.ip;
    const userId = req.user?.uid || 'system';

    const updated = await TdyAlert.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updtOn: new Date(),
        updtBy: userId,
        updtIp: ip
      },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.snoozeOneDay = async (req, res) => {
  try {
    const { id } = req.params;

    // first get the record
    const alertRecord = await TdyAlert.findById(id);
    if (!alertRecord) {
      return res.status(404).json({ message: "Alert not found" });
    }

    // remove from alrTbl
    await TdyAlert.findByIdAndDelete(id);

    // update client for next day
    const clientId = alertRecord.clientId;
    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1);

    await Alert.findOneAndUpdate(
      { clientId: alertRecord.clientId, dltSts: 0 },  // match alert by clientId
      { $set: { startTime: nextDay } },
      { new: true }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).send(err.message);
  }
};


exports.getAllAlertsForUser = async (req, res) => {
  try {
    const uid = req.user?.uid;

    // Use the same IST day range function you have defined
    const { startOfToday, endOfToday } = getISTDayRange();

    const alerts = await TdyAlert.find({
      dltSts: 0,
      status: 0,
      assignedTo: uid,
      alertTime: { $gte: startOfToday, $lte: endOfToday },
    }).populate('clientId');

    // Debug logs
    // console.log('--- Alerts Query Parameters ---');
    // console.log('User ID:', uid);
    // console.log('Start of Today (UTC):', startOfToday);
    // console.log('End of Today (UTC):', endOfToday);
    // console.log('Current Time (UTC):', new Date());
    // console.log('Found Alerts Count:', alerts.length);

    alerts.forEach((alert, idx) => {
      // console.log(`Alert ${idx + 1}:`, {
      //   id: alert._id,
      //   subject: alert.subject,
      //   alertTime: alert.alertTime,
      //   contact: alert.contactId?.name,
      //   assignedTo: alert.assignedTo
      // });
    });

    res.json(alerts);
  } catch (err) {
    console.error('Error fetching alerts:', err);
    res.status(500).send(err.message);
  }
};