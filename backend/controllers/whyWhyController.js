const mongoose = require('mongoose');
const Incident = require('../models/Incident');
const WhyWhyNode = require('../models/WhyWhyNode');
const { API_754_CAUSAL_FACTORS } = require('../utils/api754Helper');

const VALID_STATUSES = ['Exploring', 'Validated', 'Disproven', 'Inconclusive'];
const VALID_ROOT_CAUSE_TYPES = ['None', 'Primary Root Cause', 'Secondary Root Cause', 'Contributing Factor'];

const validateObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Keep isRootCause and rootCauseType consistent regardless of which field a caller updates.
 */
const normalizeRootCauseFields = (payload, fallback = {}) => {
  const hasExplicitType = Object.prototype.hasOwnProperty.call(payload, 'rootCauseType');
  const hasExplicitFlag = Object.prototype.hasOwnProperty.call(payload, 'isRootCause');

  let rootCauseType = hasExplicitType ? payload.rootCauseType : (fallback.rootCauseType || 'None');
  let isRootCause = hasExplicitFlag ? Boolean(payload.isRootCause) : Boolean(fallback.isRootCause);

  if (!VALID_ROOT_CAUSE_TYPES.includes(rootCauseType)) {
    rootCauseType = 'None';
  }

  if (hasExplicitType && !hasExplicitFlag) {
    isRootCause = rootCauseType !== 'None';
  } else if (hasExplicitFlag && !hasExplicitType) {
    if (!isRootCause) {
      rootCauseType = 'None';
    } else if (rootCauseType === 'None') {
      rootCauseType = 'Primary Root Cause';
    }
  } else if (!isRootCause) {
    rootCauseType = 'None';
  } else if (rootCauseType === 'None') {
    rootCauseType = 'Primary Root Cause';
  }

  return { isRootCause, rootCauseType };
};

/**
 * Validate category/subcategory against API RP 754 Section 10.4.4 taxonomy when provided.
 */
const normalizeCausalFactor = (api754Category = '', api754Subcategory = '') => {
  const category = String(api754Category || '').trim();
  const subcategory = String(api754Subcategory || '').trim();

  if (!category) {
    return { api754Category: '', api754Subcategory: '' };
  }

  const matchedCategory = API_754_CAUSAL_FACTORS.find((c) => c.category === category);
  if (!matchedCategory) {
    return { api754Category: category, api754Subcategory: subcategory };
  }

  const validSub = matchedCategory.subcategories.includes(subcategory) ? subcategory : '';
  return {
    api754Category: matchedCategory.category,
    api754Subcategory: validSub || subcategory
  };
};

const computeTreeSummary = (nodes) => {
  const taggedCategories = new Set();
  let rootCausesCount = 0;
  let primaryRootCauses = 0;
  let secondaryRootCauses = 0;
  let contributingFactors = 0;
  let validatedCount = 0;
  let disprovenCount = 0;
  let exploringCount = 0;
  let inconclusiveCount = 0;
  let maxDepth = 0;

  nodes.forEach((node) => {
    if (node.whyLevel > maxDepth) maxDepth = node.whyLevel;

    if (node.status === 'Validated') validatedCount++;
    else if (node.status === 'Disproven') disprovenCount++;
    else if (node.status === 'Inconclusive') inconclusiveCount++;
    else exploringCount++;

    if (node.isRootCause || (node.rootCauseType && node.rootCauseType !== 'None')) {
      rootCausesCount++;
      if (node.rootCauseType === 'Primary Root Cause') primaryRootCauses++;
      else if (node.rootCauseType === 'Secondary Root Cause') secondaryRootCauses++;
      else if (node.rootCauseType === 'Contributing Factor') contributingFactors++;
    }

    if (node.api754Category) {
      taggedCategories.add(node.api754Category);
    }
  });

  return {
    totalNodes: nodes.length,
    maxDepth,
    rootCausesCount,
    primaryRootCauses,
    secondaryRootCauses,
    contributingFactors,
    validatedCount,
    disprovenCount,
    exploringCount,
    inconclusiveCount,
    taggedCausalCategories: Array.from(taggedCategories)
  };
};

