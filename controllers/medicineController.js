const Medicine = require('../models/Medicine');

exports.getAllMedicines = async (req, res) => {
  try {
    const { page = 1, category = '', search = '' } = req.query;
    const PAGE_SIZE = 25;
    const skip = (page - 1) * PAGE_SIZE;

    const query = { dltSts: false };
    if (category) query.medicine = category;
    if (search && search.length >= 3) {
      query.$or = [
        { medicine: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { source: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Medicine.countDocuments(query);
    const data = await Medicine.find(query)
      .sort({ crtdOn: -1 })
      .skip(skip)
      .limit(PAGE_SIZE);

    res.json({ medicine: data, totalPages: Math.ceil(total / PAGE_SIZE), currentPage: +page });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch medicines' });
  }
};

exports.addMedicine = async (req, res) => {
  try {
    const userId = req.user?.uid || 'system';
    const ip = req.ip;

    const newMedicine = new Medicine({
      medicine: req.body.medicine,
      name: req.body.name,
      description: req.body.description || '',
      source: req.body.source || '',
      sts: req.body.sts ?? true,
      crtdBy: userId,
      crtdIp: ip,
    });

    await newMedicine.save();
    res.json({ message: 'Medicine added successfully', medicine: newMedicine });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add medicine' });
  }
};

exports.editMedicine = async (req, res) => {
  try {
    const userId = req.user?.uid || 'system';
    const ip = req.ip;

    const updated = await Medicine.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          medicine: req.body.medicine,
          name: req.body.name,
          description: req.body.description,
          source: req.body.source,
          sts: req.body.sts,
          updtBy: userId,
          updtIp: ip,
          updtOn: new Date(),
        },
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: 'Medicine not found' });

    res.json({ message: 'Medicine updated successfully', medicine: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Update failed' });
  }
};

exports.deleteMedicine = async (req, res) => {
  try {
    const userId = req.user?.uid || 'system';
    const ip = req.ip;

    const deleted = await Medicine.findByIdAndUpdate(
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

    if (!deleted) return res.status(404).json({ message: 'Medicine not found' });

    res.json({ message: 'Medicine soft-deleted successfully', medicine: deleted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Deletion failed' });
  }
};

exports.bulkDeleteMedicines = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No medicine IDs provided' });
    }

    const userId = req.user?.uid || 'system';
    const ip = req.ip;

    const result = await Medicine.updateMany(
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

    res.json({ message: `${result.modifiedCount} medicine(s) soft-deleted successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Bulk deletion failed' });
  }
};
