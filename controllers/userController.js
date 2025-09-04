const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Lgn = require('../models/Lgn');
const LgnLog = require('../models/LgnLog');
const transporter = require('../middleware/mailer');
const { getNextUserId } = require('../models/Counter');
const { encrypt, decrypt } = require('../routes/encrypt');
const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");
const UAParser = require('ua-parser-js');
const axios = require('axios');


const JWT_SECRET = process.env.JWT_SECRET;

exports.createAdmin = async (req, res) => {
  try {
    const existing = await User.findOne({ uname: 'admin' });
    if (existing) return res.status(400).json({ message: 'Admin user already exists' });

    const hashedPwd = await bcrypt.hash('Admin@123', 10);
    const nextUId = await getNextUserId();

    // Create User document
    const user = new User({
      uId: nextUId,
      uname: 'admin',
      name: 'Administrator',
      email: encrypt('admin@domain.com'),  // 🔄 use valid email
      ph: encrypt('9876543210'),
      role: 'adm',
      crtdBy: 'system',
      crtdIp: req.ip
    });
    await user.save();

    // Create Lgn document
    const lgn = new Lgn({
      lgn_uid: nextUId,
      lgn_unm: 'admin',
      lgn_eml: encrypt('admin@domain.com'), // same email
      lgn_usp: hashedPwd,
      role: 'adm',
      crtdBy: 'system',
      crtdIp: req.ip
    });
    await lgn.save();

    res.json({ message: 'Admin user created successfully', user });
  } catch (err) {
    console.error('Admin creation failed:', err);
    res.status(500).send(err.message);
  }
};

exports.createUser = async (req, res) => {
  const { name, email, ph, role, ...rest } = req.body;

  try {
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const emailLower = email.toLowerCase();
    const emailEncrypted = encrypt(emailLower);

    // 🔍 Check if login already exists
    const existingLogin = await Lgn.findOne({ lgn_usn: emailEncrypted });
    if (existingLogin) return res.status(400).json({ message: 'Email already used' });

    const hashedPwd = await bcrypt.hash(email, 10); // default password: hashed email
    const nextUId = await getNextUserId();

    // 🔧 Create User
    const newUser = new User({
      uId: nextUId,
      name,
      email: emailEncrypted, // store encrypted email
      ph: encrypt(ph),
      crtdBy: nextUId,
      crtdIp: req.ip,
      ...rest
    });
    await newUser.save();

    // 🔐 Create Login
    const newLgn = new Lgn({
      lgn_uid: nextUId,
      lgn_usn: emailEncrypted,
      lgn_usp: hashedPwd,
      lgn_hsp: emailEncrypted,
      lgn_dpn: name,
      lgn_rol: role || 'emplyT1',
      lgn_mim: newUser.avtr || '',
      lgn_sts: 0,
      crtdBy: nextUId,
      crtdIp: req.ip
    });
    await newLgn.save();

    // ✅ Construct Verification Email
    const verificationLink = `${process.env.BASE_URL}/api/users/verify/${newUser._id}`;
    const templatePath = path.join(__dirname, "../utils/email/verifyaccount.html");

    const source = fs.readFileSync(templatePath, "utf8");
    const template = handlebars.compile(source);
    const emailHtml = template({
      username: name,
      userId: newUser._id,
      verificationLink
    });

    // 📬 Log details
    // console.log("📨 Sending email to:", email);
    // console.log("🔐 Encrypted email (saved):", emailEncrypted);
    // console.log("🔗 Verification link:", verificationLink);

    // 📤 Send verification email
    await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: email, // send to plain email
      subject: 'Verify your account',
      html: emailHtml
    });

    res.status(201).json({ message: 'User created, verification email sent', user: newUser });

  } catch (err) {
    console.error("❌ createUser error:", err);

    // Ensure headers are not sent twice
    if (!res.headersSent) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};


