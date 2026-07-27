const ChecklistTemplate = require('../models/ChecklistTemplate');

exports.getAllTemplates = async (req, res) => {
  try {
    const templates = await ChecklistTemplate.find();
    res.status(200).json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTemplateByDept = async (req, res) => {
  try {
    const template = await ChecklistTemplate.findOne({ departmentId: req.params.deptId });
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.status(200).json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.upsertTemplate = async (req, res) => {
  try {
    const { departmentName, questions, stageApplicable } = req.body;
    const template = await ChecklistTemplate.findOneAndUpdate(
      { departmentId: req.params.deptId },
      { departmentName, questions, stageApplicable },
      { new: true, upsert: true }
    );
    res.status(200).json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.addQuestion = async (req, res) => {
  try {
    const { questionText, isRequired, addedBy } = req.body;
    const template = await ChecklistTemplate.findOneAndUpdate(
      { departmentId: req.params.deptId },
      { $push: { questions: { questionText, isRequired, addedBy } } },
      { new: true }
    );
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.status(200).json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.removeQuestion = async (req, res) => {
  try {
    const index = parseInt(req.params.index, 10);
    const template = await ChecklistTemplate.findOne({ departmentId: req.params.deptId });
    if (!template) return res.status(404).json({ error: 'Template not found' });

    if (index >= 0 && index < template.questions.length) {
      template.questions.splice(index, 1);
      await template.save();
      return res.status(200).json(template);
    } else {
      return res.status(400).json({ error: 'Invalid question index' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