// 1. Get all Why-Why RCA nodes for an incident (auto-initializing Problem Anchor if missing)
exports.getWhyWhyNodes = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(400).json({ error: 'Invalid incident ID' });
    }

    const incident = await Incident.findById(id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    let nodes = await WhyWhyNode.find({ incidentId: incident._id }).sort({
      whyLevel: 1,
      branchIndex: 1,
      createdAt: 1
    });

    // Guarantee a Problem Anchor (Level 0) exists so CFT can immediately branch Why 1..N
    if (nodes.length === 0) {
      const anchor = new WhyWhyNode({
        incidentId: incident._id,
        parentId: null,
        whyLevel: 0,
        branchIndex: 0,
        statement: incident.descriptionMatrix?.whatHappened || incident.title,
        status: 'Validated',
        isRootCause: false,
        rootCauseType: 'None',
        notes: 'Problem Anchor initialized from First Incident Report (FIR).',
        createdBy: req.user?.name || 'System'
      });
      await anchor.save();
      nodes = [anchor];
    }

    res.json({
      incidentId: incident._id,
      incidentNumber: incident.incidentNumber,
      nodes,
      summary: computeTreeSummary(nodes)
    });
  } catch (error) {
    console.error('Error fetching Why-Why nodes:', error);
    res.status(500).json({ error: 'Failed to retrieve Why-Why RCA tree: ' + error.message });
  }
};

// 2. Create a new Why-Why node under a parent node
exports.createWhyWhyNode = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(400).json({ error: 'Invalid incident ID' });
    }

    const incident = await Incident.findById(id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const { parentId, statement, status, notes, api754Category, api754Subcategory } = req.body;
    const trimmedStatement = String(statement || '').trim();
    if (!trimmedStatement) {
      return res.status(400).json({ error: 'Why statement cannot be empty.' });
    }

    let whyLevel = 0;
    let branchIndex = 0;
    let resolvedParentId = null;

    if (parentId) {
      if (!validateObjectId(parentId)) {
        return res.status(400).json({ error: 'Invalid parent node ID.' });
      }
      const parentNode = await WhyWhyNode.findOne({ _id: parentId, incidentId: incident._id });
      if (!parentNode) {
        return res.status(404).json({ error: 'Parent Why-Why node not found for this incident.' });
      }
      resolvedParentId = parentNode._id;
      whyLevel = parentNode.whyLevel + 1;
      branchIndex = await WhyWhyNode.countDocuments({ incidentId: incident._id, parentId: parentNode._id });
    } else {
      const existingAnchor = await WhyWhyNode.findOne({ incidentId: incident._id, parentId: null });
      if (existingAnchor) {
        return res.status(400).json({ error: 'A Problem Anchor already exists for this incident. Add child nodes under an existing node.' });
      }
    }

    const { isRootCause, rootCauseType } = normalizeRootCauseFields(req.body);
    const causal = normalizeCausalFactor(api754Category, api754Subcategory);
    const nodeStatus = VALID_STATUSES.includes(status) ? status : 'Exploring';
    const actor = req.body.createdBy || req.user?.name || incident.cft?.leader?.name || 'CFT Investigator';

    const newNode = new WhyWhyNode({
      incidentId: incident._id,
      parentId: resolvedParentId,
      statement: trimmedStatement,
      whyLevel,
      branchIndex,
      status: nodeStatus,
      isRootCause,
      rootCauseType,
      api754Category: causal.api754Category,
      api754Subcategory: causal.api754Subcategory,
      notes: String(notes || '').trim(),
      evidence: Array.isArray(req.body.evidence) ? req.body.evidence : [],
      createdBy: actor
    });

    const savedNode = await newNode.save();

    incident.auditTrail.push({
      action: 'Why-Why Node Added',
      actor,
      timestamp: new Date(),
      details: `Added Why Level ${whyLevel}: "${trimmedStatement.slice(0, 90)}${trimmedStatement.length > 90 ? '...' : ''}"${isRootCause ? ` [Marked: ${rootCauseType}]` : ''}`
    });
    await incident.save();

    res.status(201).json(savedNode);
  } catch (error) {
    console.error('Error creating Why-Why node:', error);
    res.status(500).json({ error: 'Failed to create Why-Why node: ' + error.message });
  }
};

