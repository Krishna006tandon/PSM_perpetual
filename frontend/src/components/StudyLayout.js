import React from 'react';
import './StudyLayout.css';

const StudyLayout = ({ activeTab, onBack, onNavigate, theme, toggleTheme, children }) => {
  return (
    <div className="study-layout-container">
      {/* Top Navigation */}
      <div className="study-top-nav">
        <div 
          className={`nav-item ${activeTab === 'study-data' || activeTab === 'overview' || activeTab === 'team' || activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => onNavigate('overview')}
        >
          STUDY DATA
        </div>
        <div 
          className={`nav-item ${activeTab === 'nodes' || activeTab === 'nodes-registry' ? 'active' : ''}`}
          onClick={() => onNavigate('nodes-registry')}
        >
          NODES
        </div>
        <div 
          className={`nav-item ${activeTab === 'deviations' || activeTab === 'deviations-registry' ? 'active' : ''}`}
          onClick={() => onNavigate('deviations-registry')}
        >
          DEVIATIONS
        </div>
        <div 
          className={`nav-item ${activeTab === 'causes' || activeTab === 'causes-registry' ? 'active' : ''}`}
          onClick={() => onNavigate('causes-registry')}
        >
          CAUSES WORKSHEET
        </div>
        <div 
          className={`nav-item ${activeTab === 'pha-worksheets' ? 'active' : ''}`}
          onClick={() => onNavigate('pha-worksheets')}
        >
          PHA WORKSHEETS
        </div>
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
            <span>&lt;</span> {
              activeTab === 'nodes' || activeTab === 'nodes-registry' ? 'NODES' :
              activeTab === 'deviations' || activeTab === 'deviations-registry' ? 'DEVIATIONS' :
              activeTab === 'causes-registry' ? 'CAUSES WORKSHEET' :
              activeTab === 'pha-worksheets' ? 'PHA WORKSHEETS' :
              'STUDY DATA'
            }
          </div>
          
          {(activeTab === 'study-data' || activeTab === 'overview' || activeTab === 'team' || activeTab === 'documents') && (
            <>
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
            </>
          )}

          {(activeTab === 'nodes' || activeTab === 'nodes-registry') && (
            <>
              <div 
                className={`sidebar-item ${activeTab === 'nodes-registry' ? 'active' : ''}`}
                onClick={() => onNavigate('nodes-registry')}
              >
                <span className="icon">🏢</span> Node Registry
              </div>
            </>
          )}

          {(activeTab === 'deviations' || activeTab === 'deviations-registry') && (
            <>
              <div 
                className={`sidebar-item ${activeTab === 'deviations-registry' ? 'active' : ''}`}
                onClick={() => onNavigate('deviations-registry')}
              >
                <span className="icon">⛙</span> Deviations Registry
              </div>
            </>
          )}

          {(activeTab === 'causes' || activeTab === 'causes-registry') && (
            <>
              <div 
                className={`sidebar-item ${activeTab === 'causes-registry' ? 'active' : ''}`}
                onClick={() => onNavigate('causes-registry')}
              >
                <span className="icon">🔗</span> Causes Worksheet
              </div>
            </>
          )}

          {(activeTab === 'pha-worksheets') && (
            <>
              <div 
                className="sidebar-item active"
                onClick={() => onNavigate('pha-worksheets')}
              >
                <span className="icon">📋</span> Analysis Sheet
              </div>
              <div className="sidebar-item">
                <span className="icon">📉</span> Risk Summary
              </div>
            </>
          )}
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
