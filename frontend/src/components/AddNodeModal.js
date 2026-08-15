import React, { useState } from 'react';
import './AddNodeModal.css';

const AddNodeModal = ({ studyId, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    description: '',
    intention: '',
    boundary: '',
    eqCount: ''
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
      const response = await fetch(`http://localhost:5000/api/nodes/${studyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const newNode = await response.json();
        onSuccess(newNode);
      } else {
        console.error('Failed to add node');
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error adding node:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Add New Node</h3>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            
            <div className="form-group">
              <label>
                Description <span className="required-mark">*</span>
              </label>
              <input data-gramm="false" spellcheck="false" 
                type="text" 
                name="description" 
                value={formData.description} 
                onChange={handleChange} 
                required 
                placeholder="Enter node description..."
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>
                Intention <span className="required-mark">*</span>
              </label>
              <input data-gramm="false" spellcheck="false" 
                type="text" 
                name="intention" 
                value={formData.intention} 
                onChange={handleChange} 
                required 
                placeholder="Enter intention..."
              />
            </div>

            <div className="form-group">
              <label>Boundary</label>
              <input data-gramm="false" spellcheck="false" 
                type="text" 
                name="boundary" 
                value={formData.boundary} 
                onChange={handleChange} 
                placeholder="Enter boundary..."
              />
            </div>

            <div className="form-group">
              <label>EQ. Count</label>
              <input data-gramm="false" spellcheck="false" 
                type="number" 
                name="eqCount" 
                value={formData.eqCount} 
                onChange={handleChange} 
                placeholder="Enter equipment count..."
              />
            </div>

          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Node'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddNodeModal;