exports.verifyUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Get client IP address
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Find User
    const user = await User.findById(id);
    if (!user) return res.status(404).send('Invalid verification link');
    if (user.sts === 1) return res.send('Your email is already verified.');

    // Update User
    user.sts = 1;
    user.act_dt = new Date();
    user.updtOn = new Date();
    user.updtBy = user.uId;
    user.updtIp = ip;
    await user.save();

    // Update Lgn using lgn_uid (FK to user.uId)
    const login = await Lgn.findOne({ lgn_uid: user.uId });
    if (login) {
      login.lgn_sts = 1;
      login.updtOn = new Date();
      login.updtBy = user.uId;
      login.updtIp = ip;
      await login.save();
    }

    // Redirect to frontend login page
    res.redirect(`${process.env.FRONTEND_URL}/login`);
  } catch (err) {
    console.error('Email verification failed:', err);
    res.status(500).send('Server error');
  }
};

exports.login = async (req, res) => {
  const { email, uname, password } = req.body;

  try {
    const encryptedUname = encrypt(uname.toLowerCase());
    const lgn = await Lgn.findOne({ lgn_usn: encryptedUname });

    // 🌐 Capture browser, IP, location before checking password
    const parser = new UAParser();
    const ua = req.headers['user-agent'] || '';
    const uaResult = parser.setUA(ua).getResult();

    let userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    userIp = userIp.split(',')[0].trim().replace('::ffff:', '');
    if (userIp === '::1' || userIp === '127.0.0.1') userIp = '8.8.8.8';

    const browser = uaResult.browser.name + " " + uaResult.browser.version;
    let location = '';
    try {
      const geo = await axios.get(`http://ip-api.com/json/${userIp}`);
      location = `${geo.data.city || ''}, ${geo.data.regionName || ''}, ${geo.data.country || ''}`;
      location = location.split(', ').filter(Boolean).join(', ');
    } catch (err) {
      console.warn('Geo API failed:', err.message);
      location = 'Unknown';
    }

    const isMatch = await bcrypt.compare(password, lgn.lgn_usp);

    // 📋 Log the attempt regardless of success
    await LgnLog.create({
      lgn_uid: lgn?.lgn_uid || 'unknown',
      lgn_usn: uname,
      lgn_ip: userIp,
      lgn_loc: location,
      lgn_bro: browser,
      lgn_dt: new Date(),
      success: isMatch,
      lgn_typ: 'nrml'
    });

    // Lock the user after 3 failed logins from same IP on same day
    if (lgn) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const failedAttempts = await LgnLog.countDocuments({
        lgn_uid: lgn.lgn_uid,
        lgn_ip: userIp,
        lgn_dt: { $gte: todayStart },
        success: false // We'll add this field to lgn_logs below
      });

      if (failedAttempts >= 3) {
        // Set user sts = 0
        await User.updateOne({ uId: lgn.lgn_uid }, { sts: 0 });

        // Set login sts = 0
        await Lgn.updateOne({ lgn_uid: lgn.lgn_uid }, { lgn_sts: 0 });
        return res.status(401).json({ message: 'locked out due to repeated failed attempts.Contact Admin' });

        console.log(`🚫 User ${lgn.lgn_uid} locked out due to repeated failed attempts.`);
      }
    }

    // Check login logic only after logging
    if (!lgn) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    if (lgn.lgn_sts !== 1) {
      return res.status(403).json({ message: 'Account not verified. Please check your email.' });
    }

    const token = jwt.sign(
      {
        uid: lgn.lgn_uid,
        uname,
        role: lgn.lgn_rol
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Update main login (Lgn) table only if success
    lgn.lgn_dt = new Date();
    lgn.lgn_ip = userIp;
    lgn.lgn_sid = token;
    lgn.lgn_cki = req.headers.cookie || '';
    lgn.lgn_bro = browser;
    lgn.lgn_os = uaResult.os.name + " " + uaResult.os.version;
    lgn.lgn_loc = location;
    await lgn.save();

    return res.json({
      token,
      user: {
        uid: lgn.lgn_uid,
        uname,
        role: lgn.lgn_rol,
        avatar: lgn.lgn_mim
      }
    });

  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).send('Internal server error');
  }
};

