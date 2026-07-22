import React from 'react';
import './StudyOverview.css';
import StudyLayout from '../components/StudyLayout';

const StudyOverview = ({ study, onBack, onNavigate, theme, toggleTheme }) => {
  if (!study) return null;

  return (
    <StudyLayout activeTab="overview" onBack={onBack} onNavigate={onNavigate} theme={theme} toggleTheme={toggleTheme}>
      <div className="overview-container">
        <div className="content-header">
          <h2>STUDY OVERVIEW</h2>
          <div className="export-buttons">
            <button className="theme-toggle" onClick={toggleTheme} style={{ padding: '10px 20px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', border: 'none', cursor: 'pointer', backgroundColor: 'var(--primary-main)', color: 'white', letterSpacing: '0.5px' }}>
              Toggle to {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
            <button className="btn-export csv">EXPORT CSV</button>
            <button className="btn-export json">FULL EXPORT (JSON)</button>
          </div>
        </div>

        <div className="study-details-card">
          <div className="detail-row">
            <span className="detail-label">STUDY NAME</span>
            <span className="detail-value dropdown-style">{study.studyName}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">PROJECT NAME</span>
            <span className="detail-value">{study.projectName}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">CLIENT NAME</span>
            <span className="detail-value dropdown-style">{study.clientName || 'N/A'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">FACILITATOR</span>
            <span className="detail-value dropdown-style">{study.facilitator || 'N/A'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">SITE / LOCATION</span>
            <span className="detail-value dropdown-style">{study.siteLocation || 'N/A'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">PLANT / UNIT</span>
            <span className="detail-value dropdown-style">{study.plantUnit || 'N/A'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">BUSINESS UNIT</span>
            <span className="detail-value dropdown-style">{study.businessUnit || 'N/A'}</span>
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
