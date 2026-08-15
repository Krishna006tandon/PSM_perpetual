import React, { useState, useEffect } from 'react';
import './AddNodeModal.css';

const AddScenarioModal = ({ studyId, nodeId, initialDeviationId, initialCauseId, onClose, onSuccess }) => {
  const [deviations, setDeviations] = useState([]);
  const [causes, setCauses] = useState([]);
  
  const [formData, setFormData] = useState({
    deviationId: initialDeviationId || '',
    causeId: initialCauseId || ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const [devRes, causeRes] = await Promise.all([
          fetch(`https://api.perpetualsolutions.co.in/api/deviations/${studyId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`https://api.perpetualsolutions.co.in/api/causes/${studyId}`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        
        if (devRes.ok && causeRes.ok) {
          const devData = await devRes.json();
          const causeData = await causeRes.json();
          
          setDeviations(devData);
          setCauses(causeData);
          
          setFormData({
            deviationId: initialDeviationId || (devData.length > 0 ? devData[0]._id : ''),
            causeId: initialCauseId || (causeData.length > 0 ? causeData[0]._id : '')
          });
        }
      } catch (error) {
        console.error('Failed to fetch data for modal:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [studyId]);

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
      const response = await fetch(`https://api.perpetualsolutions.co.in/api/scenarios/${studyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nodeId,
          deviationId: formData.deviationId || null,
          causeId: formData.causeId || null
        })
      });

      if (response.ok) {
        const newScenario = await response.json();
        onSuccess(newScenario);
      } else {
        const errorData = await response.json();
        console.error('Failed to add scenario:', errorData);
        alert(`Failed to add scenario: ${errorData.message}`);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error adding scenario:', error);
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <p>Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>ADD SCENARIO</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <p style={{fontSize:'12px', color:'#64748b', marginBottom:'16px'}}>
            Select a Deviation and Cause from the existing registries to begin building a new scenario.
          </p>
          
          <div className="form-group">
            <label>Deviation <span className="required-mark">*</span></label>
            <select 
              name="deviationId" 
              value={formData.deviationId} 
              onChange={handleChange} 
              required
            >
              {deviations.length === 0 && <option value="">No deviations available</option>}
              {deviations.map(d => (
                <option key={d._id} value={d._id}>{d.deviationAuto || 'Unnamed Deviation'}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>Cause <span className="required-mark">*</span></label>
            <select 
              name="causeId" 
              value={formData.causeId} 
              onChange={handleChange} 
              required
            >
              {causes.length === 0 && <option value="">No causes available</option>}
              {causes.map(c => (
                <option key={c._id} value={c._id}>{c.description || 'Unnamed Cause'}</option>
              ))}
            </select>
          </div>
          
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={isSubmitting}>
              CANCEL
            </button>
            <button type="submit" className="btn-submit" disabled={isSubmitting}>
              {isSubmitting ? 'ADDING...' : 'ADD SCENARIO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddScenarioModal;
