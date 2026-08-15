import React, { useState, useEffect } from 'react';
import './StudyOverview.css';
import StudyLayout from '../components/StudyLayout';

const StudyOverview = ({ study, onBack, onNavigate, theme, toggleTheme, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (study) {
      setFormData({
        studyName: study.studyName || '',
        projectName: study.projectName || '',
        clientName: study.clientName || '',
        facilitator: study.facilitator || '',
        siteLocation: study.siteLocation || '',
        plantUnit: study.plantUnit || '',
        businessUnit: study.businessUnit || ''
      });
    }
  }, [study]);

  if (!study) return null;

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://api.perpetualsolutions.co.in/api/studies/${study._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const updatedStudy = await response.json();
        setIsEditing(false);
        if (onUpdate) {
          onUpdate(updatedStudy);
        }
      } else {
        console.error('Failed to update study');
        alert('Failed to save changes.');
      }
    } catch (error) {
      console.error('Error saving study:', error);
      alert('Error saving changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      studyName: study.studyName || '',
      projectName: study.projectName || '',
      clientName: study.clientName || '',
      facilitator: study.facilitator || '',
      siteLocation: study.siteLocation || '',
      plantUnit: study.plantUnit || '',
      businessUnit: study.businessUnit || ''
    });
    setIsEditing(false);
  };

  return (
    <StudyLayout activeTab="overview" onBack={onBack} onNavigate={onNavigate} theme={theme} toggleTheme={toggleTheme}>
      <div className="overview-container">
        <div className="content-header">
          <h2>STUDY OVERVIEW</h2>
          <div className="export-buttons">
            <button className="theme-toggle" onClick={toggleTheme} style={{ padding: '10px 20px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', border: 'none', cursor: 'pointer', backgroundColor: 'var(--bg-paper)', color: 'var(--text-primary)', border: '1px solid var(--divider)' }}>
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>
            <button 
              className="btn-export save" 
              onClick={handleSave} 
              disabled={isSaving}
              style={{
                backgroundColor: isSaving ? '#94a3b8' : '#0ea5e9',
                cursor: isSaving ? 'wait' : 'pointer'
              }}
            >
              {isSaving ? 'SAVING...' : 'SAVE CHANGES'}
            </button>
            <button className="btn-export csv">EXPORT CSV</button>
            <button className="btn-export json">FULL EXPORT</button>
          </div>
        </div>

        <div className="study-details-card">


          <div className="detail-row">
            <span className="detail-label">STUDY NAME</span>
            <input data-gramm="false" spellcheck="false" 
              type="text" 
              name="studyName" 
              className="detail-value-input" 
              value={formData.studyName} 
              onChange={handleInputChange} 
              placeholder="Study Name"
            />
          </div>
          <div className="detail-row">
            <span className="detail-label">PROJECT NAME</span>
            <input data-gramm="false" spellcheck="false" 
              type="text" 
              name="projectName" 
              className="detail-value-input" 
              value={formData.projectName} 
              onChange={handleInputChange} 
              placeholder="Project Name"
            />
          </div>
          <div className="detail-row">
            <span className="detail-label">CLIENT NAME</span>
            <input data-gramm="false" spellcheck="false" 
              type="text" 
              name="clientName" 
              className="detail-value-input" 
              value={formData.clientName} 
              onChange={handleInputChange} 
              placeholder="Client Name"
            />
          </div>
          <div className="detail-row">
            <span className="detail-label">FACILITATOR</span>
            <input data-gramm="false" spellcheck="false" 
              type="text" 
              name="facilitator" 
              className="detail-value-input" 
              value={formData.facilitator} 
              onChange={handleInputChange} 
              placeholder="Facilitator"
            />
          </div>
          <div className="detail-row">
            <span className="detail-label">SITE / LOCATION</span>
            <input data-gramm="false" spellcheck="false" 
              type="text" 
              name="siteLocation" 
              className="detail-value-input" 
              value={formData.siteLocation} 
              onChange={handleInputChange} 
              placeholder="Site / Location"
            />
          </div>
          <div className="detail-row">
            <span className="detail-label">PLANT / UNIT</span>
            <input data-gramm="false" spellcheck="false" 
              type="text" 
              name="plantUnit" 
              className="detail-value-input" 
              value={formData.plantUnit} 
              onChange={handleInputChange} 
              placeholder="Plant / Unit"
            />
          </div>
          <div className="detail-row">
            <span className="detail-label">BUSINESS UNIT</span>
            <input data-gramm="false" spellcheck="false" 
              type="text" 
              name="businessUnit" 
              className="detail-value-input" 
              value={formData.businessUnit} 
              onChange={handleInputChange} 
              placeholder="Business Unit"
            />
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon nodes-icon">📋</div>
            <div className="stat-info">
              <span className="stat-value">12</span>
              <span className="stat-label">TOTAL NODES</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon scenarios-icon">⚡</div>
            <div className="stat-info">
              <span className="stat-value">45</span>
              <span className="stat-label">TOTAL SCENARIOS</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon recs-icon">🎯</div>
            <div className="stat-info">
              <span className="stat-value">8</span>
              <span className="stat-label">RECOMMENDATIONS</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon drawings-icon">📐</div>
            <div className="stat-info">
              <span className="stat-value">3</span>
              <span className="stat-label">DRAWINGS</span>
            </div>
          </div>
        </div>
      </div>
    </StudyLayout>
  );
};

export default StudyOverview;
