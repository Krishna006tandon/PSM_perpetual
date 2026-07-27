const mongoose = require('mongoose');

// Blueprint for a single question/item in the checklist
const checklistItemSchema = new mongoose.Schema({
    question: { 
        type: String, 
        required: true 
    },
    status: {
        type: String,
        // enum strictly limits the allowed values in the database
        enum: ['Yes', 'No', 'NA', 'Pending'], 
        default: 'Pending'
    },
    remarks: { 
        type: String // Useful if a user selects 'No' and needs to explain why
    } 
});

// Blueprint for the overall MOC Checklist document
const mocChecklistSchema = new mongoose.Schema({
    mocTicketId: {
        type: String, // Later this will be linked to the actual MOC Ticket ID
        required: true
    },
    items: [checklistItemSchema], // An array of the questions defined above
    isFrozen: { 
        type: Boolean, 
        default: false // This will be used for your Interlock/Freeze logic
    }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt dates

module.exports = mongoose.model('Checklist', mocChecklistSchema);