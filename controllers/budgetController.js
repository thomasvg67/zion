const Budget = require('../models/Budget');

exports.getAll = async (req, res) => {
  try {
    const { page = 1, search = '', category } = req.query;
    const PAGE_SIZE = 25;
    const skip = (page - 1) * PAGE_SIZE;

    const query = { dltSts: false };

    // Add category filter
    if (category) {
      query.type = category;
    }

    // Add search filter if needed
    if (search && search.length >= 3) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Budget.countDocuments(query);
    const data = await Budget.find(query).sort({ crtdOn: -1 }).skip(skip).limit(PAGE_SIZE);

    res.json({ data, totalPages: Math.ceil(total / PAGE_SIZE), currentPage: +page });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch data' });
  }
};

exports.add = async (req, res) => {
  try {
    const userId = req.user?.uid || 'system';
    const ip = req.ip;

    const newBudget = new Budget({
      ...req.body,
      crtdBy: userId,
      crtdIp: ip,
    });

    await newBudget.save();
    res.json({ message: 'Budget added successfully', data: newBudget });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add Budget' });
  }
};

exports.edit = async (req, res) => {
  try {
    const userId = req.user?.uid || 'system';
    const ip = req.ip;

    const updated = await Budget.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          ...req.body,
          updtBy: userId,
          updtIp: ip,
          updtOn: new Date(),
        },
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: 'Budget not found' });

    res.json({ message: 'Budget updated successfully', data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Update failed' });
  }
};

exports.delete = async (req, res) => {
  try {
    const userId = req.user?.uid || 'system';
    const ip = req.ip;

    const deleted = await Budget.findByIdAndUpdate(
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

    if (!deleted) return res.status(404).json({ message: 'Budget not found' });

    res.json({ message: 'Budget soft-deleted successfully', data: deleted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Deletion failed' });
  }
};

exports.bulkDelete = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No IDs provided' });
    }

    const userId = req.user?.uid || 'system';
    const ip = req.ip;

    const result = await Budget.updateMany(
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

    res.json({ message: `${result.modifiedCount} budget(s) soft-deleted successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Bulk deletion failed' });
  }
};