//Verify High security password
// POST /api/users/verify-password
exports.verifyPassword = async (req, res) => {
  const { uid, password } = req.body;

  if (!uid || !password) {
    return res.status(400).json({ message: 'Missing uid or password' });
  }

  try {
    const lgn = await Lgn.findOne({ lgn_uid: uid });
    if (!lgn) {
      return res.status(404).json({ message: 'User not found' });
    }

    const parser = new UAParser();
    const ua = req.headers['user-agent'] || '';
    const uaResult = parser.setUA(ua).getResult();

    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    ip = ip.split(',')[0].trim().replace('::ffff:', '');
    if (ip === '::1' || ip === '127.0.0.1') ip = '8.8.8.8';

    const browser = uaResult.browser.name + " " + uaResult.browser.version;
    let location = 'Unknown';
    try {
      const geo = await axios.get(`http://ip-api.com/json/${ip}`);
      location = `${geo.data.city || ''}, ${geo.data.regionName || ''}, ${geo.data.country || ''}`.replace(/^,|,$/g, '');
    } catch (err) {
      console.warn('Geo lookup failed:', err.message);
    }

    const isMatch = await bcrypt.compare(password, lgn.lgn_usp);

    // Log attempt
    await LgnLog.create({
      lgn_uid: uid,
      lgn_usn: lgn.lgn_usn,
      lgn_ip: ip,
      lgn_loc: location,
      lgn_bro: browser,
      lgn_dt: new Date(),
      success: isMatch,
      lgn_typ: 'hscrt'
    });

    if (!isMatch) {
      // Count today's failed high-security attempts from same IP
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const failedCount = await LgnLog.countDocuments({
        lgn_uid: uid,
        lgn_ip: ip,
        lgn_typ: 'hscrt',
        lgn_dt: { $gte: todayStart },
        success: false
      });

      if (failedCount >= 3) {
        await User.updateOne({ uId: uid }, { sts: 0 });
        await Lgn.updateOne({ lgn_uid: uid }, { lgn_sts: 0 });

        return res.status(403).json({ message: 'Account locked due to 3 failed high-security attempts. Contact admin.' });
      }

      const attemptsLeft = 3 - failedCount;

      return res.status(401).json({
        message: `Invalid high-security password. ${attemptsLeft} attempt(s) left.`,
        attemptsLeft,
      });

    }

    return res.json({ success: true });

  } catch (err) {
    console.error('🔐 verifyPassword error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const encryptedEmail = encrypt(email);
    const user = await User.findOne({ email: encryptedEmail });

    if (!user) {
      return res.status(404).json({ message: 'Email not found' });
    }

    const hashedResetPassword = await bcrypt.hash(email.toLowerCase(), 10);

    const loginUpdate = await Lgn.findOneAndUpdate(
      { lgn_uid: user.uId },
      { $set: { lgn_usp: hashedResetPassword } },
      { new: true }
    );

    if (!loginUpdate) {
      return res.status(404).json({ message: 'Login record not found' });
    }

    // Decrypt username to send back
    const username = decrypt(loginUpdate.lgn_usn);

    // ✅ Read email template from file
    const filePath = path.join(__dirname, '../utils/email/forgotPass.html');
    let emailHtml = fs.readFileSync(filePath, 'utf8');

    // ✅ Replace placeholders with actual values
    emailHtml = emailHtml
      .replace('{{uId}}', user.uId)
      .replace('{{username}}', username)
      .replace(/{{email}}/g, email)
      .replace('{{password}}', email) // Since it's reset to email
      .replace('{{loginLink}}', `${process.env.FRONTEND_URL}/login`);

    // ✅ Send the email
    const mailOptions = {
      from: `"Zoom Labs" <${process.env.MAIL_USER}>`,
      to: email,
      subject: '🔐 Password Reset Successful',
      html: emailHtml
    };


    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Password reset successfully. Check your email for login details.' });

  } catch (err) {
    console.error('Forgot Password Error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};



exports.getProfile = async (req, res) => {
  try {
    const uid = req.user.uid;

    const user = await User.findOne({ uId: uid });
    const lgn = await Lgn.findOne({ lgn_uid: uid });

    if (!user || !lgn) {
      return res.status(404).json({ message: 'User or login info not found' });
    }

    let decryptedEmail = '', decryptedPh = '', decryptedUsn = '';
    try {
      decryptedEmail = decrypt(user.email);
      decryptedPh = decrypt(user.ph);
      decryptedUsn = decrypt(lgn.lgn_usn);
    } catch (err) {
      return res.status(500).json({ message: 'Decryption failed' });
    }

    res.json({
      uId: user.uId,
      name: user.name,
      uname: decryptedUsn,
      email: decryptedEmail,
       emails: user.emails || [],
      ph: decryptedPh,
      role: lgn.lgn_rol, // ✅ FIXED: role from Lgn
      avtr: user.avtr || lgn.lgn_mim,
      job: user.job || '',
      dob: user.dob,
      loc: user.loc || '',
      bio: user.bio || '',
      address: user.address || '',
      country: user.country || '',
      website: user.website || '',
      socials: user.socials,
      skills: user.skills || [],
      education: Array.isArray(user.education) ? user.education : [],
      workExp: Array.isArray(user.workExp) ? user.workExp : [],
      biodata: user.biodata || '',
    });
  } catch (err) {
    console.error('❌ getProfile error:', err);
    res.status(500).send('Server error');
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const {
      name, job, dob, bio, email, emails, ph, loc, country,
      address, website, education, workExp, socials, skills
    } = req.body;

    // Parse JSON fields
    const parsedEducation = education ? JSON.parse(education) : [];
    const parsedWorkExp = workExp ? JSON.parse(workExp) : [];
    const parsedSkills = skills ? JSON.parse(skills) : [];
    const parsedSocials = socials ? JSON.parse(socials) : {};

    // Build update payload
    const updatePayload = {};
    if (name?.trim()) updatePayload.name = name.trim();
    if (job?.trim()) updatePayload.job = job.trim();
    if (dob) updatePayload.dob = new Date(dob);
    if (bio?.trim()) updatePayload.bio = bio.trim();
    if (email?.trim()) updatePayload.email = encrypt(email.trim());
    if (ph?.trim()) updatePayload.ph = encrypt(ph.trim());
    if (loc?.trim()) updatePayload.loc = loc.trim();
    if (country?.trim()) updatePayload.country = country.trim();
    if (address?.trim()) updatePayload.address = address.trim();
    if (website?.trim()) updatePayload.website = website.trim();
    if (parsedEducation.some(e => e.college?.trim())) updatePayload.education = parsedEducation;
    if (parsedWorkExp.some(e => e.company?.trim())) updatePayload.workExp = parsedWorkExp;
    if (Object.keys(parsedSocials).length > 0) updatePayload.socials = [parsedSocials];
    if (parsedSkills.length > 0) updatePayload.skills = parsedSkills;

    // File uploads
    if (req.files?.imageFile?.[0]) {
      updatePayload.avtr = `/uploads/images/${req.files.imageFile[0].filename}`;
    }
    if (req.files?.pdfFile?.[0]) {
      updatePayload.biodata = `/uploads/pdfs/${req.files.pdfFile[0].filename}`;
    }
  let parsedEmails = [];
try {
  parsedEmails = emails ? JSON.parse(emails) : [];
} catch (err) {
  return res.status(400).json({ message: 'Invalid emails format' });
}

if (!Array.isArray(parsedEmails) || parsedEmails.length > 4) {
  return res.status(400).json({ message: 'Maximum of 4 emails allowed' });
}

for (let email of parsedEmails) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: `Invalid email: ${email}` });
  }
}
    // Audit
    updatePayload.updtOn = new Date();
    updatePayload.updtBy = req.user.uid;
    updatePayload.emails = parsedEmails;

    const updatedUser = await User.findOneAndUpdate(
      { uId: req.user.uid }, // ✅ Corrected lookup field
      updatePayload,
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Profile updated', user: updatedUser });

  } catch (err) {
    console.error('❌ Update failed:', err);
    res.status(500).json({ message: 'Profile update failed', error: err.message });
  }
};


exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  try {
    const login = await Lgn.findOne({ lgn_uid: req.user.uid });
    if (!login) return res.status(404).json({ message: 'Login record not found' });

    const isMatch = await bcrypt.compare(oldPassword, login.lgn_usp);
    if (!isMatch) return res.status(401).json({ message: 'Incorrect old password' });

    const hashedPwd = await bcrypt.hash(newPassword, 10);
    login.lgn_usp = hashedPwd;
    login.updtOn = new Date();
    login.updtBy = req.user.uid; // ✅ Fixed this line

    await login.save();
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.changeHighSecurityPassword = async (req, res) => {
  const { loginPassword, oldSecurePassword, newSecurePassword, confirmSecurePassword } = req.body;

  if (!loginPassword || !oldSecurePassword || !newSecurePassword || !confirmSecurePassword) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (newSecurePassword !== confirmSecurePassword) {
    return res.status(400).json({ message: 'New and confirm passwords do not match' });
  }

  try {
    const login = await Lgn.findOne({ lgn_uid: req.user.uid });
    if (!login) return res.status(404).json({ message: 'User login record not found' });

    // Check login password
    const isLoginPwdMatch = await bcrypt.compare(loginPassword, login.lgn_usp);
    if (!isLoginPwdMatch) {
      return res.status(401).json({ message: 'Incorrect login password' });
    }

    // Check old high-security password
    const isSecurePwdMatch = await bcrypt.compare(oldSecurePassword, login.lgn_psc);
    if (!isSecurePwdMatch) {
      return res.status(401).json({ message: 'Incorrect old high-security password' });
    }

    // Update high-security password
    const hashedNewSecurePassword = await bcrypt.hash(newSecurePassword, 10);
    login.lgn_psc = hashedNewSecurePassword;
    login.updtOn = new Date();
    login.updtBy = req.user.uid;

    await login.save();

    return res.json({ message: 'High-security password changed successfully' });
  } catch (err) {
    console.error('🔐 changeHighSecurityPassword error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


exports.getPaginatedUsers = async (req, res) => {
  try {
    const draw = parseInt(req.query.draw) || 1;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const sortDir = req.query.sortDir === 'asc' ? 1 : -1;
    const validSortFields = ['name', 'lgn_usn', 'email', 'ph', 'job', 'sts', '_id'];
    const sortBy = validSortFields.includes(req.query.sortBy) ? req.query.sortBy : '_id';

    // 🔍 Aggregation pipeline with join
    const pipeline = [
      { $match: { dltSts: { $ne: 1 } } },
      {
        $lookup: {
          from: 'lgns',
          localField: 'uId',
          foreignField: 'lgn_uid',
          as: 'login'
        }
      },
      { $unwind: '$login' },
    ];

    // 🔍 Apply search filters
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { job: { $regex: search, $options: 'i' } },
            { 'login.lgn_usn': { $regex: search, $options: 'i' } }
            // ⚠️ No email regex filter here due to encryption
          ]
        }
      });
    }

    // 📦 Copy pipeline for counts
    const totalPipeline = [...pipeline];
    const filteredPipeline = [...pipeline];

    // 📊 Pagination
    pipeline.push({ $sort: { [sortBy]: sortDir } });
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    // 🚀 Fetch paginated data
    const users = await User.aggregate(pipeline);

    // 🔢 Count
    const recordsTotal = await User.countDocuments({ dltSts: { $ne: 1 } });
    const recordsFiltered = await User.aggregate(filteredPipeline).then(d => d.length);

    // 🧹 Format result
    const data = users.map(user => ({
      uId: user.uId,
      name: user.name,
      uname: user.login?.lgn_usn || '',
      email: user.email ? decrypt(user.email) : '',
      ph: user.ph ? decrypt(user.ph) : '',
      avtr: user.avtr || '',
      job: user.job || '',
      role: user.login?.lgn_rol || '',
      sts: user.sts ?? 0
    }));

    res.json({
      draw,
      recordsTotal,
      recordsFiltered,
      data
    });
  } catch (err) {
    console.error('Error fetching paginated users:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const result = await User.aggregate([
      { $match: { uId: req.params.id } },
      {
        $lookup: {
          from: 'lgns',
          localField: 'uId',
          foreignField: 'lgn_uid',
          as: 'login'
        }
      },
      { $unwind: { path: '$login', preserveNullAndEmptyArrays: true } }
    ]);

    if (!result.length) return res.status(404).json({ message: 'User not found' });

    const user = result[0];

    res.status(200).json({
      uId: user.uId,
      name: user.name,
      uname: user.login?.lgn_usn || '',
      role: user.login?.lgn_rol || '',
      email: user.email ? decrypt(user.email) : '',
      ph: user.ph ? decrypt(user.ph) : '',
      avtr: user.avtr,
      job: user.job,
      dob: user.dob,
      loc: user.loc,
      bio: user.bio,
      address: user.address,
      country: user.country,
      website: user.website,
      socials: user.socials || [],
      skills: user.skills || [],
      education: Array.isArray(user.education) ? user.education : [],
      workExp: Array.isArray(user.workExp) ? user.workExp : [],
      biodata: user.biodata || '',
      sts: user.sts ?? 0
    });
  } catch (err) {
    console.error('Error in getUserById:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.updateUserById = async (req, res) => {
  try {
    const {
      name, job, dob, role, bio, email, ph, loc, country,
      address, website, education, workExp, socials, skills
    } = req.body;

    const parsedEducation = education ? JSON.parse(education) : [];
    const parsedWorkExp = workExp ? JSON.parse(workExp) : [];
    const parsedSkills = skills ? JSON.parse(skills) : [];
    const parsedSocials = socials ? JSON.parse(socials) : {};

    const updatePayload = {};
    if (name?.trim()) updatePayload.name = name.trim();
    if (job?.trim()) updatePayload.job = job.trim();
    if (dob) updatePayload.dob = new Date(dob);
    if (bio?.trim()) updatePayload.bio = bio.trim();
    if (email?.trim()) updatePayload.email = encrypt(email.trim());
    if (ph?.trim()) updatePayload.ph = encrypt(ph.trim());
    if (loc?.trim()) updatePayload.loc = loc.trim();
    if (country?.trim()) updatePayload.country = country.trim();
    if (address?.trim()) updatePayload.address = address.trim();
    if (website?.trim()) updatePayload.website = website.trim();
    if (parsedEducation.some(e => e.college?.trim())) {
      updatePayload.education = parsedEducation;
    }
    if (parsedWorkExp.some(e => e.company?.trim())) {
      updatePayload.workExp = parsedWorkExp;
    }
    if (Object.keys(parsedSocials).length > 0) updatePayload.socials = [parsedSocials];
    if (parsedSkills.length > 0) updatePayload.skills = parsedSkills;

    if (req.files?.imageFile?.[0]) {
      updatePayload.avtr = `/uploads/images/${req.files.imageFile[0].filename}`;
    }
    if (req.files?.pdfFile?.[0]) {
      updatePayload.biodata = `/uploads/pdfs/${req.files.pdfFile[0].filename}`;
    }

    updatePayload.updtOn = new Date();
    updatePayload.updtBy = req.user.uname;

    const updatedUser = await User.findOneAndUpdate(
      { uId: req.params.id },
      updatePayload,
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 🔁 ALSO UPDATE ROLE in Lgn collection
    if (role?.trim()) {
      await Lgn.findOneAndUpdate(
        { lgn_uid: req.user.uid },
        {
          lgn_rol: role.trim(),
          updtOn: new Date(),
          updtBy: req.user.uname
        }
      );
    }

    res.status(200).json({ message: 'User updated successfully', user: updatedUser });
  } catch (err) {
    console.error('❌ updateUserById error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.softDeleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const userUpdate = {
      dltSts: 1,
      dltOn: new Date(),
      dltBy: req.user.uname,
      dltIp: req.ip
    };

    const loginUpdate = {
      dltSts: 1,
      dltOn: new Date(),
      dltBy: req.user.uname,
      dltIp: req.ip,
      // Invalidate password for safety (optional)
      lgn_usp: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10)
    };

    const deletedUser = await User.findOneAndUpdate(
      { uId: userId },
      userUpdate,
      { new: true }
    );

    const deletedLogin = await Lgn.findOneAndUpdate(
      { lgn_uid: userId },
      loginUpdate,
      { new: true }
    );

    if (!deletedUser || !deletedLogin) {
      return res.status(404).json({ message: 'User or login record not found' });
    }

    res.json({ message: 'User marked as deleted', user: deletedUser });
  } catch (err) {
    console.error('❌ Error in softDeleteUser:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAssignableUsers = async (req, res) => {
  try {
    const search = req.query.search || '';

    const users = await User.find({
      sts: 1,
      dltSts: { $ne: 1 },
      name: { $regex: search, $options: 'i' }
    }).sort({ name: 1 });

    const data = users.map(user => ({
      uId: user.uId,
      name: user.name
    }));

    res.json(data);
  } catch (err) {
    console.error('❌ Error fetching assignable users:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.logout = async (req, res) => {
  try {
    const uid = req.user.uid;
    const logoutTime = new Date();

    // 1. Update main Lgn table
    const updatedLgn = await Lgn.findOneAndUpdate(
      { lgn_uid: uid },
      {
        lgn_lot: logoutTime,
        updtOn: logoutTime,
        updtBy: uid,
        updtIp: req.ip
      },
      { new: true }
    );

    if (!updatedLgn) {
      return res.status(404).json({ message: 'Login session not found' });
    }

    // 2. Also update the latest LgnLog entry for this session
    const updatedLog = await LgnLog.findOneAndUpdate(
      { lgn_uid: uid, lgn_typ: 'nrml' }, // if using session ID, include that too
      { lgn_lot: logoutTime },
      { sort: { lgn_dt: -1 }, new: true }
    );

    res.json({ message: 'User logged out', logoutTime });
  } catch (err) {
    console.error('❌ Logout error:', err.message);
    res.status(500).json({ message: 'Server error during logout' });
  }
};

// Update user status
exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { sts } = req.body;
    const updaterId = req.user.uid;

    // Validate status (0, 1, or 2)
    if (![0, 1, 2].includes(sts)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    // Update User collection
    const updatedUser = await User.findOneAndUpdate(
      { uId: id },
      { 
        sts,
        updtOn: new Date(),
        updtBy: updaterId,
        updtIp: req.ip
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update corresponding Lgn record
    await Lgn.findOneAndUpdate(
      { lgn_uid: id },
      { 
        lgn_sts: sts,
        updtOn: new Date(),
        updtBy: updaterId,
        updtIp: req.ip
      }
    );

    res.json({ 
      success: true,
      message: 'Status updated successfully',
      newStatus: sts
    });

  } catch (err) {
    console.error('Status update failed:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update user status'
    });
  }
};