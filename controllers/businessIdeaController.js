const BusinessIdea = require('../models/BusinessIdea');

exports.getAllBusinesses = async (req, res) => {
    try {
        const businesses = await BusinessIdea.find({ dltSts: false })
            .sort({ crtdOn: -1 })
            .lean();

        businesses.forEach(business => {
            business.ideas = (business.ideas || []).filter(idea => !idea.dltSts);
        });

        res.json(businesses);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch businesses' });
    }
};


exports.addBusiness = async (req, res) => {
    try {
        const userId = req.user?.uid || 'system';
        const ip = req.ip;

        const newBusiness = new BusinessIdea({
            name: req.body.name,
            crtdBy: userId,
            crtdIp: ip
        });

        await newBusiness.save();
        res.json({ message: 'Business added', business: newBusiness });
    } catch (err) {
        res.status(500).json({ message: 'Failed to add business' });
    }
};

exports.editBusiness = async (req, res) => {
    try {
        const userId = req.user?.uid || 'system';
        const ip = req.ip;

        const updated = await BusinessIdea.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    name: req.body.name,
                    updtBy: userId,
                    updtIp: ip,
                    updtOn: new Date()
                }
            },
            { new: true }
        );

        if (!updated) return res.status(404).json({ message: 'Business not found' });

        res.json({ message: 'Business updated', business: updated });
    } catch (err) {
        res.status(500).json({ message: 'Update failed' });
    }
};

exports.deleteBusiness = async (req, res) => {
    try {
        const userId = req.user?.uid || 'system';
        const ip = req.ip;

        const deleted = await BusinessIdea.findByIdAndUpdate(
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

        if (!deleted) return res.status(404).json({ message: 'Business not found' });

        res.json({ message: 'Business soft-deleted', business: deleted });
    } catch (err) {
        res.status(500).json({ message: 'Delete failed' });
    }
};

exports.addIdea = async (req, res) => {
    try {
        const userId = req.user?.uid || 'system';
        const ip = req.ip;

        const business = await BusinessIdea.findById(req.params.id);
        if (!business) return res.status(404).json({ message: 'Business not found' });

        business.ideas.push({
            title: req.body.title,
            description: req.body.description,
            crtdBy: userId,
            crtdIp: ip
        });

        await business.save();
        res.json({ message: 'Idea added', business });
    } catch (err) {
        res.status(500).json({ message: 'Failed to add idea' });
    }
};

exports.editIdea = async (req, res) => {
    try {
        const userId = req.user?.uid || 'system';
        const ip = req.ip;

        const business = await BusinessIdea.findById(req.params.id);
        if (!business) return res.status(404).json({ message: 'Business not found' });

        const idea = business.ideas.id(req.params.ideaId);
        if (!idea) return res.status(404).json({ message: 'Idea not found' });

        idea.title = req.body.title;
        idea.description = req.body.description;
        idea.updtBy = userId;
        idea.updtIp = ip;
        idea.updtOn = new Date();

        await business.save();
        res.json({ message: 'Idea updated', business });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update idea' });
    }
};

exports.deleteIdea = async (req, res) => {
    try {
        const userId = req.user?.uid || 'system';
        const ip = req.ip;

        const business = await BusinessIdea.findById(req.params.id);
        if (!business) return res.status(404).json({ message: 'Business not found' });

        const idea = business.ideas.id(req.params.ideaId);
        if (!idea) return res.status(404).json({ message: 'Idea not found' });

        idea.dltSts = true;
        idea.dltBy = userId;
        idea.dltIp = ip;
        idea.dltOn = new Date();

        await business.save();
        res.json({ message: 'Idea deleted', business });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete idea' });
    }
};

exports.clearIdeas = async (req, res) => {
    try {
        const business = await BusinessIdea.findById(req.params.id);
        if (!business) return res.status(404).json({ message: 'Business not found' });

        business.ideas = [];
        await business.save();

        res.json({ message: 'All ideas cleared', business });
    } catch (err) {
        res.status(500).json({ message: 'Failed to clear ideas' });
    }
};
