import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import PHAStartMenu from './pages/PHAStartMenu';
import StudyOverview from './pages/StudyOverview';
import TeamMembers from './pages/TeamMembers';
import StudyDocuments from './pages/StudyDocuments';
import NodeRegistry from './pages/NodeRegistry';
import DeviationRegistry from './pages/DeviationRegistry';
import CauseRegistry from './pages/CauseRegistry';
import PHAWorksheet from './pages/PHAWorksheet';
import SafeguardRegistry from './pages/SafeguardRegistry';
import RecommendationRegistry from './pages/RecommendationRegistry';
import RiskRegistry from './pages/RiskRegistry';
import ChecklistRegistry from './pages/ChecklistRegistry';
import ActionTrackingRegistry from './pages/ActionTrackingRegistry';
import LOPAWorksheet from './pages/LOPAWorksheet';
import EquipmentRegistry from './pages/EquipmentRegistry';

import Auth from './components/Auth';

function App() {
  const [theme, setTheme] = useState('light');
  const [currentView, setCurrentView] = useState('dashboard');
  const [activeStudy, setActiveStudy] = useState(null);
  const [studyTab, setStudyTab] = useState('overview'); // New state for study tabs
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleStudyOpened = (study) => {
    setActiveStudy(study);
    setStudyTab('overview');
    setCurrentView('study');
  };

  const handlePhaClick = () => {
    if (isAuthenticated) {
      setCurrentView('pha');
    } else {
      setShowAuth(true);
    }
  };

  const handleAuthSuccess = (token) => {
    setIsAuthenticated(true);
    setShowAuth(false);
    setCurrentView('pha');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setCurrentView('dashboard');
  };

  const renderContent = () => {
    if (showAuth) {
      return <Auth onAuthSuccess={handleAuthSuccess} onCancel={() => setShowAuth(false)} />;
    }

    if (currentView === 'study') {
      const handleStudyNav = (tab) => {
        if (tab === 'pha') {
          setCurrentView('pha');
        } else {
          setStudyTab(tab);
        }
      };

      if (studyTab === 'overview') {
        return (
          <StudyOverview 
            study={activeStudy} 
            onBack={() => handleStudyNav('pha')}
            onNavigate={handleStudyNav}
            theme={theme}
            toggleTheme={toggleTheme}
            onUpdate={setActiveStudy}
          />
        );
      }

      if (studyTab === 'team') {
        return (
          <TeamMembers 
            study={activeStudy} 
            onBack={() => handleStudyNav('pha')}
            onNavigate={handleStudyNav}
            theme={theme}
            toggleTheme={toggleTheme}
          />
        );
      }

      if (studyTab === 'documents') {
        return (
          <StudyDocuments 
            study={activeStudy} 
            onBack={() => handleStudyNav('pha')}
            onNavigate={handleStudyNav}
            theme={theme}
            toggleTheme={toggleTheme}
          />
        );
      }

      if (studyTab === 'nodes-registry') {
        return (
          <NodeRegistry 
            study={activeStudy} 
            onBack={() => handleStudyNav('pha')}
            onNavigate={handleStudyNav}
            theme={theme}
            toggleTheme={toggleTheme}
          />
        );
      }

      if (studyTab === 'deviations-registry') {
        return (
          <DeviationRegistry 
            study={activeStudy} 
            onBack={() => handleStudyNav('pha')}
            onNavigate={handleStudyNav}
            theme={theme}
            toggleTheme={toggleTheme}
          />
        );
      }

      if (studyTab === 'equipment-details') {
        return (
          <EquipmentRegistry 
            study={activeStudy} 
            onBack={() => handleStudyNav('pha')}
            onNavigate={handleStudyNav}
            theme={theme}
            toggleTheme={toggleTheme}
          />
        );
      }

      if (studyTab === 'causes-registry') {
        return (
          <CauseRegistry 
            study={activeStudy} 
            onBack={() => handleStudyNav('pha')}
            onNavigate={handleStudyNav}
            theme={theme}
            toggleTheme={toggleTheme}
          />
        );
      }

      if (studyTab === 'pha-worksheets') {
        return (
          <PHAWorksheet 
            study={activeStudy} 
            onBack={() => handleStudyNav('pha')}
            onNavigate={handleStudyNav}
            theme={theme}
            toggleTheme={toggleTheme}
          />
        );
      }

      if (studyTab === 'safeguards') {
        return (
          <SafeguardRegistry 
            study={activeStudy} 
            onBack={() => handleStudyNav('pha')}
            onNavigate={handleStudyNav}
            theme={theme}
            toggleTheme={toggleTheme}
          />
        );
      }

      if (studyTab === 'recommendations') {
        return (
          <RecommendationRegistry 
            study={activeStudy} 
            onBack={() => handleStudyNav('pha')}
            onNavigate={handleStudyNav}
            theme={theme}
            toggleTheme={toggleTheme}
          />
        );
      }

      if (studyTab === 'lopa') {
        return (
          <LOPAWorksheet 
            study={activeStudy} 
            onBack={() => handleStudyNav('pha')}
            onNavigate={handleStudyNav}
            theme={theme}
            toggleTheme={toggleTheme}
          />
        );
      }

      if (studyTab === 'risk-criteria') {
        return (
          <RiskRegistry 
            study={activeStudy} 
            onBack={() => handleStudyNav('pha')}
            onNavigate={handleStudyNav}
            theme={theme}
            toggleTheme={toggleTheme}
          />
        );
      }

      if (studyTab === 'check-lists') {
        return (
          <ChecklistRegistry 
            study={activeStudy} 
            onBack={() => handleStudyNav('pha')}
            onNavigate={handleStudyNav}
            theme={theme}
            toggleTheme={toggleTheme}
          />
        );
      }

      if (studyTab === 'action-tracking') {
        return (
          <ActionTrackingRegistry 
            study={activeStudy} 
            onBack={() => handleStudyNav('pha')}
            onNavigate={handleStudyNav}
            theme={theme}
            toggleTheme={toggleTheme}
          />
        );
      }
    }

    if (currentView === 'pha') {
      return (
        <div style={{ padding: '20px', width: '100%', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <button 
              onClick={() => setCurrentView('dashboard')}
              style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--divider)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-primary)' }}
            >
              &larr; Back to Dashboard
            </button>
            <button 
              onClick={handleLogout}
              style={{ padding: '8px 16px', backgroundColor: 'var(--error)', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'white' }}
            >
              Logout
            </button>
          </div>
          <PHAStartMenu onStudyCreated={handleStudyOpened} onLogout={handleLogout} />
        </div>
      );
    }

    return (
      <main className="main-content">
        <header className="header">
          <div>
            <h1>Dashboard Overview</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
              Welcome back! Here is your latest summary.
            </p>
          </div>
          <button className="theme-toggle" onClick={toggleTheme}>
            Toggle to {theme === 'dark' ? 'Light' : 'Dark'} Mode
          </button>
        </header>

        <div className="card-container">
          <div className="card" onClick={handlePhaClick} style={{ cursor: 'pointer' }}>
            <h3>PHA</h3>
            <p>Process Hazard Analysis</p>
            <span className="status-badge status-info">View Details</span>
          </div>
        </div>
      </main>
    );
  };

  return (
    <div className="app-container">
      {/* Formal Sidebar with new Navigation logic */}
      <Sidebar activeView={currentView} onNavigate={setCurrentView} />
      {renderContent()}
    </div>
  );
}

export default App;