// 3. Update an existing Why-Why node (statement, validation status, root cause, API 754 taxonomy, notes)
exports.updateWhyWhyNode = async (req, res) => {
  try {
    const { id, nodeId } = req.params;
    if (!validateObjectId(id) || !validateObjectId(nodeId)) {
      return res.status(400).json({ error: 'Invalid incident or node ID' });
    }

    const incident = await Incident.findById(id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const node = await WhyWhyNode.findOne({ _id: nodeId, incidentId: incident._id });
    if (!node) {
      return res.status(404).json({ error: 'Why-Why node not found' });
    }

    const prevRootCauseType = node.rootCauseType;
    const prevCategory = node.api754Category;
    const prevStatus = node.status;

    if (Object.prototype.hasOwnProperty.call(req.body, 'statement')) {
      const trimmed = String(req.body.statement || '').trim();
      if (!trimmed) {
        return res.status(400).json({ error: 'Node statement cannot be empty.' });
      }
      node.statement = trimmed;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'status')) {
      if (!VALID_STATUSES.includes(req.body.status)) {
        return res.status(400).json({ error: `Invalid node status. Expected one of: ${VALID_STATUSES.join(', ')}` });
      }
      node.status = req.body.status;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'notes')) {
      node.notes = String(req.body.notes || '');
    }

    const rc = normalizeRootCauseFields(req.body, node);
    node.isRootCause = rc.isRootCause;
    node.rootCauseType = rc.rootCauseType;

    if (
      Object.prototype.hasOwnProperty.call(req.body, 'api754Category') ||
      Object.prototype.hasOwnProperty.call(req.body, 'api754Subcategory')
    ) {
      const nextCat = Object.prototype.hasOwnProperty.call(req.body, 'api754Category')
        ? req.body.api754Category
        : node.api754Category;
      const nextSub = Object.prototype.hasOwnProperty.call(req.body, 'api754Subcategory')
        ? req.body.api754Subcategory
        : node.api754Subcategory;
      const causal = normalizeCausalFactor(nextCat, nextSub);
      node.api754Category = causal.api754Category;
      node.api754Subcategory = causal.api754Subcategory;
    }

    const updatedNode = await node.save();

    const actor = req.body.updatedBy || req.user?.name || incident.cft?.leader?.name || 'CFT Investigator';
    const changes = [];
    if (prevStatus !== updatedNode.status) changes.push(`Status: ${prevStatus} → ${updatedNode.status}`);
    if (prevRootCauseType !== updatedNode.rootCauseType) changes.push(`Root Cause: ${updatedNode.rootCauseType}`);
    if (prevCategory !== updatedNode.api754Category && updatedNode.api754Category) {
      changes.push(`API 754 Causal Factor: ${updatedNode.api754Category}${updatedNode.api754Subcategory ? ' / ' + updatedNode.api754Subcategory : ''}`);
    }

    if (changes.length > 0) {
      incident.auditTrail.push({
        action: 'Why-Why Node Updated',
        actor,
        timestamp: new Date(),
        details: `Why Level ${updatedNode.whyLevel} ("${updatedNode.statement.slice(0, 60)}"): ${changes.join('; ')}`
      });
      await incident.save();
    }

    res.json(updatedNode);
  } catch (error) {
    console.error('Error updating Why-Why node:', error);
    res.status(500).json({ error: 'Failed to update Why-Why node: ' + error.message });
  }
};

