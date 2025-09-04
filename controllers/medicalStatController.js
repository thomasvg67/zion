const MedicalStat = require('../models/MedicalStat');

exports.getAllStats = async (req, res) => {
  try {
    const userId = req.user?.uid;
    const { page = 1, subCategory = '', search = '' } = req.query;
    const PAGE_SIZE = 25;
    const pageNum = Math.max(parseInt(page), 1);
    const skip = (pageNum - 1) * PAGE_SIZE;

    const query = { dltSts: false, crtdBy: userId };

    if (subCategory) query.subCategory = subCategory;
    if (search && search.length >= 3) {
      query.$or = [
        { hospital: { $regex: search, $options: 'i' } },
        { consultedBy: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await MedicalStat.countDocuments(query);
    const stats = await MedicalStat.find(query)
      .sort({ crtdOn: -1 })
      .skip(skip)
      .limit(PAGE_SIZE);

    res.json({
      stats,
      totalPages: Math.ceil(total / PAGE_SIZE),
      currentPage: pageNum
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
};


exports.addStat = async (req, res) => {
  try {
    const userId = req.user?.uid || 'system';
    const ip = req.ip;

    const stat = new MedicalStat({
      ...req.body,
      crtdBy: userId,
      crtdIp: ip,
    });

    await stat.save();
    res.json({ message: 'Medical Stat added successfully', stat });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add stat' });
  }
};

exports.editStat = async (req, res) => {
  try {
    const userId = req.user?.uid || 'system';
    const ip = req.ip;

    const updated = await MedicalStat.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          ...req.body,
          updtBy: userId,
          updtIp: ip,
          updtOn: new Date(),
        }
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: 'Stat not found' });

    res.json({ message: 'Medical Stat updated successfully', stat: updated });
  } catch (err) {
    res.status(500).json({ message: 'Update failed' });
  }
};

exports.deleteStat = async (req, res) => {
  try {
    const userId = req.user?.uid || 'system';
    const ip = req.ip;

    const deleted = await MedicalStat.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          dltSts: true,
          dltBy: userId,
          dltIp: ip,
          dltOn: new Date(),
        }
      },
      { new: true }
    );

    if (!deleted) return res.status(404).json({ message: 'Stat not found' });

    res.json({ message: 'Medical Stat soft-deleted successfully', stat: deleted });
  } catch (err) {
    res.status(500).json({ message: 'Deletion failed' });
  }
};

// GET /api/medical-stats/hospital-lookup?query=xyz
exports.lookupHospital = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) return res.json([]);

    // Find matching hospital names (case-insensitive, no dltSts)
    const matches = await MedicalStat.find({
      hospital: { $regex: query, $options: 'i' },
      dltSts: false
    })
      .sort({ crtdOn: -1 }) // newest first
      .limit(10);

    // Group by hospital name, only return distinct hospitals
    const uniqueMap = {};
    const suggestions = [];

    for (let record of matches) {
      if (!uniqueMap[record.hospital.toLowerCase()]) {
        uniqueMap[record.hospital.toLowerCase()] = true;
        suggestions.push({
          hospital: record.hospital,
          phone: record.phone || '',
          consultedBy: record.consultedBy || ''
        });
      }
    }

    res.json(suggestions);
  } catch (err) {
    console.error('Hospital lookup failed:', err);
    res.status(500).json({ message: 'Lookup failed' });
  }
};

exports.getChartData = async (req, res) => {
  try {
    const userId = req.user?.uid;

    const stats = await MedicalStat.find({
      crtdBy: userId,
      dltSts: false,
      checkedOn: { $exists: true }
    }).sort({ checkedOn: 1 });

    // Group by date
    const grouped = {};

    stats.forEach(stat => {
      const date = new Date(stat.checkedOn).toISOString().split('T')[0]; // YYYY-MM-DD
      const category = stat.subCategory.toLowerCase(); // sugar, pressure, weight
      const value = parseFloat(stat.measures);

      if (!grouped[date]) {
        grouped[date] = { date };
      }
      grouped[date][category] = value;
    });

    const result = Object.values(grouped); // convert to array

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Chart data fetch failed' });
  }
};
