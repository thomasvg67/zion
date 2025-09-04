// controllers/contactController.js

const Alert = require('../models/Alert');
const Contact = require('../models/Contact');
const FdBack = require('../models/FdBack');
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
    return `${FRONTEND_URL}/uploads/zion/${encodeURIComponent(uniqueName)}`;
  } finally {
    client.close();
  }
}

function getISTDayRange() {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const now = new Date();
  const istNow = new Date(now.getTime() + istOffset);

  const startOfToday = new Date(istNow);
  startOfToday.setHours(0, 0, 0, 0);
  startOfToday.setTime(startOfToday.getTime() - istOffset);

  const endOfToday = new Date(istNow);
  endOfToday.setHours(23, 59, 59, 999);
  endOfToday.setTime(endOfToday.getTime() - istOffset);

  return { startOfToday, endOfToday };
}

exports.addContact = async (req, res) => {
  try {
    const ip = req.ip;
    const userId = req.user?.uid || 'system';

    const { fdback, ...contactData } = req.body;

     if (req.file) {
      const audioUrl = await uploadAudioToCpanel(req.file);
      contactData.audio = [
        {
          file: audioUrl,
          uploadedOn: new Date()
        }
      ];
    }


    const contact = new Contact({
      ...contactData,
      crtdOn: new Date(),
      crtdBy: userId,
      crtdIp: ip,
      // assignedTo: contactData.assignedTo || userId
    });

    const savedContact = await contact.save();

    // save feedback if present
    if (fdback && fdback.trim() !== '') {
      const feedback = new FdBack({
        contactId: savedContact._id,
        fdback,
        crtdOn: new Date(),
        crtdBy: userId,
        crtdIp: ip
      });
      await feedback.save();
    }

    // check if nxtAlrt is today and create alert
//     if (contactData.nxtAlrt) {
//       const nxtAlrtDate = new Date(contactData.nxtAlrt);

//       const { startOfToday, endOfToday } = getISTDayRange();


//       if (nxtAlrtDate >= startOfToday && nxtAlrtDate <= endOfToday) {
//         await Alert.create({
//   contactId: savedContact._id,
//   alertTime: nxtAlrtDate,
//   subject: contactData.subject || `Reminder for ${contactData.name}`,
//   status: 0,
//   assignedTo: savedContact.assignedTo, // ✅ Add this line
//   crtdOn: new Date(),
//   crtdBy: userId,
//   crtdIp: ip
// });

//       }
//     }

    res.json(savedContact);
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.getAllContacts = async (req, res) => {
  try {
    const role = req.user?.role;
    const uid = req.user?.uid;

    let query = { dltSts: 0 };
    if (role !== 'adm') {
      query.assignedTo = uid;
    }

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

    const [contacts, total] = await Promise.all([
      Contact.find(query).sort({ crtdOn: -1 }).skip(skip).limit(limit),
      Contact.countDocuments(query)
    ]);

    res.json({
      contacts,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
};

exports.editContact = async (req, res) => {
  try {
    const ip = req.ip;
    const userId = req.user?.uid || 'system'; // consistent: store UID

    const { fdback, ...contactData } = req.body;

   if (req.file) {
  const audioUrl = await uploadAudioToCpanel(req.file);
  await Contact.findByIdAndUpdate(
    req.params.id,
    {
      $push: {
        audio: {
          file: audioUrl,
          uploadedOn: new Date()
        }
      }
    }
  );
}

    const updateData = {
      ...contactData,
      updtOn: new Date(),
      updtBy: userId,
      updtIp: ip,
    };

    // Only admin can reassign
    if (req.user?.role === 'adm') {
      updateData.assignedTo = contactData.assignedTo;
    }

    const updated = await Contact.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    // handle feedback if present
    if (fdback && fdback.trim() !== '') {
      const feedback = new FdBack({
        contactId: req.params.id,
        fdback,
        crtdOn: new Date(),
        crtdBy: userId,
        crtdIp: ip
      });
      await feedback.save();
    }

    // handle alerts update logic
    // if (contactData.nxtAlrt) {
    //   const nxtAlrtDate = new Date(contactData.nxtAlrt);

    //   const { startOfToday, endOfToday } = getISTDayRange();


    //   if (nxtAlrtDate >= startOfToday && nxtAlrtDate <= endOfToday) {
    //     // within today
    //     await Alert.updateOne(
    //       { contactId: req.params.id, dltSts: 0 },
    //       {
    //         contactId: req.params.id,
    //         alertTime: nxtAlrtDate,
    //         subject: contactData.subject || `Reminder for ${contactData.name}`,
    //         assignedTo: contactData.assignedTo || userId,
    //         status: 0,
    //         updtOn: new Date(),
    //         updtBy: userId,
    //         updtIp: ip,
    //       },
    //       { upsert: true }
    //     );
    //   } else {
    //     // future or past date, remove from alert table if exists
    //     await Alert.deleteMany({ contactId: req.params.id });
    //   }
    // }

    res.json(updated);
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.deleteContact = async (req, res) => {
  try {
    const ip = req.ip;
    const userId = req.user?.uid || 'system'; // consistent: store UID

    const deleted = await Contact.findByIdAndUpdate(
      req.params.id,
      {
        dltOn: new Date(),
        dltBy: userId,
        dltIp: ip,
        dltSts: 1
      },
      { new: true }
    );

    // mark related alerts as deleted
    await Alert.updateMany(
      { contactId: req.params.id, dltSts: 0 },
      {
        dltOn: new Date(),
        dltBy: userId,
        dltIp: ip,
        dltSts: 1
      }
    );

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
      suggestions.names = await Contact.find({
        name: { $regex: name, $options: 'i' },
        dltSts: 0
      }).limit(5).select('name ph email');
    }

    if (ph && ph.length >= 5) {
      suggestions.phones = await Contact.find({
        ph: { $regex: `^${ph}`, $options: 'i' },
        dltSts: 0
      }).limit(5).select('name ph loc');

      if (ph.length === 10) {
        const exact = await Contact.findOne({ ph, dltSts: 0 });
        if (exact) suggestions.existingPhone = true;
      }
    }

    if (email && email.length >= 5) {
      suggestions.emails = await Contact.find({
        email: { $regex: `^${email}`, $options: 'i' },
        dltSts: 0
      }).limit(5).select('name email loc');

      if (/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
        const exact = await Contact.findOne({ email, dltSts: 0 });
        if (exact) suggestions.existingEmail = true;
      }
    }

    res.json(suggestions);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching suggestions");
  }
};

exports.bulkDeleteContacts = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No contact IDs provided' });
    }

    const result = await Contact.updateMany(
      { _id: { $in: ids }, dltSts: false },
      {
        $set: {
          dltSts: true,
          dltOn: new Date(),
        },
      }
    );

    res.json({ message: `${result.modifiedCount} contact(s) soft-deleted successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Bulk deletion failed' });
  }
};
