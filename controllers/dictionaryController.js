const Dictionary = require('../models/Dictionary');

exports.getAllWords = async (req, res) => {
  try {
    const { page = 1, category = '', search = '' } = req.query;
    const PAGE_SIZE = 25;
    const skip = (page - 1) * PAGE_SIZE;

    const query = {
      dltSts: false,
    };

    if (category) query.language = category;
    if (search && search.length >= 3) {
      query.$or = [
        { words: { $regex: search, $options: 'i' } },
        { language: { $regex: search, $options: 'i' } },
        { source: { $regex: search, $options: 'i' } },
        { meaning: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Dictionary.countDocuments(query);
    const words = await Dictionary.find(query)
      .sort({ crtdOn: -1 })
      .skip(skip)
      .limit(PAGE_SIZE);

    res.json({ words, totalPages: Math.ceil(total / PAGE_SIZE), currentPage: +page });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch dictionary entries' });
  }
};

exports.addWord = async (req, res) => {
  try {
    const userId = req.user?.uid || 'system';
    const ip = req.ip;

    const newEntry = new Dictionary({
      language: req.body.language,
      words: req.body.words,
      source: req.body.source || '',
      meaning: req.body.meaning || '',
      noOfAlerts: req.body.noOfAlerts || 0,
      startFrom: req.body.startFrom || null,
      sts: req.body.sts ?? true,
      crtdBy: userId,
      crtdIp: ip,
    });

    await newEntry.save();
    res.json({ message: 'Word added successfully', words: newEntry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add word' });
  }
};

exports.editWord = async (req, res) => {
  try {
    const userId = req.user?.uid || 'system';
    const ip = req.ip;

    const updated = await Dictionary.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          language: req.body.language,
          words: req.body.words,
          source: req.body.source,
          meaning: req.body.meaning,
          noOfAlerts: req.body.noOfAlerts,
          startFrom: req.body.startFrom,
          sts: req.body.sts,
          updtBy: userId,
          updtIp: ip,
          updtOn: new Date(),
        },
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: 'Word not found' });

    res.json({ message: 'Word updated successfully', words: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Update failed' });
  }
};

exports.deleteWord = async (req, res) => {
  try {
    const userId = req.user?.uid || 'system';
    const ip = req.ip;

    const deleted = await Dictionary.findByIdAndUpdate(
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

    if (!deleted) return res.status(404).json({ message: 'Word not found' });

    res.json({ message: 'Word soft-deleted successfully', words: deleted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Deletion failed' });
  }
};

exports.bulkDeleteWords = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No word IDs provided' });
    }

    const userId = req.user?.uid || 'system';
    const ip = req.ip;

    const result = await Dictionary.updateMany(
      { _id: { $in: ids }, dltSts: false },
      {
        $set: {
          dltSts: true,
          dltBy: userId,
          dltIp: ip,
          dltOn: new Date(),
        },
      }
    );

    res.json({ message: `${result.modifiedCount} word(s) soft-deleted successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Bulk deletion failed' });
  }
};
