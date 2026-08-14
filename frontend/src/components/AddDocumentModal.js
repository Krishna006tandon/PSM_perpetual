import React, { useState } from 'react';
import './AddDocumentModal.css';

const AddDocumentModal = ({ studyId, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    drawingId: '',
    revision: '',
    documentType: '',
    description: '',
    hyperlink: ''
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://api.perpetualsolutions.co.in/api/documents/${studyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        onSuccess(data);
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to add document:', error);
      alert('Failed to add document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="document-modal">
        <div className="document-modal-header">
          <div className="document-modal-title">
            <span className="icon">📄</span> ADD DOCUMENT
          </div>
          <button className="document-modal-close" onClick={onClose}>&times;</button>
        </div>

        <form className="document-modal-body" onSubmit={handleSubmit}>
          <div className="form-group-row">
            <label>DRAWING ID <span className="required">*</span></label>
            <input data-gramm="false" spellcheck="false" 
              type="text" 
              name="drawingId" 
              value={formData.drawingId} 
              onChange={handleChange} 
              required 
            />
          </div>
          <div className="form-group-row">
            <label>REV.</label>
            <input data-gramm="false" spellcheck="false" 
              type="text" 
              name="revision" 
              value={formData.revision} 
              onChange={handleChange} 
            />
          </div>
          <div className="form-group-row">
            <label>DOCUMENT TYPE <span className="required">*</span></label>
            <select name="documentType" value={formData.documentType} onChange={handleChange} required>
              <option value="" disabled>Select Type</option>
              <option value="P&ID">P&ID</option>
              <option value="PFD">PFD</option>
              <option value="Layout">Layout</option>
              <option value="Datasheet">Datasheet</option>
              <option value="Cause & Effect">Cause & Effect</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="form-group-row">
            <label>DESCRIPTION <span className="required">*</span></label>
            <input data-gramm="false" spellcheck="false" 
              type="text" 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              required 
            />
          </div>
          <div className="form-group-row">
            <label>HYPERLINK / URI</label>
            <input data-gramm="false" spellcheck="false" 
              type="text" 
              name="hyperlink" 
              value={formData.hyperlink} 
              onChange={handleChange} 
              placeholder="https://..."
            />
          </div>

          <div className="document-modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>CANCEL</button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? 'SAVING...' : 'SAVE DOCUMENT'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDocumentModal;
