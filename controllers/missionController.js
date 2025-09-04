const Mission = require('../models/Mission');

exports.getAllMissions = async (req, res) => {
    try {
        const missions = await Mission.find({ dltSts: false }).sort({ crtdOn: -1 }).lean();
        missions.forEach(m => {
            m.visions = (m.visions || []).filter(v => !v.dltSts);
        });
        res.json(missions);
    } catch {
        res.status(500).json({ message: 'Failed to fetch missions' });
    }
};

exports.addMission = async (req, res) => {
    try {
        const userId = req.user?.uid || 'system';
        const ip = req.ip;

        const mission = new Mission({
            name: req.body.name,
            crtdBy: userId,
            crtdIp: ip
        });

        await mission.save();
        res.json({ message: 'Mission added', mission });
    } catch {
        res.status(500).json({ message: 'Failed to add mission' });
    }
};

exports.editMission = async (req, res) => {
    try {
        const userId = req.user?.uid || 'system';
        const ip = req.ip;

        const updated = await Mission.findByIdAndUpdate(req.params.id, {
            $set: {
                name: req.body.name,
                updtBy: userId,
                updtIp: ip,
                updtOn: new Date()
            }
        }, { new: true });

        if (!updated) return res.status(404).json({ message: 'Mission not found' });
        res.json({ message: 'Mission updated', mission: updated });
    } catch {
        res.status(500).json({ message: 'Failed to update mission' });
    }
};

exports.deleteMission = async (req, res) => {
    try {
        const userId = req.user?.uid || 'system';
        const ip = req.ip;

        const deleted = await Mission.findByIdAndUpdate(req.params.id, {
            $set: {
                dltSts: true,
                dltBy: userId,
                dltIp: ip,
                dltOn: new Date()
            }
        }, { new: true });

        if (!deleted) return res.status(404).json({ message: 'Mission not found' });
        res.json({ message: 'Mission deleted', mission: deleted });
    } catch {
        res.status(500).json({ message: 'Failed to delete mission' });
    }
};

exports.addVision = async (req, res) => {
    try {
        const userId = req.user?.uid || 'system';
        const ip = req.ip;

        const mission = await Mission.findById(req.params.id);
        if (!mission) return res.status(404).json({ message: 'Mission not found' });

        mission.visions.push({
            title: req.body.title,
            description: req.body.description,
            crtdBy: userId,
            crtdIp: ip
        });

        await mission.save();
        res.json({ message: 'Vision added', mission });
    } catch {
        res.status(500).json({ message: 'Failed to add vision' });
    }
};

exports.editVision = async (req, res) => {
    try {
        const userId = req.user?.uid || 'system';
        const ip = req.ip;

        const mission = await Mission.findById(req.params.id);
        if (!mission) return res.status(404).json({ message: 'Mission not found' });

        const vision = mission.visions.id(req.params.visionId);
        if (!vision) return res.status(404).json({ message: 'Vision not found' });

        vision.title = req.body.title;
        vision.description = req.body.description;
        vision.updtBy = userId;
        vision.updtIp = ip;
        vision.updtOn = new Date();

        await mission.save();
        res.json({ message: 'Vision updated', mission });
    } catch {
        res.status(500).json({ message: 'Failed to update vision' });
    }
};

exports.deleteVision = async (req, res) => {
    try {
        const userId = req.user?.uid || 'system';
        const ip = req.ip;

        const mission = await Mission.findById(req.params.id);
        if (!mission) return res.status(404).json({ message: 'Mission not found' });

        const vision = mission.visions.id(req.params.visionId);
        if (!vision) return res.status(404).json({ message: 'Vision not found' });

        vision.dltSts = true;
        vision.dltBy = userId;
        vision.dltIp = ip;
        vision.dltOn = new Date();

        await mission.save();
        res.json({ message: 'Vision deleted', mission });
    } catch {
        res.status(500).json({ message: 'Failed to delete vision' });
    }
};

exports.clearVisions = async (req, res) => {
    try {
        const mission = await Mission.findById(req.params.id);
        if (!mission) return res.status(404).json({ message: 'Mission not found' });

        mission.visions = [];
        await mission.save();

        res.json({ message: 'All visions cleared', mission });
    } catch {
        res.status(500).json({ message: 'Failed to clear visions' });
    }
};
