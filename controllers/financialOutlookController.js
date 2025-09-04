const FinancialOutlook = require('../models/FinancialOutlook');

// Get all financial outlook categories with their outcomes
exports.getAllFinancialOutlooks = async (req, res) => {
    try {
        const outlooks = await FinancialOutlook.find({ dltSts: false })
            .sort({ crtdOn: -1 })
            .lean();
            
        outlooks.forEach(outlook => {
            outlook.outcomes = (outlook.outcomes || []).filter(o => !o.dltSts);
        });
        
        res.json(outlooks);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch financial outlooks' });
    }
};

// Add a new financial outlook category
exports.addFinancialOutlook = async (req, res) => {
    try {
        const userId = req.user?.uid || 'system';
        const ip = req.ip;

        const outlook = new FinancialOutlook({
            category: req.body.category,
            crtdBy: userId,
            crtdIp: ip
        });

        await outlook.save();
        res.json({ message: 'Financial outlook category added', outlook });
    } catch (error) {
        res.status(500).json({ message: 'Failed to add financial outlook category' });
    }
};

// Edit a financial outlook category
exports.editFinancialOutlook = async (req, res) => {
    try {
        const userId = req.user?.uid || 'system';
        const ip = req.ip;

        const updated = await FinancialOutlook.findByIdAndUpdate(req.params.id, {
            $set: {
                category: req.body.category,
                updtBy: userId,
                updtIp: ip,
                updtOn: new Date()
            }
        }, { new: true });

        if (!updated) return res.status(404).json({ message: 'Financial outlook not found' });
        res.json({ message: 'Financial outlook updated', outlook: updated });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update financial outlook' });
    }
};

// Delete a financial outlook category
exports.deleteFinancialOutlook = async (req, res) => {
    try {
        const userId = req.user?.uid || 'system';
        const ip = req.ip;

        const deleted = await FinancialOutlook.findByIdAndUpdate(req.params.id, {
            $set: {
                dltSts: true,
                dltBy: userId,
                dltIp: ip,
                dltOn: new Date()
            }
        }, { new: true });

        if (!deleted) return res.status(404).json({ message: 'Financial outlook not found' });
        res.json({ message: 'Financial outlook deleted', outlook: deleted });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete financial outlook' });
    }
};

// Add an outcome to a financial outlook category
exports.addOutcome = async (req, res) => {
    try {
        const userId = req.user?.uid || 'system';
        const ip = req.ip;

        const outlook = await FinancialOutlook.findById(req.params.id);
        if (!outlook) return res.status(404).json({ message: 'Financial outlook not found' });

        outlook.outcomes.push({
            title: req.body.title,
            description: req.body.description,
            crtdBy: userId,
            crtdIp: ip
        });

        await outlook.save();
        res.json({ message: 'Financial outcome added', outlook });
    } catch (error) {
        res.status(500).json({ message: 'Failed to add financial outcome' });
    }
};

// Edit an outcome in a financial outlook category
exports.editOutcome = async (req, res) => {
    try {
        const userId = req.user?.uid || 'system';
        const ip = req.ip;

        const outlook = await FinancialOutlook.findById(req.params.id);
        if (!outlook) return res.status(404).json({ message: 'Financial outlook not found' });

        const outcome = outlook.outcomes.id(req.params.outcomeId);
        if (!outcome) return res.status(404).json({ message: 'Financial outcome not found' });

        outcome.title = req.body.title;
        outcome.description = req.body.description;
        outcome.updtBy = userId;
        outcome.updtIp = ip;
        outcome.updtOn = new Date();

        await outlook.save();
        res.json({ message: 'Financial outcome updated', outlook });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update financial outcome' });
    }
};

// Delete an outcome from a financial outlook category
exports.deleteOutcome = async (req, res) => {
    try {
        const userId = req.user?.uid || 'system';
        const ip = req.ip;

        const outlook = await FinancialOutlook.findById(req.params.id);
        if (!outlook) return res.status(404).json({ message: 'Financial outlook not found' });

        const outcome = outlook.outcomes.id(req.params.outcomeId);
        if (!outcome) return res.status(404).json({ message: 'Financial outcome not found' });

        outcome.dltSts = true;
        outcome.dltBy = userId;
        outcome.dltIp = ip;
        outcome.dltOn = new Date();

        await outlook.save();
        res.json({ message: 'Financial outcome deleted', outlook });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete financial outcome' });
    }
};

// Clear all outcomes from a financial outlook category
exports.clearOutcomes = async (req, res) => {
    try {
        const outlook = await FinancialOutlook.findById(req.params.id);
        if (!outlook) return res.status(404).json({ message: 'Financial outlook not found' });

        outlook.outcomes = [];
        await outlook.save();

        res.json({ message: 'All financial outcomes cleared', outlook });
    } catch (error) {
        res.status(500).json({ message: 'Failed to clear financial outcomes' });
    }
};