// 4. Add an evidence item to a Why-Why node
exports.addWhyNodeEvidence = async (req, res) => {
  try {
    const { id, nodeId } = req.params;
    if (!validateObjectId(id) || !validateObjectId(nodeId)) {
      return res.status(400).json({ error: 'Invalid incident or node ID' });
    }

    const node = await WhyWhyNode.findOne({ _id: nodeId, incidentId: id });
    if (!node) {
      return res.status(404).json({ error: 'Why-Why node not found' });
    }

    const title = String(req.body.title || '').trim();
    const fileUrl = String(req.body.fileUrl || '').trim();
    const notes = String(req.body.notes || '').trim();

    if (!title) {
      return res.status(400).json({ error: 'Evidence title/reference is required.' });
    }

    node.evidence.push({
      title,
      fileUrl,
      notes,
      addedBy: req.body.addedBy || req.user?.name || 'CFT Investigator',
      addedAt: new Date()
    });

    const saved = await node.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error('Error adding node evidence:', error);
    res.status(500).json({ error: 'Failed to add evidence to Why-Why node: ' + error.message });
  }
};

// 5. Remove an evidence item from a Why-Why node
exports.removeWhyNodeEvidence = async (req, res) => {
  try {
    const { id, nodeId, evidenceId } = req.params;
    if (!validateObjectId(id) || !validateObjectId(nodeId) || !validateObjectId(evidenceId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const node = await WhyWhyNode.findOne({ _id: nodeId, incidentId: id });
    if (!node) {
      return res.status(404).json({ error: 'Why-Why node not found' });
    }

    node.evidence = node.evidence.filter((ev) => String(ev._id) !== String(evidenceId));
    const saved = await node.save();
    res.json(saved);
  } catch (error) {
    console.error('Error removing node evidence:', error);
    res.status(500).json({ error: 'Failed to remove evidence from Why-Why node: ' + error.message });
  }
};

// 6. Delete a Why-Why node and its entire descendant subtree (excluding root Problem Anchor)
exports.deleteWhyWhyNode = async (req, res) => {
  try {
    const { id, nodeId } = req.params;
    if (!validateObjectId(id) || !validateObjectId(nodeId)) {
      return res.status(400).json({ error: 'Invalid incident or node ID' });
    }

    const incident = await Incident.findById(id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const targetNode = await WhyWhyNode.findOne({ _id: nodeId, incidentId: incident._id });
    if (!targetNode) {
      return res.status(404).json({ error: 'Why-Why node not found' });
    }

    if (!targetNode.parentId || targetNode.whyLevel === 0) {
      return res.status(400).json({ error: 'The Problem Anchor (Level 0) cannot be deleted. You can edit its statement instead.' });
    }

    const allNodes = await WhyWhyNode.find({ incidentId: incident._id }, { _id: 1, parentId: 1 });
    const childrenByParent = new Map();
    allNodes.forEach((n) => {
      if (n.parentId) {
        const key = String(n.parentId);
        if (!childrenByParent.has(key)) childrenByParent.set(key, []);
        childrenByParent.get(key).push(String(n._id));
      }
    });

    const idsToDelete = [];
    const queue = [String(targetNode._id)];
    const visited = new Set();

    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);
      idsToDelete.push(current);

      const children = childrenByParent.get(current) || [];
      children.forEach((childId) => {
        if (!visited.has(childId)) queue.push(childId);
      });
    }

    await WhyWhyNode.deleteMany({ _id: { $in: idsToDelete }, incidentId: incident._id });

    const actor = req.user?.name || incident.cft?.leader?.name || 'CFT Investigator';
    incident.auditTrail.push({
      action: 'Why-Why Branch Removed',
      actor,
      timestamp: new Date(),
      details: `Removed Why Level ${targetNode.whyLevel} ("${targetNode.statement.slice(0, 60)}") and ${idsToDelete.length - 1} child node(s).`
    });
    await incident.save();

    res.json({
      message: 'Why-Why node and descendant branches deleted.',
      deletedIds: idsToDelete
    });
  } catch (error) {
    console.error('Error deleting Why-Why node:', error);
    res.status(500).json({ error: 'Failed to delete Why-Why node: ' + error.message });
  }
};
