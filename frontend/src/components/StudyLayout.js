import React from 'react';
import './StudyLayout.css';

const StudyLayout = ({ activeTab, onBack, onNavigate, theme, toggleTheme, children }) => {
  return (
    <div className="study-layout-container">
      {/* Top Navigation */}
      <div className="study-top-nav">
        <div className={`nav-item ${activeTab === 'study-data' || activeTab === 'overview' || activeTab === 'team' ? 'active' : ''}`}>STUDY DATA</div>
        <div className="nav-item">NODES</div>
        <div className="nav-item">DEVIATIONS</div>
        <div className="nav-item">CAUSES WORKSHEET</div>
        <div className="nav-item">PHA WORKSHEETS</div>
        <div className="nav-item">SAFEGUARDS</div>
        <div className="nav-item">RECOMMENDATIONS</div>
        <div className="nav-item">CHECK LISTS</div>
        <div className="nav-item">RISK CRITERIA</div>
        <div className="nav-item">ACTION TRACKING</div>
      </div>

      <div className="study-main-layout">
        {/* Sidebar */}
        <div className="study-sidebar">
          <div className="sidebar-header" onClick={onBack} style={{cursor: 'pointer'}}>
            <span>&lt;</span> STUDY DATA
          </div>
          <div 
            className={`sidebar-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => onNavigate('overview')}
          >
            <span className="icon">📄</span> Overview
          </div>
          <div 
            className={`sidebar-item ${activeTab === 'team' ? 'active' : ''}`}
            onClick={() => onNavigate('team')}
          >
            <span className="icon">👥</span> Team Members
          </div>
          <div 
            className={`sidebar-item ${activeTab === 'documents' ? 'active' : ''}`}
            onClick={() => onNavigate('documents')}
          >
            <span className="icon">📁</span> Documents
          </div>
        </div>

        {/* Content */}
        <div className="study-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default StudyLayout;
