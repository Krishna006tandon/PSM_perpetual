const MOCTicket = require('../models/MOCTicket');

exports.createMOC = async (req, res) => {
  try {
    const newMoc = new MOCTicket(req.body);
    const savedMoc = await newMoc.save();
    res.status(201).json(savedMoc);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getAllMOCs = async (req, res) => {
  try {
    const mocs = await MOCTicket.find(req.query);
    res.status(200).json(mocs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMOCById = async (req, res) => {
  try {
    let moc = await MOCTicket.findOne({ mocId: req.params.mocId });
    if (!moc && req.params.mocId.match(/^[0-9a-fA-F]{24}$/)) {
      moc = await MOCTicket.findById(req.params.mocId);
    }
    if (!moc) return res.status(404).json({ error: 'MOC not found' });
    res.status(200).json(moc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.advanceStage = async (req, res) => {
  try {
    const { action, actor, comments } = req.body;
    let moc = await MOCTicket.findOne({ mocId: req.params.mocId });
    if (!moc && req.params.mocId.match(/^[0-9a-fA-F]{24}$/)) {
      moc = await MOCTicket.findById(req.params.mocId);
    }
    if (!moc) return res.status(404).json({ error: 'MOC not found' });

    if (moc.currentStageIndex >= 10) return res.status(400).json({ error: 'MOC is already at the final stage' });

    moc.stageHistory.push({
      stageIndex: moc.currentStageIndex,
      action: action || 'Approved',
      actor,
      comments
    });
    
    moc.currentStageIndex += 1;
    await moc.save();
    res.status(200).json(moc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.rejectMOC = async (req, res) => {
  try {
    const { actor, comments } = req.body;
    let moc = await MOCTicket.findOne({ mocId: req.params.mocId });
    if (!moc && req.params.mocId.match(/^[0-9a-fA-F]{24}$/)) {
      moc = await MOCTicket.findById(req.params.mocId);
    }
    if (!moc) return res.status(404).json({ error: 'MOC not found' });

    if (moc.currentStageIndex > 7) {
      return res.status(400).json({ error: 'Rejection is not allowed after Stage 8' });
    }

    moc.stageHistory.push({
      stageIndex: moc.currentStageIndex,
      action: 'Rejected',
      actor,
      comments
    });
    
    moc.status = 'Rejected';
    await moc.save();
    res.status(200).json(moc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.addQuery = async (req, res) => {
  try {
    const { from, to, description } = req.body;
    const moc = await MOCTicket.findOneAndUpdate(
      { mocId: req.params.mocId },
      { $push: { queries: { from, to, description } } },
      { new: true }
    );
    if (!moc) return res.status(404).json({ error: 'MOC not found' });
    res.status(200).json(moc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.submitChecklist = async (req, res) => {
  try {
    const { stage, data } = req.body; // stage can be 'stage3' or 'stage5'
    const updateQuery = {};
    updateQuery[`checklistResponses.${stage}`] = data;
    
    let moc = await MOCTicket.findOne({ mocId: req.params.mocId });
    if (!moc && req.params.mocId.match(/^[0-9a-fA-F]{24}$/)) {
      moc = await MOCTicket.findById(req.params.mocId);
    }
    if (!moc) return res.status(404).json({ error: 'MOC not found' });
    
    moc = await MOCTicket.findOneAndUpdate(
      { _id: moc._id },
      { $set: updateQuery },
      { new: true }
    );
    res.status(200).json(moc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.submitCostEstimation = async (req, res) => {
  try {
    const { departments } = req.body;
    let moc = await MOCTicket.findOne({ mocId: req.params.mocId });
    if (!moc && req.params.mocId.match(/^[0-9a-fA-F]{24}$/)) {
      moc = await MOCTicket.findById(req.params.mocId);
    }
    if (!moc) return res.status(404).json({ error: 'MOC not found' });

    moc = await MOCTicket.findOneAndUpdate(
      { _id: moc._id },
      { $set: { 'costEstimation.departments': departments } },
      { new: true }
    );
    res.status(200).json(moc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.assignPM = async (req, res) => {
  try {
    const { name, department, assignedBy } = req.body;
    let moc = await MOCTicket.findOne({ mocId: req.params.mocId });
    if (!moc && req.params.mocId.match(/^[0-9a-fA-F]{24}$/)) {
      moc = await MOCTicket.findById(req.params.mocId);
    }
    if (!moc) return res.status(404).json({ error: 'MOC not found' });

    moc = await MOCTicket.findOneAndUpdate(
      { _id: moc._id },
      { $set: { assignedPM: { name, department, assignedBy, assignedAt: Date.now() } } },
      { new: true }
    );
    res.status(200).json(moc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.closeMOC = async (req, res) => {
  try {
    let moc = await MOCTicket.findOne({ mocId: req.params.mocId });
    if (!moc && req.params.mocId.match(/^[0-9a-fA-F]{24}$/)) {
      moc = await MOCTicket.findById(req.params.mocId);
    }
    if (!moc) return res.status(404).json({ error: 'MOC not found' });

    moc = await MOCTicket.findOneAndUpdate(
      { _id: moc._id },
      { $set: { status: 'Closed', currentStageIndex: 10 } },
      { new: true }
    );
    res.status(200).json(moc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteMOC = async (req, res) => {
  try {
    let moc = await MOCTicket.findOne({ mocId: req.params.mocId });
    if (!moc && req.params.mocId.match(/^[0-9a-fA-F]{24}$/)) {
      moc = await MOCTicket.findById(req.params.mocId);
    }
    if (!moc) return res.status(404).json({ error: 'MOC not found' });
    await MOCTicket.deleteOne({ _id: moc._id });
    res.status(200).json({ message: 'MOC deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.archiveMOC = async (req, res) => {
  try {
    let moc = await MOCTicket.findOne({ mocId: req.params.mocId });
    if (!moc && req.params.mocId.match(/^[0-9a-fA-F]{24}$/)) {
      moc = await MOCTicket.findById(req.params.mocId);
    }
    if (!moc) return res.status(404).json({ error: 'MOC not found' });

    moc.status = 'Archived';
    moc.stageHistory.push({
      stageIndex: moc.currentStageIndex,
      action: 'Submitted',
      actor: req.body.actor || { name: 'System', designation: 'System' },
      comments: req.body.comments || 'MOC archived by creator'
    });
    await moc.save();
    res.status(200).json(moc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.unarchiveMOC = async (req, res) => {
  try {
    let moc = await MOCTicket.findOne({ mocId: req.params.mocId });
    if (!moc && req.params.mocId.match(/^[0-9a-fA-F]{24}$/)) {
      moc = await MOCTicket.findById(req.params.mocId);
    }
    if (!moc) return res.status(404).json({ error: 'MOC not found' });

    moc.status = 'Active';
    moc.stageHistory.push({
      stageIndex: moc.currentStageIndex,
      action: 'Submitted',
      actor: req.body.actor || { name: 'System', designation: 'System' },
      comments: req.body.comments || 'MOC restored from archive'
    });
    await moc.save();
    res.status(200).json(moc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
