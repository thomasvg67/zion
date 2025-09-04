// controllers/clientController.js

const Alert = require('../models/Alert');
const Client = require('../models/Client');
const TdyAlert = require('../models/TdyAlert');
const FdBack = require('../models/FdBack');
const { encrypt, decrypt } = require('../routes/encrypt');
const moment = require("moment-timezone");
const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');
const os = require('os');

const FRONTEND_URL = process.env.FRONTEND_URL;

// Upload audio buffer to cPanel
async function uploadAudioToCpanel(file, remoteFolder = '/uploads/zion') {
  const client = new ftp.Client();
  client.ftp.verbose = false;
  try {
    
     const MAX_SIZE = 333 * 1024; 
    if (file.size > MAX_SIZE) {
      throw new Error("Audio file size exceeds 333 KB limit");
    }

    await client.access({
      host: process.env.FTP_HOST,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASS,
      secure: false
    });

    await client.ensureDir(remoteFolder);

    const ext = path.extname(file.originalname) || ".mp3";
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;

    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, uniqueName);

    // Save buffer temporarily
    fs.writeFileSync(tempFilePath, file.buffer);

    // Upload
    await client.uploadFrom(tempFilePath, `${remoteFolder}/${uniqueName}`);

    // Return public URL
    return `${FRONTEND_URL}/uploads/zions/${encodeURIComponent(uniqueName)}`;
  } finally {
    client.close();
  }
}

function getISTDayRange() {
  const istStart = moment().tz("Asia/Kolkata").startOf("day").toDate(); // Today 00:00 IST
  const istEnd = moment().tz("Asia/Kolkata").endOf("day").toDate();     // Today 23:59:59.999 IST
  return { startOfToday: istStart, endOfToday: istEnd };
}

function safeDecrypt(value) {
  try {
    if (!value) return "";
    return decrypt(value) || "";
  } catch (err) {
    console.warn("⚠️ Decryption failed, returning raw value:", value);
    return value; // fallback to raw DB value
  }
}


