const Checklist = require('../models/Checklist');

// Function to handle the submission of a checklist
exports.submitChecklist = async (req, res) => {
    try {
        // We expect the frontend to send the MOC Ticket ID and an array of items (answers)
        const { mocTicketId, items } = req.body;

        // --- INTERLOCK LOGIC (The "Freeze" Rule from the MoM) ---
        // We use the JavaScript .some() array method to check if AT LEAST ONE item has a status of 'No'
        const hasNoAnswer = items.some(item => item.status === 'No');
        
        // If hasNoAnswer is true, isFrozen becomes true. Otherwise, it stays false.
        const isFrozen = hasNoAnswer;

        // Create a new checklist document in MongoDB based on our Model
        const newChecklist = new Checklist({
            mocTicketId: mocTicketId,
            items: items,
            isFrozen: isFrozen
        });

        // --- SIMULATED FIX ---
        // Comment out the real database save until we have the .env file
        // const savedChecklist = await newChecklist.save();
        
        // Simulate a successful save with a fake MongoDB ID
        const savedChecklist = {
            mocTicketId: newChecklist.mocTicketId,
            items: newChecklist.items,
            isFrozen: newChecklist.isFrozen,
            _id: "fake_simulated_id_999"
        };
        // ---------------------

        // Send a response back to the frontend based on the Freeze rule
        if (isFrozen) {
            res.status(200).json({ 
                message: 'Checklist processed. MOC ticket is now FROZEN due to a "No" response.', 
                data: savedChecklist 
            });
        } else {
            res.status(200).json({ 
                message: 'Checklist processed successfully. MOC ticket cleared to promote.', 
                data: savedChecklist 
            });
        }

    } catch (error) {
        // If anything goes wrong, send an error message to the frontend
        console.error("Error saving checklist:", error);
        res.status(500).json({ message: 'Server error while processing checklist', error: error.message });
    }
};