import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import PHAStartMenu from './pages/PHAStartMenu';
import PlatformOwnerDashboard from './pages/PlatformOwnerDashboard';
import LandingPage from './pages/LandingPage';
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
  const [checkoutPackage, setCheckoutPackage] = useState(null);
  useEffect(() => {
    if (window.location.pathname === '/owner' && !isAuthenticated) {
      setShowAuth(true);
    }
  }, [isAuthenticated]);

  const [currentUser, setCurrentUser] = useState(null);
  
  useEffect(() => {
    if (isAuthenticated) {
      const fetchUser = async () => {
        try {
          const res = await fetch('http://localhost:5000/api/auth/me', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          if (res.ok) {
            const data = await res.json();
            setCurrentUser(data);
          }
        } catch (e) {
          console.error(e);
        }
      };
      fetchUser();
    }
  }, [isAuthenticated]);
  
  // The RBAC lock: Only Admins and Scribes can edit
  const canEditGlobal = currentUser?.role === 'Admin';
  const canEditPHA = currentUser?.role === 'Admin' || currentUser?.role === 'Scribe';


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
      return (
        <Auth 
          onAuthSuccess={handleAuthSuccess} 
          onCancel={() => { setShowAuth(false); setCheckoutPackage(null); }} 
          isCheckoutRegistration={!!checkoutPackage}
          selectedPackage={checkoutPackage}
        />
      );
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
            canEdit={canEditGlobal} 
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
            canEdit={canEditGlobal} 
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
            canEdit={canEditGlobal} 
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
            canEdit={canEditPHA} 
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
            canEdit={canEditPHA} 
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
            canEdit={canEditGlobal} 
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
            canEdit={canEditPHA} 
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
            canEdit={canEditPHA} 
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
            canEdit={canEditPHA} 
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
            canEdit={canEditPHA} 
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
            canEdit={canEditGlobal} 
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
            canEdit={canEditPHA} 
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
            canEdit={canEditGlobal} 
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
            canEdit={canEditGlobal} 
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

    if (!isAuthenticated) {
      return <LandingPage onLogin={() => setShowAuth(true)} onCheckoutSuccess={(pkg) => { setCheckoutPackage(pkg); setShowAuth(true); }} />;
    }
    
    if (currentUser?.role === 'SuperAdmin') {
      return <PlatformOwnerDashboard onLogout={handleLogout} />;
    }

    if (window.location.pathname === '/owner' && currentUser?.role !== 'SuperAdmin') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8f9fa' }}>
          <h1 style={{ fontSize: '3rem', color: '#ff4d4f', marginBottom: '20px' }}>403 Access Denied</h1>
          <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '30px' }}>You do not have Platform Owner privileges to view this page.</p>
          <button 
            onClick={() => { window.location.pathname = '/'; }}
            style={{ padding: '12px 24px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Return to Dashboard
          </button>
        </div>
      );
    }

    return (
      <main className="main-content">
        <header className="header">
          <div>
            <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Dashboard Overview</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
              Welcome back! Here is your latest summary.
            </p>
          </div>
          <button className="theme-toggle" onClick={toggleTheme}>
            Toggle to {theme === 'dark' ? 'Light' : 'Dark'} Mode
          </button>
        </header>

        <div className="card-container">
          <div className="card" onClick={handlePhaClick} style={{ cursor: 'pointer', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
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
      {isAuthenticated && currentView !== 'study' && currentUser?.role !== 'SuperAdmin' && window.location.pathname !== '/owner' && (
        <Sidebar activeView={currentView} onNavigate={setCurrentView} />
      )}
      {renderContent()}
    </div>
  );
}

export default App;
