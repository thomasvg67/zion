// nameController.js
const Name = require('../models/Name');

exports.getAllNames = async (req, res) => {
  try {
    const { page = 1, category = '', search = '' } = req.query;
    const PAGE_SIZE = 25;
    const skip = (page - 1) * PAGE_SIZE;

    const query = {
      dltSts: false,
    };

    if (category) query.subCategory = category;
    if (search && search.length >= 3) query.name = { $regex: search, $options: 'i' };

    const total = await Name.countDocuments(query);
    const names = await Name.find(query)
      .sort({ crtdOn: -1 })
      .skip(skip)
      .limit(PAGE_SIZE);

    res.json({ names, totalPages: Math.ceil(total / PAGE_SIZE), currentPage: +page });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch names' });
  }
};

exports.addName = async (req, res) => {
  try {
    const userId = req.user?.uid || 'system';
    const ip = req.ip;

    const newName = new Name({
      subCategory: req.body.subCategory,
      name: req.body.name,
      source: req.body.source || '',
      meaning: req.body.meaning || '',
      sts: req.body.sts ?? true,
      crtdBy: userId,
      crtdIp: ip,
    });

    await newName.save();
    res.json({ message: 'Name added successfully', name: newName });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add name' });
  }
};

exports.editName = async (req, res) => {
  try {
    const userId = req.user?.uid || 'system';
    const ip = req.ip;

    const updated = await Name.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          subCategory: req.body.subCategory,
          name: req.body.name,
          source: req.body.source,
          meaning: req.body.meaning,
          sts: req.body.sts,
          updtBy: userId,
          updtIp: ip,
          updtOn: new Date(),
        },
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: 'Name not found' });

    res.json({ message: 'Name updated successfully', name: updated });
  } catch (err) {
    res.status(500).json({ message: 'Update failed' });
  }
};

exports.deleteName = async (req, res) => {
  try {
    const userId = req.user?.uid || 'system';
    const ip = req.ip;

    const deleted = await Name.findByIdAndUpdate(
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

    if (!deleted) return res.status(404).json({ message: 'Name not found' });

    res.json({ message: 'Name soft-deleted successfully', name: deleted });
  } catch (err) {
    res.status(500).json({ message: 'Deletion failed' });
  }
};

exports.bulkDeleteNames = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No name IDs provided' });
    }

    const userId = req.user?.uid || 'system';
    const ip = req.ip;

    const result = await Name.updateMany(
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

    res.json({ message: `${result.modifiedCount} name(s) soft-deleted successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Bulk deletion failed' });
  }
};
