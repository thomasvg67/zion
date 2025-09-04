const CalendarEvent = require('../models/CalendarEvent');

exports.getAllEvents = async (req, res) => {
  try {
const userId = req.user?.uid || 'system';
const events = await CalendarEvent.find({ dltSts: false, crtdBy: userId }).sort({ start: 1 });
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch events' });
  }
};

exports.addEvent = async (req, res) => {
  try {
    const userId = req.user?.uid || 'system';
    const ip = req.ip;
const { title, start, end } = req.body;

if (!title || !start || !end) {
  return res.status(400).json({ message: 'Title, Start, and End are required' });
}

if (isNaN(Date.parse(start)) || isNaN(Date.parse(end))) {
  return res.status(400).json({ message: 'Invalid date format' });
}

if (new Date(start) >= new Date(end)) {
  return res.status(400).json({ message: 'Start date must be before end date' });
}


    const newEvent = new CalendarEvent({
      title: req.body.title,
      description: req.body.description || '',
       category: req.body.category ,
      start: req.body.start,
      end: req.body.end,
      badge: req.body.badge,
      sts: req.body.sts ?? true,
      crtdBy: userId,
      crtdIp: ip,
    });

    await newEvent.save();
    res.json({ message: 'Event added successfully', event: newEvent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add event' });
  }
};

exports.editEvent = async (req, res) => {
  try {
    const userId = req.user?.uid || 'system';
    const ip = req.ip;
const { title, start, end } = req.body;

if (!title || !start || !end) {
  return res.status(400).json({ message: 'Title, Start, and End are required' });
}

if (isNaN(Date.parse(start)) || isNaN(Date.parse(end))) {
  return res.status(400).json({ message: 'Invalid date format' });
}

if (new Date(start) >= new Date(end)) {
  return res.status(400).json({ message: 'Start date must be before end date' });
}


    const updated = await CalendarEvent.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          title: req.body.title,
          description: req.body.description,
           category: req.body.category,
          start: req.body.start,
          end: req.body.end,
          badge: req.body.badge,
          sts: req.body.sts,
          updtBy: userId,
          updtIp: ip,
          updtOn: new Date(),
        },
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: 'Event not found' });

    res.json({ message: 'Event updated successfully', event: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Update failed' });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const userId = req.user?.uid || 'system';
    const ip = req.ip;

    const deleted = await CalendarEvent.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          dltSts: true,
          dltBy: userId,
          dltIp: ip,
          dltOn: new Date(),
        },
      },
      { new: true }
    );

    if (!deleted) return res.status(404).json({ message: 'Event not found' });

    res.json({ message: 'Event soft-deleted successfully', event: deleted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Deletion failed' });
  }
};
