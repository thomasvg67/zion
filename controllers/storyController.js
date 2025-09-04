const Story = require('../models/Story');

exports.getAllStories = async (req, res) => {
    try {
        const { page = 1, category = '', search = '' } = req.query;
        const PAGE_SIZE = 25;
        const skip = (page - 1) * PAGE_SIZE;

        const query = { dltSts: false };

        if (category) query.subCategory = category;
        if (search && search.length >= 3) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { subCategory: { $regex: search, $options: 'i' } }
            ];
        }

        const total = await Story.countDocuments(query);
        const stories = await Story.find(query)
            .sort({ crtdOn: -1 })
            .skip(skip)
            .limit(PAGE_SIZE);

        res.json({ stories, totalPages: Math.ceil(total / PAGE_SIZE), currentPage: +page });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch stories' });
    }
};

exports.addStory = async (req, res) => {
    try {
        const userId = req.user?.uid || 'system';
        const ip = req.ip;

        const newStory = new Story({
            subCategory: req.body.subCategory,
            title: req.body.title,
            description: req.body.description || '',
            sts: req.body.sts ?? true,
            crtdBy: userId,
            crtdIp: ip,
        });

        await newStory.save();
        res.json({ message: 'Story added successfully', story: newStory });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to add story' });
    }
};

exports.editStory = async (req, res) => {
    try {
        const userId = req.user?.uid || 'system';
        const ip = req.ip;

        const updated = await Story.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    subCategory: req.body.subCategory,
                    title: req.body.title,
                    description: req.body.description,
                    sts: req.body.sts,
                    updtBy: userId,
                    updtIp: ip,
                    updtOn: new Date(),
                },
            },
            { new: true }
        );

        if (!updated) return res.status(404).json({ message: 'Story not found' });

        res.json({ message: 'Story updated successfully', story: updated });
    } catch (err) {
        res.status(500).json({ message: 'Update failed' });
    }
};

exports.deleteStory = async (req, res) => {
    try {
        const userId = req.user?.uid || 'system';
        const ip = req.ip;

        const deleted = await Story.findByIdAndUpdate(
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

        if (!deleted) return res.status(404).json({ message: 'Story not found' });

        res.json({ message: 'Story soft-deleted successfully', story: deleted });
    } catch (err) {
        res.status(500).json({ message: 'Deletion failed' });
    }
};

exports.bulkDeleteStories = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No story IDs provided' });
    }

    const userId = req.user?.uid || 'system';
    const ip = req.ip;

    const result = await Story.updateMany(
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

    res.json({ message: `${result.modifiedCount} story(ies) soft-deleted successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Bulk deletion failed' });
  }
};
