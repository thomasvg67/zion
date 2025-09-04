const Email = require('../models/Email');
const User = require('../models/User');
const transporter = require('../middleware/mailer');
const fs = require('fs');
const { encrypt, decrypt } = require('../routes/encrypt');


exports.getEmails = async (req, res) => {
  try {
    const {
      page = 1,
      search = '',
      category = 'inbox',
      email: userEmail
    } = req.query;

    if (!userEmail) {
      return res.status(400).json({ message: 'Missing email for filtering' });
    }

    const PAGE_SIZE = 25;
    const skip = (page - 1) * PAGE_SIZE;

    // Normalize category
    const normalizedCategory = ['inbox', 'sent', 'drafts', 'spam', 'important', 'trash'].includes(category.toLowerCase())
      ? category.toLowerCase()
      : 'inbox';

    const query = {};

    if (['drafts', 'sent'].includes(normalizedCategory)) {
      query.from = userEmail;
    } else if (['spam', 'trash', 'important'].includes(normalizedCategory)) {
      query.$or = [
        { to: { $in: [userEmail] } },
        // { cc: { $in: [userEmail] } },
        { from: userEmail }
      ];
    } else {
      query.$or = [
        { to: { $in: [userEmail] } },
        // { cc: { $in: [userEmail] } }
      ];
    }

    if (normalizedCategory !== 'inbox') {
      query.category = normalizedCategory;
    }

    if (search && search.length >= 3) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { from: { $regex: search, $options: 'i' } },
          { to: { $regex: search, $options: 'i' } },
          { subject: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } }
        ]
      });
    }

    const total = await Email.countDocuments(query);
    const data = await Email.find(query)
      .sort({ crtdOn: -1 })
      .skip(skip)
      .limit(PAGE_SIZE);

    const unreadCount = await Email.countDocuments({
      ...query,
      read: false
    });

    res.json({
      emails: data,
      totalPages: Math.ceil(total / PAGE_SIZE),
      currentPage: +page,
      unreadCount
    });

  } catch (err) {
    console.error('getEmails error:', err);
    res.status(500).json({ message: 'Failed to fetch emails' });
  }
};

exports.sendEmail = async (req, res) => {
  try {
    const {
      to,
      cc = '',
      subject,
      content,
      crtdBy,
      crtdIp
    } = req.body;

    const from = req.user?.uname;
    // const from = "thomas@zoomlabs.in"
    if (!from) return res.status(401).json({ error: 'User not authenticated' });

    // Validate required fields
    if (!to || !subject || !content) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: {
          to: !to ? 'To field is required' : undefined,
          subject: !subject ? 'Subject is required' : undefined,
          content: !content ? 'Content is required' : undefined
        }
      });
    }

    // Parse and validate emails
    const toList = to.split(',').map(email => email.trim()).filter(Boolean);
    const ccList = cc ? cc.split(',').map(e => e.trim()).filter(Boolean) : [];
    const allEmails = Array.from(new Set([...toList, ...ccList]));

    const invalidEmails = allEmails.filter(email => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    if (invalidEmails.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid email addresses in To/CC', 
        invalidEmails 
      });
    }

    const attachments = req.files?.map(file => ({
      filename: file.originalname,
      path: file.path,
      size: file.size,
      contentType: file.mimetype
    })) || [];

    // Save sender's copy
    const sentEmail = new Email({
      from,
      to: toList,
      cc: ccList,
      subject,
      content,
      attachments,
      category: 'sent',
      crtdBy,
      crtdIp,
    });
    await sentEmail.save();

    // Save receiver inbox copies
    const uniqueInboxRecipients = new Set([...toList, ...ccList]);
    const inboxEmails = [...uniqueInboxRecipients].map(recipient => ({
      from,
      to: [recipient],
      cc: ccList.filter(c => c !== recipient),
      subject,
      content,
      attachments,
      category: 'inbox',
      crtdBy,
      crtdIp,
    }));
    await Email.insertMany(inboxEmails);
