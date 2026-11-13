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
import MomWorksheet from './pages/MomWorksheet';
import MocDashboard from './pages/MocDashboard';
import ResetPassword from './pages/ResetPassword';
import RecommendationsHub from './pages/RecommendationsHub';
import BowTieAnalysis from './pages/BowTieAnalysis';
import Settings from './pages/Settings';
import IncidentDashboard from './pages/IncidentDashboard';
import SystemStabilizer from './components/SystemStabilizer';
import GlobalSpellChecker from './components/GlobalSpellChecker';

import Auth from './components/Auth';

import { getApiUrl } from './utils/apiConfig';

const API_URL = getApiUrl();

function App() {
  const [theme, setTheme] = useState('light');
  const [currentView, setCurrentView] = useState('dashboard');
  const [activeStudy, setActiveStudy] = useState(null);
  const [studyTab, setStudyTab] = useState('overview'); // New state for study tabs
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [showAuth, setShowAuth] = useState(false);
  const [checkoutPackage, setCheckoutPackage] = useState(null);
  const [isTrialMode, setIsTrialMode] = useState(false);
  const [trialSettings, setTrialSettings] = useState(null);

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
          const res = await fetch(`${API_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          if (res.ok) {
            const data = await res.json();
            setCurrentUser(data);
            if (data.features) {
              localStorage.setItem('userFeatures', JSON.stringify(data.features));
            }
          }
        } catch (e) {
          console.error(e);
        }
      };
      fetchUser();
    }
  }, [isAuthenticated]);
  
  // Feature access check (PHA, MOC, LOPA, BOWTIE)
  const hasFeature = (feat) => {
    if (!currentUser) {
      try {
        const stored = JSON.parse(localStorage.getItem('userFeatures'));
        if (Array.isArray(stored)) return stored.includes(feat);
      } catch(e) {}
      return true; // Default before user data loads
    }
    if (currentUser.role === 'SuperAdmin') return true;
    if (feat === 'INCIDENT' || feat === 'INCIDENTS') return true; // Enable Incident Investigation platform
    const feats = Array.isArray(currentUser.features) && currentUser.features.length > 0
      ? currentUser.features
      : ['PHA', 'MOC', 'LOPA', 'BOWTIE', 'INCIDENT'];
    return feats.includes(feat);
  };

  // The RBAC lock: Only Admins, Scribes, and Project Managers can edit
  const userRole = currentUser?.role?.toLowerCase() || '';
  const canEditGlobal = ['admin', 'scribe', 'project manager'].includes(userRole);
  const canEditPHA = canEditGlobal;


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
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userFeatures');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentView('dashboard');
  };

  const renderContent = () => {
    if (showAuth) {
      return (
        <Auth 
          onAuthSuccess={handleAuthSuccess} 
          onCancel={() => { setShowAuth(false); setCheckoutPackage(null); setIsTrialMode(false); }} 
          isCheckoutRegistration={!!checkoutPackage}
          selectedPackage={checkoutPackage}
          isTrialRegistration={isTrialMode}
          trialSettings={trialSettings}
        />
      );
    }

    if (currentView === 'study') {
      const handleStudyNav = (tab) => {
        if (tab === 'pha') {
          setCurrentView('pha');
        } else if (tab === 'settings') {
          setCurrentView('settings');
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
            onUpdate={setActiveStudy}
          />
        );
      }

      if (studyTab === 'mom') {
        return (
          <MomWorksheet 
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
        if (!hasFeature('PHA')) {
          return (
            <div style={{ padding: '60px', textAlign: 'center', background: 'var(--bg-paper)', borderRadius: '12px', margin: '40px auto', maxWidth: '600px', border: '1px solid var(--divider)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔒</div>
              <h2 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>PHA Worksheets Locked</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                Process Hazard Analysis worksheets are not included in your current subscription package.
              </p>
              <button 
                onClick={() => handleStudyNav('overview')} 
                style={{ padding: '10px 20px', background: 'var(--primary-main)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                &larr; Back to Study Overview
              </button>
            </div>
          );
        }
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
        if (!hasFeature('LOPA')) {
          return (
            <div style={{ padding: '60px', textAlign: 'center', background: 'var(--bg-paper)', borderRadius: '12px', margin: '40px auto', maxWidth: '600px', border: '1px solid var(--divider)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔒</div>
              <h2 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>LOPA Module Locked</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                Layer of Protection Analysis (LOPA) is not included in your current subscription package.
              </p>
              <button 
                onClick={() => handleStudyNav('overview')} 
                style={{ padding: '10px 20px', background: 'var(--primary-main)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                &larr; Back to Study Overview
              </button>
            </div>
          );
        }
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

      if (studyTab === 'bowtie') {
        if (!hasFeature('BOWTIE')) {
          return (
            <div style={{ padding: '60px', textAlign: 'center', background: 'var(--bg-paper)', borderRadius: '12px', margin: '40px auto', maxWidth: '600px', border: '1px solid var(--divider)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔒</div>
              <h2 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>BowTie Analysis Locked</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                BowTie Analysis is not included in your current subscription package.
              </p>
              <button 
                onClick={() => handleStudyNav('overview')} 
                style={{ padding: '10px 20px', background: 'var(--primary-main)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                &larr; Back to Study Overview
              </button>
            </div>
          );
        }
        return (
          <BowTieAnalysis 
            study={activeStudy} 
            canEdit={canEditPHA} 
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
      if (!hasFeature('PHA')) {
        return (
          <div style={{ padding: '60px', textAlign: 'center', background: 'var(--bg-paper)', borderRadius: '12px', margin: '40px auto', maxWidth: '600px', border: '1px solid var(--divider)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔒</div>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>PHA Module Locked</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Process Hazard Analysis is not included in your current subscription package.
            </p>
            <button 
              onClick={() => setCurrentView('dashboard')} 
              style={{ padding: '10px 20px', background: 'var(--primary-main)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              &larr; Back to Dashboard
            </button>
          </div>
        );
      }
      return (
        <div style={{ padding: '20px', width: '100%', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <button 
              onClick={() => setCurrentView('dashboard')}
              style={{ padding: '10px 20px', backgroundColor: 'var(--primary-main, #1e3a8a)', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'white', fontWeight: 'bold', fontSize: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
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
          <PHAStartMenu onStudyCreated={handleStudyOpened} onLogout={handleLogout} canEdit={canEditGlobal} />
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <LandingPage 
          onLogin={() => { setCheckoutPackage(null); setIsTrialMode(false); setShowAuth(true); }} 
          onCheckoutSuccess={(pkg) => { setCheckoutPackage(pkg); setIsTrialMode(false); setShowAuth(true); }}
          onStartTrial={(settings, pkg) => { setTrialSettings(settings); setCheckoutPackage(pkg || null); setIsTrialMode(true); setShowAuth(true); }}
        />
      );
    }
    
    if (currentUser?.role === 'SuperAdmin') {
      return <PlatformOwnerDashboard onLogout={handleLogout} />;
    }

    // Lock screen if Free Trial has expired
    if (currentUser?.isTrial && (currentUser?.isTrialExpired || currentUser?.subscriptionStatus === 'expired')) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ background: 'white', borderRadius: '16px', maxWidth: '580px', width: '100%', padding: '48px 36px', boxShadow: '0 20px 40px rgba(0,0,0,0.08)', border: '1px solid #cbd5e1' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', margin: '0 auto 20px auto', border: '2px solid #fecaca' }}>
              ⏰
            </div>
            <h1 style={{ fontSize: '1.9rem', color: '#0f172a', margin: '0 0 12px 0', fontWeight: '800' }}>
              Free Trial Expired
            </h1>
            <p style={{ color: '#475569', fontSize: '1.02rem', lineHeight: '1.6', marginBottom: '24px' }}>
              Your <strong>{currentUser.trialDays || 14}-day free trial</strong> of Perpetual PSM ended on {currentUser.trialEndDate ? new Date(currentUser.trialEndDate).toLocaleDateString('en-GB') : 'recently'}. All your existing studies, risk data, and worksheets remain securely saved.
            </p>
            <div style={{ background: '#f0fdf4', padding: '16px 20px', borderRadius: '10px', border: '1px solid #bbf7d0', marginBottom: '28px', textAlign: 'left', fontSize: '0.92rem', color: '#166534' }}>
              <strong style={{ display: 'block', marginBottom: '6px' }}>💡 Need more time or ready to upgrade?</strong>
              • Contact platform owner or administrator to extend your trial duration.<br/>
              • Or subscribe to a Perpetual or Annual license for continuous access.
            </div>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => window.location.reload()}
                style={{ padding: '12px 26px', background: 'linear-gradient(135deg, #00a896 0%, #028090 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,168,150,0.3)' }}
              >
                🔄 Refresh / Check Status
              </button>
              <button
                onClick={handleLogout}
                style={{ padding: '12px 24px', background: 'transparent', color: '#dc2626', border: '1px solid #dc2626', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer' }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      );
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

    if (currentView === 'moc') {
      if (!hasFeature('MOC')) {
        return (
          <div style={{ padding: '60px', textAlign: 'center', background: 'var(--bg-paper)', borderRadius: '12px', margin: '40px auto', maxWidth: '600px', border: '1px solid var(--divider)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔒</div>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>MOC Module Locked</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Management of Change (MOC) is not included in your current subscription package.
            </p>
            <button 
              onClick={() => setCurrentView('dashboard')} 
              style={{ padding: '10px 20px', background: 'var(--primary-main)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              &larr; Back to Dashboard
            </button>
          </div>
        );
      }
      return <MocDashboard />;
    }

    if (currentView === 'incidents' || currentView === 'incident') {
      return (
        <IncidentDashboard 
          currentUser={currentUser} 
          onBack={() => setCurrentView('dashboard')} 
        />
      );
    }

    if (currentView === 'settings') {
      return (
        <Settings 
          theme={theme}
          toggleTheme={toggleTheme}
          currentUser={currentUser}
          hasActiveStudy={!!activeStudy}
          activeStudy={activeStudy}
          onNavigate={(view) => {
            if (view === 'lopa' && activeStudy) {
              setStudyTab('lopa');
              setCurrentView('study');
            } else if (view === 'pha-worksheets' && activeStudy) {
              setStudyTab('pha-worksheets');
              setCurrentView('study');
            } else if (view === 'study' && activeStudy) {
              setCurrentView('study');
            } else {
              setCurrentView(view);
            }
          }}
        />
      );
    }

    if (currentView === 'recommendations' || currentView === 'recommendations-pha' || currentView === 'recommendations-moc') {
      const initialTab = currentView === 'recommendations-moc' ? 'moc' : 'pha';
      return (
        <RecommendationsHub 
          initialTab={initialTab}
          onOpenStudy={handleStudyOpened}
          onOpenMoc={() => setCurrentView('moc')}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      );
    }

    return (
      <main className="main-content">
        <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Dashboard Overview</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
              Welcome back{currentUser?.name ? `, ${currentUser.name}` : ''}! Here is your latest summary.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button className="theme-toggle" onClick={toggleTheme}>
              Toggle to {theme === 'dark' ? 'Light' : 'Dark'} Mode
            </button>
            <button 
              onClick={handleLogout}
              style={{
                padding: '10px 20px',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
              title="Logout from account"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </header>

        <div className="card-container">
          {hasFeature('PHA') && (
            <div className="card" onClick={handlePhaClick} style={{ cursor: 'pointer', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
              <h3>PHA</h3>
              <p>Process Hazard Analysis</p>
              <span className="status-badge status-info">View Details</span>
            </div>
          )}
          {hasFeature('MOC') && (
            <div className="card" onClick={() => setCurrentView('moc')} style={{ cursor: 'pointer', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
              <h3>MOC</h3>
              <p>Management of Change</p>
              <span className="status-badge status-info">View Details</span>
            </div>
          )}
          {(hasFeature('PHA') || hasFeature('MOC')) && (
            <div className="card" onClick={() => setCurrentView('recommendations')} style={{ cursor: 'pointer', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
              <h3>Recommendations</h3>
              <p>Safety & MOC Action Items</p>
              <span className="status-badge status-info">View Details</span>
            </div>
          )}
          <div className="card" onClick={() => setCurrentView('settings')} style={{ cursor: 'pointer', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
            <h3>Settings</h3>
            <p>Preferences & Column Visibility</p>
            <span className="status-badge status-info">Configure</span>
          </div>

          {/* Incident Investigation Card */}
          <div 
            className="card" 
            onClick={() => setCurrentView('incidents')}
            style={{ 
              cursor: 'pointer', 
              padding: '32px', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              minHeight: '200px',
              position: 'relative',
              border: '1.5px solid var(--primary-light, #2563eb)',
              background: theme === 'dark' ? 'rgba(37, 99, 235, 0.05)' : '#f8faff',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.08)'
            }}
          >
            <div style={{ position: 'absolute', top: '14px', right: '14px' }}>
              <span style={{ 
                background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', 
                color: '#ffffff', 
                padding: '4px 10px', 
                borderRadius: '12px', 
                fontSize: '0.72rem', 
                fontWeight: '700',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)'
              }}>
                API 754 & OSHA
              </span>
            </div>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🛡️</div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.35rem', fontWeight: '700' }}>Incident Investigation</h3>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '14px', fontSize: '0.9rem' }}>
              FIR Logging, 7-Day SLA, CFT Triage & Why-Why RCA
            </p>
            <span 
              className="status-badge" 
              style={{ 
                background: '#eff6ff', 
                color: '#1d4ed8', 
                border: '1px solid #bfdbfe',
                fontWeight: '700',
                padding: '5px 14px',
                borderRadius: '14px',
                fontSize: '0.8rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              Open Workspace →
            </span>
          </div>
        </div>
      </main>
    );
  };

  if (window.location.pathname.startsWith('/reset-password')) {
    return <ResetPassword />;
  }

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Sticky Free Trial Banner if active */}
      {isAuthenticated && currentUser?.isTrial && !currentUser?.isTrialExpired && (
        <div style={{
          width: '100%',
          background: 'linear-gradient(90deg, #00a896 0%, #028090 100%)',
          color: 'white',
          padding: '8px 24px',
          fontSize: '0.88rem',
          fontWeight: '600',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          zIndex: 9999
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.1rem' }}>⚡</span>
            <span>
              <strong>Free Trial Active:</strong> {currentUser.trialDaysRemaining} day{currentUser.trialDaysRemaining === 1 ? '' : 's'} remaining (Expires on {new Date(currentUser.trialEndDate).toLocaleDateString('en-GB')}).
            </span>
          </div>
          <span style={{ background: 'rgba(255,255,255,0.22)', padding: '3px 12px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 'bold' }}>
            Full Modules Unlocked
          </span>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, width: '100%' }}>
        {/* Formal Sidebar with new Navigation logic */}
        {isAuthenticated && currentView !== 'study' && currentUser?.role !== 'SuperAdmin' && window.location.pathname !== '/owner' && (
          <Sidebar activeView={currentView} onNavigate={setCurrentView} userFeatures={currentUser?.features} onLogout={handleLogout} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {renderContent()}
        </div>
      </div>

      {/* System & Plant Health Stabilizer (Visible across all dashboards and worksheets after login) */}
      {isAuthenticated && !showAuth && (
        <SystemStabilizer currentUser={currentUser} activeStudy={activeStudy} />
      )}
      <GlobalSpellChecker />
    </div>
  );
}

export default App;
