const path = require('path');
const fs = require('fs');
const MOCTicket = require('../models/MOCTicket');

// Helper to generate sequential MOC ID if not supplied
const generateMocId = async (companyCode) => {
  const year = new Date().getFullYear();
  const prefix = `MOC-${year}-`;
  const existingMocs = await MOCTicket.find(
    { mocId: { $regex: `^${prefix}` } },
    { mocId: 1 }
  );

  let maxSeq = 0;
  existingMocs.forEach((m) => {
    const tail = parseInt(String(m.mocId || '').replace(prefix, ''), 10);
    if (!isNaN(tail) && tail > maxSeq) {
      maxSeq = tail;
    }
  });

  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
};

exports.createMOC = async (req, res) => {
  try {
    if (req.body.title) {
      const existingMoc = await MOCTicket.findOne({ title: { $regex: new RegExp(`^${req.body.title}$`, 'i') } });
      if (existingMoc) {
        return res.status(400).json({ error: 'An MOC with this name already exists. Please choose a different name.' });
      }
    }

    const payload = { ...req.body };

    // Tenant tagging
    payload.companyCode = req.user?.companyCode || payload.companyCode || 'DEFAULT';

    // Auto-generate MOC ID if missing or generic
    if (!payload.mocId || payload.mocId.startsWith('MOC-NaN') || payload.mocId.trim() === '') {
      payload.mocId = await generateMocId(payload.companyCode);
    }

    // Default requestor info from authenticated user if not provided
    if (!payload.requestor || !payload.requestor.name) {
      payload.requestor = {
        name: req.user?.name || payload.requestor?.name || 'Initiator',
        designation: req.user?.role || payload.requestor?.designation || 'Process Engineer',
        orgNumber: req.user?.companyCode || payload.requestor?.orgNumber || 'ORG-001',
        contact: req.user?.email || payload.requestor?.contact || ''
      };
    }
    
    const newMoc = new MOCTicket(payload);
    const savedMoc = await newMoc.save();
    res.status(201).json(savedMoc);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getAllMOCs = async (req, res) => {
  try {
    const query = { ...req.query };
    const userCompany = req.user?.companyCode || query.orgNumber;
    delete query.orgNumber;

    // Tenant isolation: allow tenant's MOCs plus legacy/shared 'DEFAULT' MOCs
    if (userCompany && req.user?.role !== 'SuperAdmin') {
      query.$or = [
        { companyCode: userCompany },
        { 'requestor.orgNumber': userCompany },
        { companyCode: 'DEFAULT' },
        { companyCode: { $exists: false } },
        { companyCode: null }
      ];
    }

    const mocs = await MOCTicket.find(query).sort({ updatedAt: -1 });
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

    const safeActor = actor || {
      name: req.user?.name || 'Authorized User',
      designation: req.user?.role || 'Approver'
    };

    moc.stageHistory.push({
      stageIndex: moc.currentStageIndex,
      action: action || 'Approved',
      actor: safeActor,
      comments: comments || ''
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

    const safeActor = actor || {
      name: req.user?.name || 'Reviewer',
      designation: req.user?.role || 'Reviewer'
    };

    moc.stageHistory.push({
      stageIndex: moc.currentStageIndex,
      action: 'Rejected',
      actor: safeActor,
      comments: comments || ''
    });
    
    moc.rejectionCount = (moc.rejectionCount || 0) + 1;
    if (moc.rejectionCount >= 2) {
      moc.status = 'Permanently Rejected';
    } else {
      moc.status = 'Rejected';
    }
    
    await moc.save();
    res.status(200).json(moc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.addQuery = async (req, res) => {
  try {
    const { from, to, description } = req.body;
    const safeFrom = from || req.user?.name || 'User';
    const moc = await MOCTicket.findOneAndUpdate(
      { $or: [{ mocId: req.params.mocId }, { _id: req.params.mocId.match(/^[0-9a-fA-F]{24}$/) ? req.params.mocId : null }] },
      { $push: { queries: { from: safeFrom, to: to || 'Team', description } } },
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
    const { stage, data } = req.body; // stage can be 'stage3', 'stage5', or 'stage10'
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

exports.submitSecondaryApproval = async (req, res) => {
  try {
    const { data } = req.body;
    let moc = await MOCTicket.findOne({ mocId: req.params.mocId });
    if (!moc && req.params.mocId.match(/^[0-9a-fA-F]{24}$/)) {
      moc = await MOCTicket.findById(req.params.mocId);
    }
    if (!moc) return res.status(404).json({ error: 'MOC not found' });

    moc = await MOCTicket.findOneAndUpdate(
      { _id: moc._id },
      { $set: { secondaryApprovals: data } },
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
      { $set: { assignedPM: { name, department, assignedBy: assignedBy || req.user?.name || 'Engineering Head', assignedAt: Date.now() } } },
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

    const { actor, comments } = req.body || {};
    const safeActor = actor || {
      name: req.user?.name || 'System Admin',
      designation: req.user?.role || 'Area Owner'
    };
    
    moc = await MOCTicket.findOneAndUpdate(
      { _id: moc._id },
      { 
        $set: { status: 'Closed', currentStageIndex: 10 },
        $push: {
          stageHistory: {
            stageIndex: 10,
            action: 'Approved',
            actor: safeActor,
            comments: comments || 'MOC Closed and Archived'
          }
        }
      },
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

    const safeActor = req.body.actor || {
      name: req.user?.name || 'System',
      designation: req.user?.role || 'System'
    };

    moc.status = 'Archived';
    moc.stageHistory.push({
      stageIndex: moc.currentStageIndex,
      action: 'Submitted',
      actor: safeActor,
      comments: req.body.comments || 'MOC archived by user'
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

    const safeActor = req.body.actor || {
      name: req.user?.name || 'System',
      designation: req.user?.role || 'System'
    };

    moc.status = 'Active';
    moc.stageHistory.push({
      stageIndex: moc.currentStageIndex,
      action: 'Submitted',
      actor: safeActor,
      comments: req.body.comments || 'MOC restored from archive'
    });
    await moc.save();
    res.status(200).json(moc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.unrejectMOC = async (req, res) => {
  try {
    let moc = await MOCTicket.findOne({ mocId: req.params.mocId });
    if (!moc && req.params.mocId.match(/^[0-9a-fA-F]{24}$/)) {
      moc = await MOCTicket.findById(req.params.mocId);
    }
    if (!moc) return res.status(404).json({ error: 'MOC not found' });

    const safeActor = req.body.actor || {
      name: req.user?.name || 'System',
      designation: req.user?.role || 'System'
    };

    moc.status = 'Active';
    moc.stageHistory.push({
      stageIndex: moc.currentStageIndex,
      action: 'Submitted',
      actor: safeActor,
      comments: req.body.comments || 'Reanalyzed and un-rejected'
    });
    
    await moc.save();
    res.status(200).json(moc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.resolveQuery = async (req, res) => {
  try {
    const { queryId, resolutionMessage } = req.body;
    let moc = await MOCTicket.findOne({ mocId: req.params.mocId });
    if (!moc && req.params.mocId.match(/^[0-9a-fA-F]{24}$/)) {
      moc = await MOCTicket.findById(req.params.mocId);
    }
    if (!moc) return res.status(404).json({ error: 'MOC not found' });

    let query = null;
    if (queryId) {
      query = moc.queries.id(queryId) || moc.queries.find(q => q._id.toString() === queryId.toString() || String(q.id) === String(queryId));
    }
    
    if (!query && req.body.description) {
      query = moc.queries.find(q => 
        q.description === req.body.description && 
        (req.body.timestamp ? new Date(q.timestamp).getTime() === new Date(req.body.timestamp).getTime() : true)
      );
    }
    
    if (!query) return res.status(404).json({ error: 'Query not found' });

    query.status = 'Resolved';
    query.resolutionMessage = resolutionMessage || 'Resolved';
    
    moc.markModified('queries');
    await moc.save();
    res.status(200).json(moc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// --- FILE ATTACHMENTS FOR DRAWINGS, P&IDs, DATASHEETS ---
exports.uploadAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    let moc = await MOCTicket.findOne({ mocId: req.params.mocId });
    if (!moc && req.params.mocId.match(/^[0-9a-fA-F]{24}$/)) {
      moc = await MOCTicket.findById(req.params.mocId);
    }
    if (!moc) return res.status(404).json({ error: 'MOC not found' });

    const attachment = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: `/uploads/moc/${req.file.filename}`,
      mimetype: req.file.mimetype,
      size: req.file.size,
      stage: Number(req.body.stage ?? moc.currentStageIndex),
      description: req.body.description || req.file.originalname,
      uploadedBy: {
        name: req.body.uploadedByName || req.user?.name || 'User',
        designation: req.body.uploadedByDesignation || req.user?.role || 'Engineer'
      },
      uploadedAt: new Date()
    };

    moc.attachments = moc.attachments || [];
    moc.attachments.push(attachment);
    await moc.save();
    res.status(201).json(moc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteAttachment = async (req, res) => {
  try {
    let moc = await MOCTicket.findOne({ mocId: req.params.mocId });
    if (!moc && req.params.mocId.match(/^[0-9a-fA-F]{24}$/)) {
      moc = await MOCTicket.findById(req.params.mocId);
    }
    if (!moc) return res.status(404).json({ error: 'MOC not found' });

    const attIndex = moc.attachments.findIndex(
      a => a._id.toString() === req.params.attachmentId || a.filename === req.params.attachmentId
    );
    if (attIndex === -1) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const att = moc.attachments[attIndex];
    try {
      const filePath = path.join(__dirname, '..', 'uploads', 'moc', att.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fsErr) {
      console.warn('Could not delete physical attachment file:', fsErr.message);
    }

    moc.attachments.splice(attIndex, 1);
    await moc.save();
    res.status(200).json(moc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
