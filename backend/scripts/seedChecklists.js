require('dotenv').config();
const mongoose = require('mongoose');
const ChecklistTemplate = require('../models/ChecklistTemplate');

const MONGODB_URI = process.env.MONGODB_URI;

const templates = [
  {
    departmentId: 'generalHazid',
    departmentName: 'General Hazid',
    questions: [
      { questionText: 'Is the hazard clearly identified?' },
      { questionText: 'Are all risks mitigated?' },
      { questionText: 'Is the new process well documented?' },
      { questionText: 'Are emergency procedures updated?' },
      { questionText: 'Are the training requirements fulfilled?' }
    ]
  },
  {
    departmentId: 'operationsEngineer',
    departmentName: 'Operations Engineer',
    questions: [
      { questionText: 'Have operation procedures been updated?' },
      { questionText: 'Is the operator trained?' },
      { questionText: 'Are there changes to alarm limits?' },
      { questionText: 'Is operation sequence altered?' },
      { questionText: 'Are bypasses required?' }
    ]
  },
  {
    departmentId: 'safeOperatingLimit',
    departmentName: 'Safe Operating Limit',
    questions: [
      { questionText: 'Are safe operating limits changed?' },
      { questionText: 'Are interlocks modified?' },
      { questionText: 'Is safety instrumented system affected?' },
      { questionText: 'Are pressure relief valves reviewed?' },
      { questionText: 'Is dispersion modeling required?' }
    ]
  },
  {
    departmentId: 'processTechnology',
    departmentName: 'Process Technology',
    questions: [
      { questionText: 'Is process chemistry changed?' },
      { questionText: 'Are heat/mass balances updated?' },
      { questionText: 'Is P&ID updated?' },
      { questionText: 'Is equipment sizing adequate?' },
      { questionText: 'Are utility requirements changed?' }
    ]
  },
  {
    departmentId: 'controlInstrumentation',
    departmentName: 'Control & Instrumentation',
    questions: [
      { questionText: 'Are control loops updated?' },
      { questionText: 'Are new instruments added?' },
      { questionText: 'Is logic diagram updated?' },
      { questionText: 'Are graphic displays updated?' },
      { questionText: 'Is SIL classification affected?' }
    ]
  },
  {
    departmentId: 'electrical',
    departmentName: 'Electrical',
    questions: [
      { questionText: 'Is single line diagram updated?' },
      { questionText: 'Is hazardous area classification changed?' },
      { questionText: 'Is load list updated?' },
      { questionText: 'Are protection settings revised?' },
      { questionText: 'Is earthing system affected?' }
    ]
  },
  {
    departmentId: 'inspection',
    departmentName: 'Inspection',
    questions: [
      { questionText: 'Is material of construction changed?' },
      { questionText: 'Are corrosion loops updated?' },
      { questionText: 'Is NDT required?' },
      { questionText: 'Are statutory approvals needed?' },
      { questionText: 'Is inspection plan updated?' }
    ]
  },
  {
    departmentId: 'warehouseStore',
    departmentName: 'Warehouse / Store',
    questions: [
      { questionText: 'Are new spares required?' },
      { questionText: 'Are obsolete spares identified?' },
      { questionText: 'Is storage requirement changed?' },
      { questionText: 'Are handling procedures updated?' },
      { questionText: 'Is inventory level revised?' }
    ]
  },
  {
    departmentId: 'hse',
    departmentName: 'HSE',
    questions: [
      { questionText: 'Is environmental impact assessment done?' },
      { questionText: 'Are occupational health hazards identified?' },
      { questionText: 'Is fire protection system adequate?' },
      { questionText: 'Are PPE requirements changed?' },
      { questionText: 'Is waste disposal method revised?' }
    ]
  }
];

async function seed() {
  try {
    if (!MONGODB_URI) {
        throw new Error("MONGODB_URI is not defined in the environment variables.");
    }
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    for (const t of templates) {
      await ChecklistTemplate.findOneAndUpdate(
        { departmentId: t.departmentId },
        t,
        { upsert: true, new: true }
      );
      console.log(`Upserted template for ${t.departmentName}`);
    }

    console.log('Checklist Templates seeded successfully.');
  } catch (error) {
    console.error('Error seeding checklist templates:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

seed();
