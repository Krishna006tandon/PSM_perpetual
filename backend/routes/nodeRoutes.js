const express = require('express');
const router = express.Router();
const Node = require('../models/Node');
const auth = require('../middleware/auth');
const checkStudyAccess = require('../middleware/checkStudyAccess');

// Apply auth middleware
router.use(auth);

// Apply checkStudyAccess middleware to routes targeting a specific study
router.use('/:studyId', checkStudyAccess);

// GET all nodes for a specific study
router.get('/:studyId', async (req, res) => {
  try {
    const nodes = await Node.find({ companyCode: req.user.companyCode, studyId: req.params.studyId }).sort({ order: 1 });
    res.json(nodes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST a new node row (empty or with initial data for copy)
router.post('/:studyId', async (req, res) => {
  try {
    // Find highest order to append at the end
    const lastNode = await Node.findOne({ companyCode: req.user.companyCode, studyId: req.params.studyId }).sort({ order: -1 });
    const newOrder = lastNode ? lastNode.order + 1 : 1;

    const newNode = new Node({ companyCode: req.user.companyCode, studyId: req.params.studyId,
      order: newOrder,
      ...req.body
    });

    const savedNode = await newNode.save();
    res.status(201).json(savedNode);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT to reorder nodes in bulk
router.put('/reorder', async (req, res) => {
  try {
    const { nodes } = req.body; // Array of { id, order }
    
    // Process bulk updates
    const updatePromises = nodes.map(node => 
      Node.findByIdAndUpdate(node.id, { order: node.order })
    );
    
    await Promise.all(updatePromises);
    res.json({ message: 'Reordered successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT to update a specific node (auto-save on cell edit)
router.put('/:id', async (req, res) => {
  try {
    const updatedNode = await Node.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    
    if (!updatedNode) {
      return res.status(404).json({ message: 'Node not found' });
    }
    
    res.json(updatedNode);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE a specific node row
router.delete('/:id', async (req, res) => {
  try {
    const deletedNode = await Node.findByIdAndDelete(req.params.id);
    if (!deletedNode) {
      return res.status(404).json({ message: 'Node not found' });
    }
    res.json({ message: 'Node deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