console.log("Sending email via SMTP to:", toList, "CC:", ccList);
    // Send via email transporter
  const result =   await transporter.sendMail({
      from,
      to: toList,
      cc: ccList,
      subject,
      html: content,
      attachments: attachments.map(att => ({
        filename: att.filename,
        path: att.path,
        contentType: att.contentType
      }))
    });
    console.log("SMTP result:", result);

    res.status(200).json({ 
      success: true,
      message: 'Email sent successfully.',
      email: sentEmail
    });

  } catch (err) {
    console.error('sendEmail error:', err);
    
    // Clean up uploaded files if error occurred
    if (req.files) {
      req.files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (cleanupErr) {
          console.error('Failed to clean up file:', cleanupErr);
        }
      });
    }

    res.status(500).json({ 
      error: 'Failed to send email',
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

exports.saveDraft = async (req, res) => {
  try {
    const userId = req.user?.uid || 'system';
    const ip = req.ip;
    const { from, to = '', cc = '', subject = '', content = '' } = req.body;

    // Validate at least one field is filled
    if (!to.trim() && !subject.trim() && !content.trim()) {
      return res.status(400).json({ 
        error: 'At least one field (To, Subject, or Content) must be filled to save as draft' 
      });
    }

    const draftData = {
      from,
      to: to.split(',').map(email => email.trim()).filter(Boolean),
      cc: cc.split(',').map(email => email.trim()).filter(Boolean),
      subject,
      content,
      category: 'drafts',
      crtdBy: userId,
      crtdIp: ip
    };

    // Process attachments if they exist
    if (req.files && req.files.length > 0) {
      draftData.attachments = req.files.map(file => ({
        filename: file.originalname,
        path: file.path,
        size: file.size,
        contentType: file.mimetype
      }));
    }

    // If editing an existing draft
    if (req.params.id) {
      const updatedDraft = await Email.findByIdAndUpdate(
        req.params.id,
        draftData,
        { new: true }
      );
      
      return res.status(200).json({
        success: true,
        message: 'Draft updated successfully',
        email: updatedDraft
      });
    }

    // Creating a new draft
    const newDraft = new Email(draftData);
    await newDraft.save();

    res.status(201).json({
      success: true,
      message: 'Draft saved successfully',
      email: newDraft
    });

  } catch (err) {
    console.error('saveDraft error:', err);
    
    // Clean up uploaded files if error occurred
    if (req.files) {
      req.files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (cleanupErr) {
          console.error('Failed to clean up file:', cleanupErr);
        }
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to save draft',
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

exports.updateEmail = async (req, res) => {
  try {
    const userId = req.user?.uid || 'system';
    const ip = req.ip;

    const updated = await Email.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          ...req.body,
          updtBy: userId,
          updtIp: ip,
          updtOn: new Date()
        }
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: 'Email not found' });
    res.json({ message: 'Email updated successfully', email: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Update failed' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const { read } = req.body;
    const userEmail = req.user?.uname;

    if (!userEmail) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (typeof read !== 'boolean') {
      return res.status(400).json({ message: 'Invalid read state' });
    }

    // console.log('Marking read:', { id, read, userEmail });

    const email = await Email.findOneAndUpdate(
      {
        _id: id,
        $or: [
          { to: userEmail },
          { cc: userEmail },
          { from: userEmail }
        ]
      },
      { read: read },
      { new: true }
    );

    if (!email) {
      console.warn('Email not found. Conditions failed.');
      return res.status(404).json({ message: 'Email not found or not authorized' });
    }

    res.json({
      success: true,
      message: `Email marked as ${read ? 'read' : 'unread'}`,
      email
    });

  } catch (err) {
    console.error('Mark read/unread error:', err);
    res.status(500).json({ message: 'Failed to update read status' });
  }
};


exports.deleteEmail = async (req, res) => {
  try {
    const userId = req.user?.uid || 'system';
    const ip = req.ip;

    const deleted = await Email.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          dltSts: true,
          dltBy: userId,
          dltIp: ip,
          dltOn: new Date()
        }
      },
      { new: true }
    );

    if (!deleted) return res.status(404).json({ message: 'Email not found' });
    res.json({ message: 'Email moved to trash', email: deleted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Deletion failed' });
  }
};

exports.bulkAction = async (req, res) => {
  try {
    const { ids, action } = req.body;
    const userId = req.user?.uid || 'system';
    const ip = req.ip;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No email IDs provided' });
    }

    let update = {};
    switch (action) {
      case 'delete':
        update = {
          dltSts: true,
          dltBy: userId,
          dltIp: ip,
          dltOn: new Date()
        };
        break;
      case 'markAsRead':
        update = { read: true };
        break;
      case 'markAsUnread':
        update = { read: false };
        break;
      case 'moveToInbox':
        update = { category: 'inbox' };
        break;
      case 'moveToSpam':
        update = { category: 'spam' };
        break;
      case 'star':
        update = { starred: true };
        break;
      case 'unstar':
        update = { starred: false };
        break;
      default:
        return res.status(400).json({ message: 'Invalid action' });
    }

    update.updtBy = userId;
    update.updtIp = ip;
    update.updtOn = new Date();

    const result = await Email.updateMany(
      { _id: { $in: ids } },
      { $set: update }
    );

    res.json({
      message: `${result.modifiedCount} email(s) ${action} successfully`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Bulk operation failed' });
  }
};

exports.sendDraftEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      to,
      cc = '',
      subject,
      content,
    } = req.body;

    const from = req.user?.uname;
    const attachments = req.files?.map(file => ({
      filename: file.originalname,
      path: file.path,
      size: file.size,
      contentType: file.mimetype
    })) || [];

    // Validate emails
    const toList = to.split(',').map(e => e.trim());
    const ccList = cc ? cc.split(',').map(e => e.trim()) : [];
    const allRecipients = [...toList, ...ccList];

    const invalidEmails = allRecipients.filter(email => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    if (invalidEmails.length > 0) {
      return res.status(400).json({ error: 'Invalid email(s)', invalidEmails });
    }

    // Update draft → sent
    const updatedEmail = await Email.findByIdAndUpdate(id, {
      $set: {
        from,
        to: toList,
        cc: ccList,
        subject,
        content,
        attachments,
        category: 'sent',
        updtOn: new Date()
      }
    }, { new: true });

    if (!updatedEmail) return res.status(404).json({ message: 'Draft not found' });

    // Send to recipients' inbox
    const uniqueInboxRecipients = new Set([...toList, ...ccList]);
    const inboxEmails = [...uniqueInboxRecipients].map(recipient => ({
      from,
      to: [recipient],
      cc: ccList.filter(c => c !== recipient),
      subject,
      content,
      attachments,
      category: 'inbox',
      crtdBy: req.user?.uid,
      crtdIp: req.ip,
    }));
    await Email.insertMany(inboxEmails);

    // Send via email transporter
    await transporter.sendMail({
      from,
      to: toList,
      cc: ccList,
      subject,
      html: content,
      attachments: attachments.map(att => ({
        filename: att.filename,
        path: att.path,
        contentType: att.contentType
      }))
    });

    res.json({ message: 'Draft sent successfully.' });

  } catch (err) {
    console.error('sendDraftEmail error:', err);
    res.status(500).json({ error: 'Failed to send draft email' });
  }
};

exports.getEmailSuggestions = async (req, res) => {
  try {
    const search = req.query.search || '';
  console.log(`📩 Suggestion query received: "${search}"`);
 const users = await User.find({
  sts: 1,
  dltSts: { $ne: 1 }
});

const matchedUsers = users.filter(user => {
  const email = decrypt(user.email);
  return email.toLowerCase().includes(search.toLowerCase());
});

const data = matchedUsers.map(user => ({
  uId: user.uId,
  name: user.name,
  email: decrypt(user.email)
})).sort((a, b) => a.email.localeCompare(b.email));

console.log(data)
    res.json(data);
  } catch (err) {
    console.error('❌ Error fetching email suggestions:', err);
    res.status(500).json({ message: 'Server error' });
  }
};