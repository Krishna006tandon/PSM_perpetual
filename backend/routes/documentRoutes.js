const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const StudyDocument = require('../models/StudyDocument');
const auth = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '..', 'uploads', 'documents');
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Apply auth middleware
router.use(auth);

// GET all documents for a specific study
router.get('/:studyId', async (req, res) => {
  try {
    const docs = await StudyDocument.find({ studyId: req.params.studyId }).sort({ order: 1 });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST a new document row (empty or with initial data)
router.post('/:studyId', async (req, res) => {
  try {
    // Find highest order to append at the end
    const lastDoc = await StudyDocument.findOne({ studyId: req.params.studyId }).sort({ order: -1 });
    const newOrder = lastDoc ? lastDoc.order + 1 : 1;

    const newDoc = new StudyDocument({
      studyId: req.params.studyId,
      order: newOrder,
      ...req.body
    });

    const savedDoc = await newDoc.save();
    res.status(201).json(savedDoc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT to reorder documents in bulk
router.put('/reorder', async (req, res) => {
  try {
    const { documents } = req.body; // Array of { id, order }
    
    // Process bulk updates
    const updatePromises = documents.map(doc => 
      StudyDocument.findByIdAndUpdate(doc.id, { order: doc.order })
    );
    
    await Promise.all(updatePromises);
    res.json({ message: 'Reordered successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST to upload a file to a specific document
router.post('/:id/upload', upload.single('attachment'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const document = await StudyDocument.findByIdAndUpdate(
      req.params.id,
      {
        attachmentPath: `/uploads/documents/${req.file.filename}`,
        originalFileName: req.file.originalname
      },
      { new: true }
    );

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.json(document);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT to update a specific document (auto-save on cell edit)
router.put('/:id', async (req, res) => {
  try {
    const updatedDoc = await StudyDocument.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    
    if (!updatedDoc) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    res.json(updatedDoc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE a specific document row
router.delete('/:id', async (req, res) => {
  try {
    const deletedDoc = await StudyDocument.findByIdAndDelete(req.params.id);
    if (!deletedDoc) {
      return res.status(404).json({ message: 'Document not found' });
    }
    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