exports.addClient = async (req, res) => {
  try {
    const ip = req.ip;
    const userId = req.user?.uid || 'system';
    const { fdback, startTime, endTime, subject, ...clientData } = req.body;

    if (clientData.email) clientData.email = encrypt(clientData.email);
    if (clientData.ph) clientData.ph = encrypt(clientData.ph);

      if (req.file) {
      const audioUrl = await uploadAudioToCpanel(req.file);
      clientData.audio = [{ file: audioUrl, uploadedOn: new Date() }];
    }

    const client = new Client({
      ...clientData,
      fdback: fdback ? [{
        content: fdback,
        crtdOn: new Date(),
        crtdBy: userId,
        crtdIp: ip
      }] : [],
      crtdOn: new Date(),
      crtdBy: userId,
      crtdIp: ip,
      assignedTo: clientData.assignedTo || userId
    });

    const savedClient = await client.save();

    // ✅ Always create alert record
    if (startTime) {
      const alertDoc = {
        clientId: savedClient._id,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        subject: subject && subject.trim() !== "" ? subject : `Reminder for ${clientData.name}`,
        status: 0,
        assignedTo: savedClient.assignedTo,
        crtdOn: new Date(),
        crtdBy: userId,
        crtdIp: ip
      };

      await Alert.create(alertDoc);

      // ✅ If alert is today, also store in tdyAlrt
      const { startOfToday, endOfToday } = getISTDayRange();
      if (alertDoc.startTime >= startOfToday && alertDoc.startTime <= endOfToday) {
        await TdyAlert.create({
          clientId: savedClient._id,
          alertTime: alertDoc.startTime,
          subject: alertDoc.subject,
          assignedTo: savedClient.assignedTo,
          status: alertDoc.status,
          crtdOn: new Date(),
          crtdBy: userId,
          crtdIp: ip
        });
      }
    }

    res.json(savedClient);
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
};

exports.getAllClients = async (req, res) => {
  try {
    const role = req.user?.role;
    const uid = req.user?.uid;
    const category = req.query.category;

    let query = { dltSts: 0 };
    if (role !== 'adm') query.assignedTo = uid;
    if (category && category !== 'All') query.category = category;

    const search = req.query.search || "";
    if (search.trim() !== "") {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { ph: { $regex: search, $options: "i" } },
        { loc: { $regex: search, $options: "i" } }
      ];
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [clients, total] = await Promise.all([
      Client.find(query).sort({ crtdOn: -1 }).skip(skip).limit(limit),
      Client.countDocuments(query)
    ]);

    const enrichedClients = await Promise.all(
      clients.map(async (client) => {
        const alert = await Alert.findOne(
          { clientId: client._id, dltSts: 0 },
          { startTime: 1, endTime: 1, subject: 1, status: 1 }
        ).sort({ crtdOn: -1 });

        return {
          ...client.toObject(),
          ph: safeDecrypt(client.ph),
          email: safeDecrypt(client.email),
          startTime: alert ? alert.startTime : null,
          endTime: alert ? alert.endTime : null,
          subject: alert ? alert.subject : null,
          alertStatus: alert ? alert.status : null,
        };
      })
    );

    res.json({
      clients: enrichedClients,
      total,
      page,
      pages: Math.ceil(total / limit)
    });

  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
};

exports.editClient = async (req, res) => {
  try {
    const ip = req.ip;
    const userId = req.user?.uid || 'system';
    const { fdback, startTime, endTime, subject, ...clientData } = req.body;

    if (clientData.email) clientData.email = encrypt(clientData.email);
    if (clientData.ph) clientData.ph = encrypt(clientData.ph);

    const updateData = {
      ...clientData,
      updtOn: new Date(),
      updtBy: userId,
      updtIp: ip,
    };

    if (req.user?.role === 'adm') {
      updateData.assignedTo = clientData.assignedTo;
    }

    if (fdback) {
      updateData.$push = {
        fdback: { content: fdback, crtdOn: new Date(), crtdBy: userId, crtdIp: ip }
      };
    }

    if (req.file) {
      const audioUrl = await uploadAudioToCpanel(req.file);
      updateData.$push = {
        ...(updateData.$push || {}),
        audio: { file: audioUrl, uploadedOn: new Date() }
      };
    }

    const updated = await Client.findByIdAndUpdate(req.params.id, updateData, { new: true });

    // Update alerts if new startTime provided
    if (startTime) {
      const nxtAlrtDate = new Date(startTime);
      const { startOfToday, endOfToday } = getISTDayRange();

      await Alert.updateOne(
        { clientId: req.params.id, dltSts: 0 },
        {
          clientId: req.params.id,
          startTime: nxtAlrtDate,
          endTime: endTime || null,
          subject: subject || `Reminder for ${clientData.name}`,
          assignedTo: clientData.assignedTo || userId,
          status: 0,
          updtOn: new Date(),
          updtBy: userId,
          updtIp: ip,
        },
        { upsert: true }
      );

      // Mirror to TdyAlert if today's alert
      await TdyAlert.deleteMany({ clientId: req.params.id });
      if (nxtAlrtDate >= startOfToday && nxtAlrtDate <= endOfToday) {
        await TdyAlert.create({
          clientId: req.params.id,
          alertTime: nxtAlrtDate,
          subject: subject || `Reminder for ${clientData.name}`,
          assignedTo: clientData.assignedTo || userId,
          status: 0,
          crtdOn: new Date(),
          crtdBy: userId,
          crtdIp: ip
        });
      }
    }

    res.json(updated);
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.deleteClient = async (req, res) => {
  try {
    const ip = req.ip;
    const userId = req.user?.uid || 'system';

    const deleted = await Client.findByIdAndUpdate(req.params.id, {
      dltOn: new Date(),
      dltBy: userId,
      dltIp: ip,
      dltSts: 1
    }, { new: true });

    await Alert.updateMany(
      { clientId: req.params.id, dltSts: 0 },
      { dltOn: new Date(), dltBy: userId, dltIp: ip, dltSts: 1 }
    );

    await TdyAlert.deleteMany({ clientId: req.params.id });

    res.json(deleted);
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.getSuggestions = async (req, res) => {
  try {
    const { name, ph, email } = req.query;
    let suggestions = {};

    if (name && name.length >= 3) {
      suggestions.names = (await Client.find({
        name: { $regex: name, $options: 'i' }, dltSts: 0
      }).limit(5).select('name ph email')).map(c => ({
        ...c.toObject(),
        ph: safeDecrypt(c.ph) || '',
        email: safeDecrypt(c.email) || ''

      }));
    }

    if (ph && ph.length >= 5) {
      suggestions.phones = (await Client.find({
        ph: { $regex: `^${ph}`, $options: 'i' }, dltSts: 0
      }).limit(5).select('name ph loc')).map(c => ({
        ...c.toObject(),
        ph: safeDecrypt(c.ph) || '',
      }));

      if (ph.length === 10) {
        const exact = await Client.findOne({ ph, dltSts: 0 });
        if (exact) suggestions.existingPhone = true;
      }
    }

    if (email && email.length >= 5) {
      suggestions.emails = (await Client.find({
        email: { $regex: `^${email}`, $options: 'i' }, dltSts: 0
      }).limit(5).select('name email loc')).map(c => ({
        ...c.toObject(),
        email: safeDecrypt(c.email) || ''
      }));

      if (/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
        const exact = await Client.findOne({ email, dltSts: 0 });
        if (exact) suggestions.existingEmail = true;
      }
    }

    res.json(suggestions);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching suggestions");
  }
};

exports.bulkDeleteClients = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No client IDs provided' });
    }

    const result = await Client.updateMany(
      { _id: { $in: ids }, dltSts: 0 },
      { $set: { dltSts: 1, dltOn: new Date() } }
    );

    await Alert.updateMany(
      { clientId: { $in: ids }, dltSts: 0 },
      { dltSts: 1, dltOn: new Date() }
    );

    await TdyAlert.deleteMany({ clientId: { $in: ids } });

    res.json({ message: `${result.modifiedCount} client(s) soft-deleted successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Bulk deletion failed' });
  }
};
