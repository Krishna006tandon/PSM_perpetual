import React from 'react';
import './StudyOverview.css';
import StudyLayout from '../components/StudyLayout';

const StudyOverview = ({ study, onBack, onNavigate, theme, toggleTheme }) => {
  if (!study) return null;

  return (
    <StudyLayout activeTab="overview" onBack={onBack} onNavigate={onNavigate} theme={theme} toggleTheme={toggleTheme}>
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
          <span className="detail-value">{study.studyName}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">COORDINATOR</span>
          <span className="detail-value">{study.studyCoordinator}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">CONTACT</span>
          <span className="detail-value">{study.contactInfo}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">FACILITY</span>
          <span className="detail-value">{study.facility}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">OWNER</span>
          <span className="detail-value">{study.owner}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">PLANT / UNIT</span>
          <span className="detail-value">{study.plantUnit}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">PHA TYPE</span>
          <span className="detail-value dropdown-style">{study.phaType}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">STUDY STATUS</span>
          <span className="detail-value dropdown-style">{study.studyStatus}</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon nodes-icon">🏢</div>
          <div className="stat-info">
            <span className="stat-value">1</span>
            <span className="stat-label">NODES</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon scenarios-icon">📝</div>
          <div className="stat-info">
            <span className="stat-value">0</span>
            <span className="stat-label">SCENARIOS</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon drawings-icon">📦</div>
          <div className="stat-info">
            <span className="stat-value">0</span>
            <span className="stat-label">DRAWINGS</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon recs-icon">📋</div>
          <div className="stat-info">
            <span className="stat-value">0</span>
            <span className="stat-label">RECS</span>
          </div>
        </div>
      </div>
    </StudyLayout>
  );
};

export default StudyOverview;
