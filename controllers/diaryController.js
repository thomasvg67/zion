const Diary = require('../models/Diary');

exports.getAllDiary = async (req, res) => {
  try {
    const { page = 1, search = '' } = req.query;
    const PAGE_SIZE = 25;
    const skip = (page - 1) * PAGE_SIZE;

    const query = { dltSts: false };
    if (search && search.length >= 3) {
      query.$or = [
        { date: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Diary.countDocuments(query);
    const data = await Diary.find(query)
      .sort({ crtdOn: -1 })
      .skip(skip)
      .limit(PAGE_SIZE);

    res.json({ diary: data, totalPages: Math.ceil(total / PAGE_SIZE), currentPage: +page });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch diary entries' });
  }
};

exports.addDiary = async (req, res) => {
  try {
    const userId = req.user?.uid || 'system';
    const ip = req.ip;

    const newDiary = new Diary({
      date: req.body.date,
      message: req.body.message,
      sts: req.body.sts ?? true,
      crtdBy: userId,
      crtdIp: ip,
    });

    await newDiary.save();
    res.json({ message: 'Diary entry added successfully', diary: newDiary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add diary entry' });
  }
};

exports.editDiary = async (req, res) => {
  try {
    const userId = req.user?.uid || 'system';
    const ip = req.ip;

    const updated = await Diary.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          date: req.body.date,
          message: req.body.message,
          sts: req.body.sts,
          updtBy: userId,
          updtIp: ip,
          updtOn: new Date(),
        },
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: 'Diary not found' });

    res.json({ message: 'Diary updated successfully', diary: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Update failed' });
  }
};

exports.deleteDiary = async (req, res) => {
  try {
    const userId = req.user?.uid || 'system';
    const ip = req.ip;

    const deleted = await Diary.findByIdAndUpdate(
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

    if (!deleted) return res.status(404).json({ message: 'Diary not found' });

    res.json({ message: 'Diary soft-deleted successfully', diary: deleted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Deletion failed' });
  }
};

exports.bulkDeleteDiary = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No diary IDs provided' });
    }

    const userId = req.user?.uid || 'system';
    const ip = req.ip;

    const result = await Diary.updateMany(
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

    res.json({ message: `${result.modifiedCount} diary entry(ies) soft-deleted successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Bulk deletion failed' });
  }
};
