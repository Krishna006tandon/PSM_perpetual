import React, { useState } from 'react';
import './AddNodeModal.css'; // Reusing standard modal styles

const AddCauseModal = ({ studyId, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    description: '',
    categoryType: '',
    equipment: '',
    instrument: '',
    sourceReference: '',
    comments: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/causes/${studyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const newCause = await response.json();
        onSuccess(newCause);
      } else {
        const errorData = await response.json();
        console.error('Failed to add cause:', errorData);
        alert(`Failed to add cause: ${errorData.message}`);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error adding cause:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>ADD CAUSE</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>
              Cause Description <span className="required-mark">*</span>
            </label>
            <input 
              type="text" 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              required 
              placeholder="Enter cause description..."
              autoFocus
            />
          </div>
          
          <div className="form-group">
            <label>Category / Type</label>
            <input 
              type="text" 
              name="categoryType" 
              value={formData.categoryType} 
              onChange={handleChange} 
              placeholder="Enter category or type..."
            />
          </div>

          <div className="form-group">
            <label>Equipment</label>
            <input 
              type="text" 
              name="equipment" 
              value={formData.equipment} 
              onChange={handleChange} 
              placeholder="Enter equipment..."
            />
          </div>

          <div className="form-group">
            <label>Instrument</label>
            <input 
              type="text" 
              name="instrument" 
              value={formData.instrument} 
              onChange={handleChange} 
              placeholder="Enter instrument..."
            />
          </div>
          
          <div className="form-group">
            <label>Source / Reference</label>
            <input 
              type="text" 
              name="sourceReference" 
              value={formData.sourceReference} 
              onChange={handleChange} 
              placeholder="Enter source or reference..."
            />
          </div>
          
          <div className="form-group">
            <label>Comments</label>
            <input 
              type="text" 
              name="comments" 
              value={formData.comments} 
              onChange={handleChange} 
              placeholder="Enter any comments..."
            />
          </div>
          
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={isSubmitting}>
              CANCEL
            </button>
            <button type="submit" className="btn-submit" disabled={isSubmitting}>
              {isSubmitting ? 'ADDING...' : 'ADD CAUSE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCauseModal;
