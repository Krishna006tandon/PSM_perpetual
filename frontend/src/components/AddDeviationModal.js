import React, { useState } from 'react';
import './AddNodeModal.css'; // Reusing standard modal styles

const AddDeviationModal = ({ studyId, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    guidewords: '',
    parameter: '',
    processFlowMaterial: '',
    locationFrom: '',
    locationTo: ''
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
      const response = await fetch(`https://api.perpetualsolutions.co.in/api/deviations/${studyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const newDeviation = await response.json();
        onSuccess(newDeviation);
      } else {
        const errorData = await response.json();
        console.error('Failed to add deviation:', errorData);
        alert(`Failed to add deviation: ${errorData.message}`);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error adding deviation:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Add New Deviation</h3>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            
            <div className="form-group">
              <label>
                Guidewords <span className="required-mark">*</span>
              </label>
              <input data-gramm="false" spellcheck="false" 
                type="text" 
                name="guidewords" 
                value={formData.guidewords} 
                onChange={handleChange} 
                required 
                placeholder="Enter guidewords..."
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>
                Parameter <span className="required-mark">*</span>
              </label>
              <input data-gramm="false" spellcheck="false" 
                type="text" 
                name="parameter" 
                value={formData.parameter} 
                onChange={handleChange} 
                required 
                placeholder="Enter parameter..."
              />
            </div>

            <div className="form-group">
              <label>Process Flow / Material</label>
              <input data-gramm="false" spellcheck="false" 
                type="text" 
                name="processFlowMaterial" 
                value={formData.processFlowMaterial} 
                onChange={handleChange} 
                placeholder="Enter process flow/material..."
              />
            </div>

            <div className="form-group">
              <label>Equipment</label>
              <input data-gramm="false" spellcheck="false" 
                type="text" 
                name="locationFrom" 
                value={formData.locationFrom} 
                onChange={handleChange} 
                placeholder="Enter equipment..."
              />
            </div>
            
            <div className="form-group">
              <label>Instrument</label>
              <input data-gramm="false" spellcheck="false" 
                type="text" 
                name="locationTo" 
                value={formData.locationTo} 
                onChange={handleChange} 
                placeholder="Enter instrument..."
              />
            </div>

          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Deviation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDeviationModal;
