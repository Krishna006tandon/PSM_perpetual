import React, { useState, useEffect, useRef } from 'react';
import './ReportSettingsModal.css';

const AutoResizeTextarea = ({ value, onChange, ...props }) => {
  const textareaRef = useRef(null);
  
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      style={{ overflow: 'hidden', resize: 'none', minHeight: '40px' }}
      {...props}
    />
  );
};

const ReportSettingsModal = ({ study, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  
  const [general, setGeneral] = useState({
    scope: study?.scope || '',
    objective: study?.objective || '',
    executiveSummary: study?.executiveSummary || ''
  });
  
  const [assumptions, setAssumptions] = useState(study?.assumptions || []);
  const [sessions, setSessions] = useState([]);
  const [revisions, setRevisions] = useState([]);

  useEffect(() => {
    const fetchExtraData = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${process.env.REACT_APP_API_URL || 'https://api.perpetualsolutions.co.in'}/api/studies/${study._id}/full-export-data`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setSessions(data.sessions || []);
        setRevisions(data.revisions || []);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchExtraData();
  }, [study._id]);

  const handleGeneralChange = (e) => {
    const { name, value } = e.target;
    setGeneral(prev => ({ ...prev, [name]: value }));
  };

  // Generic array handlers
  const handleArrayChange = (setter, index, field, value) => {
    setter(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleAddRow = (setter, emptyObj) => {
    setter(prev => [...prev, emptyObj]);
  };

  const handleRemoveRow = (setter, index) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Save general info and assumptions (part of Study model)
      await fetch(`${process.env.REACT_APP_API_URL || 'https://api.perpetualsolutions.co.in'}/api/studies/${study._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          scope: general.scope,
          objective: general.objective,
          executiveSummary: general.executiveSummary,
          assumptions: assumptions
        })
      });

      // Save Sessions
      await fetch(`${process.env.REACT_APP_API_URL || 'https://api.perpetualsolutions.co.in'}/api/studies/${study._id}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ sessions })
      });

      // Save Revisions
      await fetch(`${process.env.REACT_APP_API_URL || 'https://api.perpetualsolutions.co.in'}/api/studies/${study._id}/revisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ revisions })
      });

      onSave();
      onClose();
    } catch (err) {
      alert('Error saving report settings');
    }
  };

  if (loading) return <div className="modal-overlay"><div className="modal-content report-settings-modal"><p>Loading...</p></div></div>;

  return (
    <div className="modal-overlay">
      <div className="modal-content report-settings-modal">
        <div className="modal-header">
          <h2>📄 Report Settings</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="report-settings-body">
          <div className="settings-sidebar">
            <button className={activeTab === 'general' ? 'active' : ''} onClick={() => setActiveTab('general')}>General Info</button>
            <button className={activeTab === 'assumptions' ? 'active' : ''} onClick={() => setActiveTab('assumptions')}>Assumptions</button>
            <button className={activeTab === 'sessions' ? 'active' : ''} onClick={() => setActiveTab('sessions')}>Sessions</button>
            <button className={activeTab === 'revisions' ? 'active' : ''} onClick={() => setActiveTab('revisions')}>Revisions</button>
          </div>
          
          <div className="settings-content">
            {activeTab === 'general' && (
              <div className="settings-form">
                <div className="form-group">
                  <label>Scope</label>
                  <textarea name="scope" value={general.scope} onChange={handleGeneralChange} rows="3" />
                </div>
                <div className="form-group">
                  <label>Objective</label>
                  <textarea name="objective" value={general.objective} onChange={handleGeneralChange} rows="3" />
                </div>
                <div className="form-group">
                  <label>Executive Summary</label>
                  <textarea name="executiveSummary" value={general.executiveSummary} onChange={handleGeneralChange} rows="5" />
                </div>
              </div>
            )}
            
            {activeTab === 'assumptions' && (
              <div className="settings-table-container">
                <table className="settings-table">
                  <thead><tr><th>Assumption</th><th>Valid? (Y/N)</th><th>Comments</th><th></th></tr></thead>
                  <tbody>
                    {assumptions.map((a, i) => (
                      <tr key={i}>
                        <td><AutoResizeTextarea value={a.assumption} onChange={(e) => handleArrayChange(setAssumptions, i, 'assumption', e.target.value)} /></td>
                        <td style={{width:'80px'}}><input value={a.valid} onChange={(e) => handleArrayChange(setAssumptions, i, 'valid', e.target.value)} /></td>
                        <td><AutoResizeTextarea value={a.comments} onChange={(e) => handleArrayChange(setAssumptions, i, 'comments', e.target.value)} /></td>
                        <td><button onClick={() => handleRemoveRow(setAssumptions, i)} className="btn-delete-row">❌</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button onClick={() => handleAddRow(setAssumptions, { assumption: '', valid: 'Y', comments: '' })} className="btn-add-row">+ Add Assumption</button>
              </div>
            )}
            
            {activeTab === 'sessions' && (
              <div className="settings-table-container">
                <table className="settings-table">
                  <thead><tr><th>Date</th><th>Duration</th><th>Description</th><th>Places Used</th><th></th></tr></thead>
                  <tbody>
                    {sessions.map((s, i) => (
                      <tr key={i}>
                        <td style={{width:'100px'}}><input value={s.date} onChange={(e) => handleArrayChange(setSessions, i, 'date', e.target.value)} /></td>
                        <td style={{width:'80px'}}><input value={s.duration} onChange={(e) => handleArrayChange(setSessions, i, 'duration', e.target.value)} /></td>
                        <td><AutoResizeTextarea value={s.description} onChange={(e) => handleArrayChange(setSessions, i, 'description', e.target.value)} /></td>
                        <td><AutoResizeTextarea value={s.placesUsed} onChange={(e) => handleArrayChange(setSessions, i, 'placesUsed', e.target.value)} /></td>
                        <td><button onClick={() => handleRemoveRow(setSessions, i)} className="btn-delete-row">❌</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button onClick={() => handleAddRow(setSessions, { date: '', duration: '', description: '', placesUsed: '' })} className="btn-add-row">+ Add Session</button>
              </div>
            )}
            
            {activeTab === 'revisions' && (
              <div className="settings-table-container">
                <table className="settings-table">
                  <thead><tr><th>Rev</th><th>Dates</th><th>Changes Made</th><th>By / Rev / Appr</th><th></th></tr></thead>
                  <tbody>
                    {revisions.map((r, i) => (
                      <tr key={i}>
                        <td style={{width:'50px'}}><input value={r.revision} onChange={(e) => handleArrayChange(setRevisions, i, 'revision', e.target.value)} /></td>
                        <td style={{width:'120px'}}>
                          <input placeholder="Start" value={r.startDate} onChange={(e) => handleArrayChange(setRevisions, i, 'startDate', e.target.value)} style={{marginBottom:'4px'}}/>
                          <input placeholder="End" value={r.endDate} onChange={(e) => handleArrayChange(setRevisions, i, 'endDate', e.target.value)} />
                        </td>
                        <td><AutoResizeTextarea value={r.changesMade} onChange={(e) => handleArrayChange(setRevisions, i, 'changesMade', e.target.value)} /></td>
                        <td style={{width:'120px'}}>
                          <input placeholder="Chg By" value={r.changedBy} onChange={(e) => handleArrayChange(setRevisions, i, 'changedBy', e.target.value)} style={{marginBottom:'4px'}}/>
                          <input placeholder="Rev By" value={r.reviewBy} onChange={(e) => handleArrayChange(setRevisions, i, 'reviewBy', e.target.value)} style={{marginBottom:'4px'}}/>
                          <input placeholder="Appr By" value={r.approvedBy} onChange={(e) => handleArrayChange(setRevisions, i, 'approvedBy', e.target.value)} />
                        </td>
                        <td><button onClick={() => handleRemoveRow(setRevisions, i)} className="btn-delete-row">❌</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button onClick={() => handleAddRow(setRevisions, { revision: '', startDate: '', endDate: '', changesMade: '', changedBy: '', reviewBy: '', approvedBy: '' })} className="btn-add-row">+ Add Revision</button>
              </div>
            )}
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save Settings</button>
        </div>
      </div>
    </div>
  );
};

export default ReportSettingsModal;
