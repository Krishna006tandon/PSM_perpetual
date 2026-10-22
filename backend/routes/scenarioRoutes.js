const express = require('express');
const router = express.Router();
const Scenario = require('../models/Scenario');
const auth = require('../middleware/auth');
const checkStudyAccess = require('../middleware/checkStudyAccess');

// Apply auth middleware
router.use(auth);

// GET all company-wide recommendations across studies (Placed BEFORE /:studyId)
router.get('/company/recommendations', async (req, res) => {
  try {
    const User = require('../models/User');
    const Study = require('../models/Study');
    const TeamMember = require('../models/TeamMember');

    const user = await User.findById(req.user.userId);
    const userRole = (user && user.role) ? user.role.toLowerCase() : '';
    const userEmail = user ? user.email : '';

    let accessibleStudyIds = [];
    if (user && (userRole === 'admin' || userRole === 'superadmin' || userRole === 'owner')) {
      const studies = await Study.find({ companyCode: req.user.companyCode }).select('_id');
      accessibleStudyIds = studies.map(s => s._id);
    } else {
      const [companyStudies, memberships] = await Promise.all([
        Study.find({ companyCode: req.user.companyCode }).select('_id'),
        TeamMember.find({ email: { $regex: new RegExp(`^${userEmail.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') } }).select('studyId')
      ]);
      const set = new Set([...companyStudies.map(s => String(s._id)), ...memberships.map(m => String(m.studyId))]);
      accessibleStudyIds = Array.from(set);
    }

    const filter = {
      $or: [
        { additionalProtection: { $exists: true, $regex: /\S/ } },
        { recommendationNo: { $exists: true, $regex: /\S/ } }
      ]
    };

    if (accessibleStudyIds.length > 0) {
      filter.studyId = { $in: accessibleStudyIds };
    } else if (req.user.companyCode) {
      filter.companyCode = req.user.companyCode;
    }

    const scenarios = await Scenario.find(filter)
      .populate('studyId', 'studyName phaType facility plantUnit lastAccessed')
      .populate('nodeId', 'description intention boundary')
      .populate('deviationId', 'deviationAuto guidewords parameter')
      .populate('causeId', 'description')
      .sort({ updatedAt: -1, order: 1 });

    res.json(scenarios);
  } catch (err) {
    console.error('Error fetching company recommendations:', err);
    res.status(500).json({ message: err.message });
  }
});

// Apply checkStudyAccess middleware to routes targeting a specific study
router.use('/:studyId', checkStudyAccess);

// GET all scenarios for a specific study, optionally filtered by node
router.get('/:studyId', async (req, res) => {
  try {
    const filter = { studyId: req.params.studyId };
    if (req.query.nodeId) {
      filter.nodeId = req.query.nodeId;
    }
    
    // Populate the referenced data
    const scenarios = await Scenario.find(filter)
      .populate('nodeId')
      .populate('deviationId')
      .populate('causeId')
      .sort({ order: 1 });
      
    res.json(scenarios);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST a new scenario row
router.post('/:studyId', async (req, res) => {
  try {
    const { insertAfterScenarioId, insertBeforeScenarioId, ...bodyData } = req.body;
    let newOrder;

    if (insertBeforeScenarioId) {
      const targetScenario = await Scenario.findById(insertBeforeScenarioId);
      if (targetScenario) {
        newOrder = targetScenario.order !== undefined ? targetScenario.order : 1;
        const targetNodeId = req.body.nodeId || targetScenario.nodeId;
        // Shift target and subsequent rows
        await Scenario.updateMany(
          { studyId: req.params.studyId, nodeId: targetNodeId, order: { $gte: newOrder } },
          { $inc: { order: 1 } }
        );
      }
    } else if (insertAfterScenarioId) {
      const targetScenario = await Scenario.findById(insertAfterScenarioId);
      if (targetScenario) {
        newOrder = (targetScenario.order || 0) + 1;
        const targetNodeId = req.body.nodeId || targetScenario.nodeId;
        // Shift subsequent rows
        await Scenario.updateMany(
          { studyId: req.params.studyId, nodeId: targetNodeId, order: { $gte: newOrder } },
          { $inc: { order: 1 } }
        );
      }
    }

    if (newOrder === undefined) {
      const filter = { studyId: req.params.studyId, nodeId: req.body.nodeId };
      const lastScenario = await Scenario.findOne(filter).sort({ order: -1 });
      newOrder = lastScenario ? (lastScenario.order || 0) + 1 : 1;
    }

    const newScenario = new Scenario({
      companyCode: req.user.companyCode,
      studyId: req.params.studyId,
      order: newOrder,
      ...bodyData
    });

    const savedScenario = await newScenario.save();
    
    // Populate it before sending back so UI has everything
    const populated = await Scenario.findById(savedScenario._id)
      .populate('nodeId')
      .populate('deviationId')
      .populate('causeId');
      
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT to update a specific scenario
// PUT toggle LOPA for scenario(s) in a consequence group or by ids
router.put('/:studyId/toggle-lopa', async (req, res) => {
  try {
    const { scenarioIds, scenarioId, consequenceGroupId, isLopa } = req.body;
    let filter = { studyId: req.params.studyId };
    if (consequenceGroupId && String(consequenceGroupId).trim() !== '') {
      const orConditions = [{ consequenceGroupId }];
      if (scenarioIds && Array.isArray(scenarioIds) && scenarioIds.length > 0) {
        orConditions.push({ _id: { $in: scenarioIds } });
      } else if (scenarioId) {
        orConditions.push({ _id: scenarioId });
      }
      filter.$or = orConditions;
    } else if (scenarioIds && Array.isArray(scenarioIds) && scenarioIds.length > 0) {
      filter._id = { $in: scenarioIds };
    } else if (scenarioId) {
      filter._id = scenarioId;
    } else {
      return res.status(400).json({ message: 'scenarioIds, scenarioId, or consequenceGroupId required' });
    }

    await Scenario.updateMany(filter, { $set: { isLopa: Boolean(isLopa) } });
    res.json({ success: true, message: 'LOPA updated successfully', isLopa: Boolean(isLopa) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updatedScenario = await Scenario.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    )
    .populate('nodeId')
    .populate('deviationId')
    .populate('causeId');
    
    if (!updatedScenario) {
      return res.status(404).json({ message: 'Scenario not found' });
    }
    
    res.json(updatedScenario);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE a specific scenario
router.delete('/:id', async (req, res) => {
  try {
    const deletedScenario = await Scenario.findByIdAndDelete(req.params.id);
    if (!deletedScenario) {
      return res.status(404).json({ message: 'Scenario not found' });
    }
    res.json({ message: 'Scenario deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST bulk duplicate scenarios
router.post('/:studyId/bulk-duplicate', async (req, res) => {
  try {
    const { scenarioIds, targetNodeId, insertAfterScenarioId } = req.body;
    if (!scenarioIds || !scenarioIds.length) {
      return res.status(400).json({ message: 'No scenario IDs provided' });
    }

    const scenariosToClone = await Scenario.find({ _id: { $in: scenarioIds } }).sort({ order: 1 });
    if (!scenariosToClone.length) {
      return res.status(404).json({ message: 'Scenarios not found' });
    }

    const effectiveNodeId = targetNodeId || scenariosToClone[0].nodeId;
    let startOrder;

    const afterId = insertAfterScenarioId || (scenarioIds.length === 1 ? scenarioIds[0] : null);
    if (afterId) {
      const target = await Scenario.findById(afterId);
      if (target) {
        startOrder = (target.order || 0) + 1;
        // Shift all subsequent scenarios down
        await Scenario.updateMany(
          { studyId: req.params.studyId, nodeId: effectiveNodeId, order: { $gte: startOrder } },
          { $inc: { order: scenariosToClone.length } }
        );
      }
    }

    if (startOrder === undefined) {
      const lastScenario = await Scenario.findOne({ studyId: req.params.studyId, nodeId: effectiveNodeId }).sort({ order: -1 });
      startOrder = lastScenario ? (lastScenario.order || 0) + 1 : 1;
    }

    const Deviation = require('../models/Deviation');
    const Cause = require('../models/Cause');

    // Deep clone deviations and causes so cloned scenarios are independent
    const devMapping = {};
    const causeMapping = {};

    const devIds = [...new Set(scenariosToClone.map(s => s.deviationId?.toString()).filter(Boolean))];
    const causeIds = [...new Set(scenariosToClone.map(s => s.causeId?.toString()).filter(Boolean))];

    const sourceDevs = await Deviation.find({ _id: { $in: devIds } });
    const sourceCauses = await Cause.find({ _id: { $in: causeIds } });

    for (const d of sourceDevs) {
      const dObj = d.toObject();
      delete dObj._id;
      delete dObj.createdAt;
      delete dObj.updatedAt;
      dObj.companyCode = req.user.companyCode;
      dObj.studyId = req.params.studyId;
      const newD = new Deviation(dObj);
      const savedD = await newD.save();
      devMapping[d._id.toString()] = savedD._id;
    }

    for (const c of sourceCauses) {
      const cObj = c.toObject();
      delete cObj._id;
      delete cObj.createdAt;
      delete cObj.updatedAt;
      cObj.companyCode = req.user.companyCode;
      cObj.studyId = req.params.studyId;
      const newC = new Cause(cObj);
      const savedC = await newC.save();
      causeMapping[c._id.toString()] = savedC._id;
    }

    const groupMapping = {};

    const clonedDocs = scenariosToClone.map((sc, i) => {
      const obj = sc.toObject();
      delete obj._id;
      delete obj.__v;
      delete obj.createdAt;
      delete obj.updatedAt;
      obj.studyId = req.params.studyId;
      obj.companyCode = req.user.companyCode;
      obj.nodeId = effectiveNodeId;
      obj.order = startOrder + i;

      if (obj.deviationId && devMapping[obj.deviationId.toString()]) {
        obj.deviationId = devMapping[obj.deviationId.toString()];
      }
      if (obj.causeId && causeMapping[obj.causeId.toString()]) {
        obj.causeId = causeMapping[obj.causeId.toString()];
      }

      if (obj.consequenceGroupId) {
        if (!groupMapping[obj.consequenceGroupId]) {
          groupMapping[obj.consequenceGroupId] = 'grp_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        }
        obj.consequenceGroupId = groupMapping[obj.consequenceGroupId];
      }
      if (obj.safeguardGroupId) {
        if (!groupMapping[obj.safeguardGroupId]) {
          groupMapping[obj.safeguardGroupId] = 'sgrp_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        }
        obj.safeguardGroupId = groupMapping[obj.safeguardGroupId];
      }

      return obj;
    });

    const inserted = await Scenario.insertMany(clonedDocs);
    const populated = await Scenario.find({ _id: { $in: inserted.map(d => d._id) } })
      .populate('nodeId')
      .populate('deviationId')
      .populate('causeId');

    res.status(201).json(populated);
  } catch (err) {
    console.error('Error duplicating scenarios:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST bulk paste scenarios (from Excel or PHA clipboard)
router.post('/:studyId/bulk-paste', async (req, res) => {
  try {
    const { rows, targetNodeId, insertAfterScenarioId } = req.body;
    if (!rows || !Array.isArray(rows) || !rows.length) {
      return res.status(400).json({ message: 'No rows provided to paste' });
    }

    const Deviation = require('../models/Deviation');
    const Cause = require('../models/Cause');

    const effectiveNodeId = targetNodeId;
    if (!effectiveNodeId) {
      return res.status(400).json({ message: 'targetNodeId is required' });
    }

    let startOrder;
    if (insertAfterScenarioId) {
      const target = await Scenario.findById(insertAfterScenarioId);
      if (target) {
        startOrder = (target.order || 0) + 1;
        await Scenario.updateMany(
          { studyId: req.params.studyId, nodeId: effectiveNodeId, order: { $gte: startOrder } },
          { $inc: { order: rows.length } }
        );
      }
    }

    if (startOrder === undefined) {
      const lastScenario = await Scenario.findOne({ studyId: req.params.studyId, nodeId: effectiveNodeId }).sort({ order: -1 });
      startOrder = lastScenario ? (lastScenario.order || 0) + 1 : 1;
    }

    const devCache = new Map();
    const causeCache = new Map();
    const groupMapping = {};

    const docsToInsert = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const devText = (row.deviationText || row.deviation || '').trim();
      const causeText = (row.causeDescription || row.cause || '').trim();

      // 1. Resolve / Create Deviation
      let deviationId = null;
      if (devText) {
        if (devCache.has(devText)) {
          deviationId = devCache.get(devText);
        } else {
          const newDev = new Deviation({
            companyCode: req.user.companyCode,
            studyId: req.params.studyId,
            deviationAuto: devText,
            parameter: row.parameter || '',
            processFlowMaterial: row.processFlowMaterial || '',
            locationFrom: row.locationFrom || '',
            locationTo: row.locationTo || '',
            guidewords: row.guidewords || ''
          });
          const savedDev = await newDev.save();
          devCache.set(devText, savedDev._id);
          deviationId = savedDev._id;
        }
      } else {
        const newDev = new Deviation({
          companyCode: req.user.companyCode,
          studyId: req.params.studyId,
          deviationAuto: ''
        });
        const savedDev = await newDev.save();
        deviationId = savedDev._id;
      }

      // 2. Resolve / Create Cause
      let causeId = null;
      const causeKey = `${devText}:::${causeText}`;
      if (causeText) {
        if (causeCache.has(causeKey)) {
          causeId = causeCache.get(causeKey);
        } else {
          const newCause = new Cause({
            companyCode: req.user.companyCode,
            studyId: req.params.studyId,
            description: causeText,
            equipment: row.causeEquipment || '',
            instrument: row.causeInstrument || ''
          });
          const savedCause = await newCause.save();
          causeCache.set(causeKey, savedCause._id);
          causeId = savedCause._id;
        }
      } else {
        const newCause = new Cause({
          companyCode: req.user.companyCode,
          studyId: req.params.studyId,
          description: ''
        });
        const savedCause = await newCause.save();
        causeId = savedCause._id;
      }

      // 3. Remap groups
      let consGroup = row.consequenceGroupId;
      if (consGroup) {
        if (!groupMapping[consGroup]) {
          groupMapping[consGroup] = 'grp_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        }
        consGroup = groupMapping[consGroup];
      } else {
        consGroup = 'grp_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      }

      let safeGroup = row.safeguardGroupId;
      if (safeGroup) {
        if (!groupMapping[safeGroup]) {
          groupMapping[safeGroup] = 'sgrp_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        }
        safeGroup = groupMapping[safeGroup];
      }

      const scDoc = {
        companyCode: req.user.companyCode,
        studyId: req.params.studyId,
        nodeId: effectiveNodeId,
        deviationId,
        causeId,
        order: startOrder + i,
        consequencesImmediate: row.consequencesImmediate || '',
        consequencesUltimate: row.consequencesUltimate || '',
        category: row.category || '',
        severityInherent: row.severityInherent !== undefined && row.severityInherent !== '' ? row.severityInherent : null,
        likelihoodInherent: row.likelihoodInherent !== undefined && row.likelihoodInherent !== '' ? row.likelihoodInherent : null,
        riskInherent: row.riskInherent || '',
        safeguards: row.safeguards || '',
        severityMitigated: row.severityMitigated !== undefined && row.severityMitigated !== '' ? row.severityMitigated : null,
        likelihoodMitigated: row.likelihoodMitigated !== undefined && row.likelihoodMitigated !== '' ? row.likelihoodMitigated : null,
        riskMitigated: row.riskMitigated || '',
        additionalProtection: row.additionalProtection || '',
        recommendationNo: row.recommendationNo || '',
        severityResidual: row.severityResidual !== undefined && row.severityResidual !== '' ? row.severityResidual : null,
        likelihoodResidual: row.likelihoodResidual !== undefined && row.likelihoodResidual !== '' ? row.likelihoodResidual : null,
        riskResidual: row.riskResidual || '',
        remarks: row.remarks || '',
        status: row.status || 'Open',
        lopaRequired: !!row.lopaRequired,
        consequenceGroupId: consGroup,
        safeguardGroupId: safeGroup,
        customData: row.customData || {}
      };
      docsToInsert.push(scDoc);
    }

    const inserted = await Scenario.insertMany(docsToInsert);
    const populated = await Scenario.find({ _id: { $in: inserted.map(d => d._id) } })
      .populate('nodeId')
      .populate('deviationId')
      .populate('causeId');

    res.status(201).json(populated);
  } catch (err) {
    console.error('Error bulk pasting scenarios:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST restore deleted scenarios (undo deletion)
router.post('/:studyId/restore', async (req, res) => {
  try {
    const { scenarios } = req.body;
    if (!scenarios || !Array.isArray(scenarios) || scenarios.length === 0) {
      return res.status(400).json({ message: 'No scenarios provided to restore' });
    }

    const docsToInsert = [];
    for (const sc of scenarios) {
      const { _id, createdAt, updatedAt, __v, ...rest } = sc;
      const targetNodeId = sc.nodeId?._id || sc.nodeId || req.body.nodeId;
      if (!targetNodeId) continue;

      const doc = {
        ...rest,
        companyCode: req.user.companyCode,
        studyId: req.params.studyId,
        nodeId: targetNodeId,
        deviationId: sc.deviationId?._id || sc.deviationId || null,
        causeId: sc.causeId?._id || sc.causeId || null
      };

      if (_id) {
        const exists = await Scenario.exists({ _id });
        if (!exists) {
          doc._id = _id;
        }
      }
      docsToInsert.push(doc);
    }

    if (docsToInsert.length === 0) {
      return res.status(400).json({ message: 'No valid scenarios to restore' });
    }

    const inserted = await Scenario.insertMany(docsToInsert);

    const populated = await Scenario.find({ _id: { $in: inserted.map(d => d._id) } })
      .populate('nodeId')
      .populate('deviationId')
      .populate('causeId');

    res.status(201).json(populated);
  } catch (err) {
    console.error('Error restoring scenarios:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

