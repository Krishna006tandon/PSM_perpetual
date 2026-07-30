import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChecklistModule from './components/sub-elements/ChecklistModule';
import CreateMocForm from './components/sub-elements/CreateMocForm';
import AreaHeadApproval from './components/sub-elements/AreaHeadApproval';
import ReviewGroupStage from './components/sub-elements/ReviewGroupStage';
import CostEstimationStage from './components/sub-elements/CostEstimationStage';
import SecondaryApprovalStage from './components/sub-elements/SecondaryApprovalStage';
import SiteHeadApproval from './components/sub-elements/SiteHeadApproval';
import ProjectManagerStage from './components/sub-elements/ProjectManagerStage';
import DocumentationStage from './components/sub-elements/DocumentationStage';
import ClosureStage from './components/sub-elements/ClosureStage';
import { mocService } from './api/mocService';
const WORKFLOW_STAGES = [
  "MOC Creation",           // 0
  "Area Head Approval",     // 1
  "CTS Verification",       // 2
  "CTS Head Verification",  // 3
  "Review Group",           // 4
  "Cost Estimation",        // 5
  "Secondary Approval",     // 6
  "Site Head Approval",     // 7
  "PM Assignment",          // 8
  "Revalidation & Docs",    // 9
  "Formal Closure"          // 10
];

const dashboardModules = [
  { id: 'moc', title: 'Management of Change (MOC)', isActive: true }
];

const STAGE_ROLES = {
  "Stage 1: Creation": ["Process Engineer", "Initiator"],
  "Stage 2: Area Head Approval": ["Area Head"],
  "Stage 3 & 4: CTS Verification": ["CTS Reviewer", "CTS Head"],
  "Stage 5: Review Group": ["General Hazid Reviewer", "Operations Reviewer", "SOL Reviewer", "Process Tech Reviewer", "C&I Reviewer", "Electrical Reviewer", "Inspection Reviewer", "Warehouse Reviewer", "HSE Reviewer"],
  "Stage 6: Cost Estimation": ["Cost Estimator"],
  "Stage 7: Secondary Approval": ["Area Head", "CTS Head", "Engineering Head", "HSE Head"],
  "Stage 8: Site Head Approval": ["Site Head"],
  "Stage 9: PM Assignment": ["Engineering Head", "Project Manager"],
  "Stage 10 & 11: Revalidation & Closure": ["Project Manager", "Area Owner", "Process Engineer"]
};

function App() {
  const [theme, setTheme] = useState('dark');
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [profileOpen, setProfileOpen] = useState(false);

  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [viewingStageIndex, setViewingStageIndex] = useState(0);

  // When the workflow advances, do NOT auto-jump the view — let the user navigate manually
  // (viewingStageIndex is only updated when the user clicks stage badges or Prev/Next buttons)

  const [ticketData, setTicketData] = useState(null);

  // --- MOC LIST STATE ---
  const [mocList, setMocList] = useState([]);
  const [dashboardView, setDashboardView] = useState('modules'); // 'modules' | 'mocList'
  const [mocFilter, setMocFilter] = useState('All'); // 'All' | 'Active' | 'Closed' | 'Rejected'

  // --- GLOBAL QUERY STATE ---
  const [globalQueries, setGlobalQueries] = useState([]);
  const [resolvingQueryId, setResolvingQueryId] = useState(null);
  const [resolutionText, setResolutionText] = useState("");

  const handleAddQuery = (newQuery) => {
    setGlobalQueries(prev => [
      ...prev,
      { ...newQuery, timestamp: new Date().toLocaleTimeString(), id: Date.now(), status: 'Active', resolutionMessage: '' }
    ]);
  };

  const handleResolveQuery = (id) => {
    setGlobalQueries(prev => prev.map(q => q.id === id ? { ...q, status: 'Resolved', resolutionMessage: resolutionText } : q));
    setResolvingQueryId(null);
    setResolutionText("");
  };

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authStep, setAuthStep] = useState('login');
  const [loginStage, setLoginStage] = useState("Stage 1: Creation");

  const [authData, setAuthData] = useState({
    name: 'Amit Patel', designation: 'Process Engineer', orgNumber: 'ORG-7742', contact: 'amit.patel@company.com'
  });
  const [otp, setOtp] = useState('123456');

  useEffect(() => {
    const fetchMOCs = async () => {
      try {
        const result = await mocService.getAllMOCs();
        setMocList(result || []);
      } catch (err) {
        console.error("Failed to fetch MOCs:", err);
      }
    };
    if (isAuthenticated) {
      fetchMOCs();
    }
  }, [isAuthenticated]);

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  // Profile Click Outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileOpen && !event.target.closest('#profile-menu')) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileOpen]);

  // --- IDENTIFY USER'S DOMAIN ---
  const getDomainIndex = (designation) => {
    if (designation === 'Process Engineer') return 0;
    if (designation === 'Area Head') return 1;
    if (designation === 'CTS Reviewer') return 2;
    if (designation === 'CTS Head') return 3;
    if (['General Hazid Reviewer', 'Operations Reviewer', 'SOL Reviewer', 'Process Tech Reviewer', 'C&I Reviewer', 'Electrical Reviewer', 'Inspection Reviewer', 'Warehouse Reviewer', 'HSE Reviewer'].includes(designation)) return 4;
    if (designation === 'Cost Estimator') return 5;
    if (designation === 'Engineering Head' || designation === 'HSE Head') return 6;
    if (designation === 'Site Head') return 7;
    if (designation === 'Project Manager') return 8;
    if (designation === 'Area Owner') return 9;
    return -1;
  };
  const userDomainIndex = getDomainIndex(authData.designation);

  // --- STAGE NAVIGATION HANDLERS ---
  const handlePrevious = () => {
    setViewingStageIndex(prev => Math.max(0, prev - 1));
  };
  const handleNext = () => {
    setViewingStageIndex(prev => Math.min(WORKFLOW_STAGES.length - 1, prev + 1));
  };

  const styles = {
    progressContainer: { display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '10px' },
    stageBadge: (isViewing, isActiveWorkflow, isCompleted, isUserDomain) => {
      let bg = theme === 'dark' ? '#333' : '#e0e0e0';
      let textColor = theme === 'dark' ? 'white' : '#333';

      if (isCompleted) {
        bg = '#137333'; // GREEN: Completed
        textColor = 'white';
      } else if (isActiveWorkflow) {
        bg = '#1a73e8'; // BLUE: Currently Active Stage
        textColor = 'white';
      } else if (isUserDomain) {
        bg = '#f9ab00'; // GOLD: Your Domain
        textColor = '#000';
      } else if (isViewing) {
        bg = theme === 'dark' ? '#5c3c92' : '#d0bdf4'; // PURPLE: Currently Viewing non-active
        textColor = theme === 'dark' ? 'white' : '#000';
      }

      return {
        padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap',
        backgroundColor: bg, color: textColor, cursor: 'pointer',
        border: isViewing ? (theme === 'dark' ? '2px solid #fff' : '2px solid #000') : '2px solid transparent',
        boxShadow: isViewing ? '0 0 8px rgba(0,0,0,0.4)' : 'none',
        opacity: isViewing ? 1 : 0.7,
        transition: 'all 0.2s ease'
      };
    },
    queryBox: { backgroundColor: theme === 'dark' ? '#252525' : '#f8f9fa', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: theme === 'dark' ? '1px solid #444' : '1px solid #ddd', borderLeft: '4px solid #f9ab00' },
    queryItem: { padding: '12px', backgroundColor: theme === 'dark' ? '#1e1e1e' : '#fff', borderRadius: '6px', marginBottom: '8px', border: theme === 'dark' ? '1px solid #333' : '1px solid #eee', fontSize: '14px' },
    authContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: theme === 'dark' ? '#121212' : '#f5f7fa', color: theme === 'dark' ? '#ffffff' : '#333333' },
    authCard: { backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px', border: theme === 'dark' ? '1px solid #333333' : '1px solid #eaeaea' },
    inputGroup: { display: 'flex', flexDirection: 'column', marginBottom: '16px' },
    label: { marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: theme === 'dark' ? '#aaaaaa' : '#555555' },
    input: { padding: '10px 12px', borderRadius: '6px', border: theme === 'dark' ? '1px solid #444444' : '1px solid #cccccc', backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff', color: theme === 'dark' ? '#ffffff' : '#333333', fontSize: '15px', outline: 'none' },
    select: { padding: '10px 12px', borderRadius: '6px', border: theme === 'dark' ? '1px solid #444444' : '1px solid #cccccc', backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff', color: theme === 'dark' ? '#ffffff' : '#333333', fontSize: '15px', outline: 'none', cursor: 'pointer' },
    primaryBtn: { width: '100%', padding: '12px', backgroundColor: '#1a73e8', color: 'white', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', marginTop: '10px' },
    gridContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px', marginTop: '20px' },
    dashboardCard: { backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff', color: theme === 'dark' ? '#ffffff' : '#333333', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', border: theme === 'dark' ? '1px solid #444444' : '1px solid #eaeaea', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', height: '120px', transition: 'all 0.2s ease', }
  };

  if (!isAuthenticated) {
    return (
      <div style={styles.authContainer}>
        <div style={styles.authCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ margin: 0 }}>MOC Portal Login</h2>
            <button onClick={toggleTheme} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px' }}>{theme === 'dark' ? '☀️' : '🌙'}</button>
          </div>
          {authStep === 'login' ? (
            <form onSubmit={(e) => { e.preventDefault(); setAuthStep('otp'); }}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Employee Name</label>
                <input style={styles.input} type="text" value={authData.name} onChange={(e) => setAuthData({...authData, name: e.target.value})} required />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Select Stage</label>
                <select style={styles.select} value={loginStage} onChange={(e) => {
                  setLoginStage(e.target.value);
                  setAuthData({...authData, designation: STAGE_ROLES[e.target.value][0]});
                }}>
                  {Object.keys(STAGE_ROLES).map(stage => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Select Role</label>
                <select style={styles.select} value={authData.designation} onChange={(e) => setAuthData({...authData, designation: e.target.value})}>
                  {STAGE_ROLES[loginStage].map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Organization Number</label>
                <input style={styles.input} type="text" value={authData.orgNumber} onChange={(e) => setAuthData({...authData, orgNumber: e.target.value})} required />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Email / Phone Number</label>
                <input style={styles.input} type="text" value={authData.contact} onChange={(e) => setAuthData({...authData, contact: e.target.value})} required />
              </div>

              <button type="submit" style={styles.primaryBtn}>Next</button>
            </form>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); setIsAuthenticated(true); }}>
              <p style={{ fontSize: '14px', color: theme === 'dark' ? '#aaaaaa' : '#666666', marginBottom: '20px' }}>Enter OTP below.</p>
              <div style={styles.inputGroup}><input style={{...styles.input, textAlign: 'center', letterSpacing: '4px', fontSize: '20px' }} type="text" maxLength="6" value={otp} onChange={(e) => setOtp(e.target.value)} required /></div>
              <button type="submit" style={styles.primaryBtn}>Verify & Login</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main-content">
        <header className="header">
          <div>
            <h1 style={{ margin: 0, fontSize: '24px' }}>{activeTab === 'Dashboard' ? 'Enterprise Dashboard' : activeTab === 'Analytics' ? 'Analytics Overview' : activeTab === 'Settings' ? 'Application Settings' : `MOC Workflow: ${ticketData ? ticketData.title : 'New Ticket'}`}</h1>
            <div style={{ fontSize: '13px', color: theme === 'dark' ? '#aaaaaa' : '#666666', marginTop: '4px' }}>Logged in as: <strong>{authData.name}</strong> ({authData.designation})</div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* Profile Icon Button */}
            <div id="profile-menu" style={{ position: 'relative' }}>
              <button
                onClick={() => setProfileOpen(prev => !prev)}
                style={{
                  width: '38px', height: '38px', borderRadius: '50%', border: 'none',
                  backgroundColor: '#1a73e8', color: 'white', cursor: 'pointer',
                  fontSize: '16px', fontWeight: '700', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(26,115,232,0.4)',
                }}
                title="Profile"
              >
                {authData.name.charAt(0).toUpperCase()}
              </button>

              {profileOpen && (
                <div
                  style={{
                    position: 'absolute', right: '-10px', top: '50px', zIndex: 9999,
                    backgroundColor: theme === 'dark' ? '#1a1a2e' : '#ffffff',
                    border: theme === 'dark' ? '1px solid #2a2a4a' : '1px solid #e8eaf6',
                    borderRadius: '12px', padding: '16px', width: '260px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  }}
                >
                  {/* Avatar + Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '50%',
                      backgroundColor: '#1a73e8', color: 'white', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px', fontWeight: '700', flexShrink: 0,
                    }}>
                      {authData.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: theme === 'dark' ? '#e8e8ff' : '#1a1a3e' }}>
                        {authData.name}
                      </div>
                      <div style={{ fontSize: '12px', color: theme === 'dark' ? '#7070a0' : '#999' }}>
                        {authData.designation}
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div style={{
                    backgroundColor: theme === 'dark' ? '#12122a' : '#f5f6fe',
                    borderRadius: '8px', padding: '12px',
                    border: theme === 'dark' ? '1px solid #2a2a4a' : '1px solid #e0e2f0',
                    marginBottom: '12px', fontSize: '13px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: theme === 'dark' ? '#7070a0' : '#999' }}>Employee ID</span>
                      <span style={{ fontWeight: '600', color: theme === 'dark' ? '#e8e8ff' : '#1a1a3e' }}>{authData.orgNumber}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: theme === 'dark' ? '#7070a0' : '#999' }}>Contact</span>
                      <span style={{ fontWeight: '600', color: theme === 'dark' ? '#e8e8ff' : '#1a1a3e', fontSize: '11px' }}>{authData.contact}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: theme === 'dark' ? '#7070a0' : '#999' }}>Role</span>
                      <span style={{ fontWeight: '600', color: '#1a73e8' }}>{authData.designation}</span>
                    </div>
                  </div>

                  {/* Logout */}
                  <button
                    onClick={() => { setIsAuthenticated(false); setAuthStep('login'); setActiveTab('Dashboard'); setProfileOpen(false); }}
                    style={{
                      width: '100%', padding: '10px', backgroundColor: '#dc3545',
                      color: 'white', border: 'none', borderRadius: '8px',
                      cursor: 'pointer', fontWeight: '600', fontSize: '14px',
                    }}
                  >
                    ⎋ Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="content-area" style={{ padding: '40px' }}>
        {activeTab === 'Dashboard' && (
          <div>
            {dashboardView === 'modules' ? (
              <>
                <h2 style={{ color: theme === 'dark' ? '#ffffff' : '#333333', borderBottom: theme === 'dark' ? '1px solid #444444' : '1px solid #eaeaea', paddingBottom: '8px', marginTop: '24px' }}>Available Modules</h2>
                <div style={styles.gridContainer}>
                  {dashboardModules.map((mod) => (
                    <div key={mod.id} style={{ ...styles.dashboardCard, border: mod.isActive ? '2px solid #1a73e8' : styles.dashboardCard.border }} onClick={() => mod.isActive ? setDashboardView('mocList') : null}>
                      <h3 style={{ margin: 0, color: mod.isActive ? '#1a73e8' : 'inherit', fontSize: '18px' }}>{mod.title}</h3>
                      <p style={{ margin: '8px 0 0', fontSize: '12px', color: theme === 'dark' ? '#aaa' : '#666' }}>{mocList.length} active workflow(s)</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* MOC LIST VIEW */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', marginBottom: '20px' }}>
                  <div>
                    <button onClick={() => setDashboardView('modules')} style={{ background: 'none', border: 'none', color: '#1a73e8', cursor: 'pointer', fontSize: '14px', fontWeight: '500', padding: 0 }}>← Back to Modules</button>
                    <h2 style={{ color: theme === 'dark' ? '#ffffff' : '#333333', margin: '8px 0 0' }}>Management of Change — Workflows</h2>
                  </div>
                  {authData.designation === 'Process Engineer' ? (
                    <button
                      onClick={() => {
                        setTicketData(null);
                        setCurrentStageIndex(0);
                        setViewingStageIndex(0);
                        setActiveTab('Projects');
                      }}
                      style={{
                        backgroundColor: '#1a73e8', color: 'white', border: 'none',
                        padding: '12px 24px', borderRadius: '10px', fontWeight: '600',
                        cursor: 'pointer', fontSize: '15px', boxShadow: '0 4px 12px rgba(26,115,232,0.3)',
                      }}
                    >
                      + Create New MOC
                    </button>
                  ) : (
                    <div style={{ fontSize: '12px', color: theme === 'dark' ? '#aaa' : '#666', padding: '8px 12px', backgroundColor: theme === 'dark' ? '#2a2a3a' : '#f0f0f0', borderRadius: '6px' }}>
                      Only Process Engineers can create MOCs.
                    </div>
                  )}
                </div>

                {/* Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
                  {[
                    { label: 'Total MOCs', value: mocList.length, color: '#1a73e8', filterKey: 'All' },
                    { label: 'Active', value: mocList.filter(m => m.status === 'Active').length, color: '#f9ab00', filterKey: 'Active' },
                    { label: 'Closed', value: mocList.filter(m => m.status === 'Closed').length, color: '#137333', filterKey: 'Closed' },
                    { label: 'Rejected', value: mocList.filter(m => m.status === 'Rejected').length, color: '#dc3545', filterKey: 'Rejected' },
                    { label: 'Archived', value: mocList.filter(m => m.status === 'Archived').length, color: '#6c757d', filterKey: 'Archived' },
                  ].map((stat, i) => {
                    const isSelected = mocFilter === stat.filterKey;
                    return (
                      <div key={i} onClick={() => setMocFilter(stat.filterKey)} style={{
                        backgroundColor: isSelected
                          ? (theme === 'dark' ? `${stat.color}22` : `${stat.color}15`)
                          : (theme === 'dark' ? '#1a1a2e' : '#ffffff'),
                        borderTop: `3px solid ${stat.color}`,
                        borderLeft: isSelected ? `2px solid ${stat.color}` : (theme === 'dark' ? '1px solid #2a2a4a' : '1px solid #e8eaf6'),
                        borderRight: isSelected ? `2px solid ${stat.color}` : (theme === 'dark' ? '1px solid #2a2a4a' : '1px solid #e8eaf6'),
                        borderBottom: isSelected ? `2px solid ${stat.color}` : (theme === 'dark' ? '1px solid #2a2a4a' : '1px solid #e8eaf6'),
                        borderRadius: '12px', padding: '20px', textAlign: 'center',
                        cursor: 'pointer', transition: 'all 0.2s ease',
                        transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                        boxShadow: isSelected ? `0 4px 16px ${stat.color}33` : 'none',
                      }}>
                        <div style={{ fontSize: '28px', fontWeight: '800', color: stat.color }}>{stat.value}</div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: isSelected ? stat.color : (theme === 'dark' ? '#7070a0' : '#999'), textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>{stat.label}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Active filter indicator */}
                {mocFilter !== 'All' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '13px', color: theme === 'dark' ? '#aaa' : '#666' }}>
                    <span>Filtering by: <strong style={{ color: theme === 'dark' ? '#e8e8ff' : '#1a1a3e' }}>{mocFilter}</strong></span>
                    <button onClick={() => setMocFilter('All')} style={{ background: 'none', border: '1px solid ' + (theme === 'dark' ? '#555' : '#ccc'), borderRadius: '6px', padding: '2px 10px', cursor: 'pointer', fontSize: '12px', color: theme === 'dark' ? '#aaa' : '#666' }}>✕ Clear</button>
                  </div>
                )}

                {/* MOC Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                  {/* Map over filtered mocList to display cards */}
                  {(() => {
                    const filteredList = mocFilter === 'All' ? mocList : mocList.filter(m => m.status === mocFilter);
                    return filteredList.length > 0 ? (
                      filteredList.map(moc => {
                        const stageIndex = moc.currentStageIndex || 0;
                        const isRejected = moc.status === 'Rejected';
                        const isClosed = moc.status === 'Closed';
                        const isArchived = moc.status === 'Archived';
                        const isDisabled = isRejected;
                        const statusColor = isRejected ? '#dc3545' : isClosed ? '#137333' : isArchived ? '#6c757d' : '#1a73e8';
                        const statusLabel = moc.status || 'Active';
                        const isCreator = authData.designation === 'Process Engineer';
                        const canArchive = isCreator && !isRejected && !isArchived;
                        return (
                          <div
                            key={moc.mocId || moc._id}
                            onClick={isDisabled ? undefined : async () => {
                              try {
                                const result = await mocService.getMOCById(moc.mocId || moc._id);
                                setTicketData(result);
                                setCurrentStageIndex(result.currentStageIndex || 0);
                                setViewingStageIndex(result.currentStageIndex || 0);
                                setActiveTab('Projects');
                              } catch (err) {
                                console.error("Failed to fetch MOC", err);
                                setTicketData(moc);
                                setCurrentStageIndex(moc.currentStageIndex || 0);
                                setViewingStageIndex(moc.currentStageIndex || 0);
                                setActiveTab('Projects');
                              }
                            }}
                            style={{
                              backgroundColor: isDisabled
                                ? (theme === 'dark' ? '#1a1a1a' : '#f5f5f5')
                                : isArchived
                                  ? (theme === 'dark' ? '#1a1a22' : '#f9f9fb')
                                  : (theme === 'dark' ? '#1a1a2e' : '#ffffff'),
                              border: isDisabled
                                ? (theme === 'dark' ? '1px solid #333' : '1px solid #ddd')
                                : isArchived
                                  ? (theme === 'dark' ? '1px solid #2a2a3a' : '1px solid #e0e0e0')
                                  : (theme === 'dark' ? '1px solid #2a2a4a' : '1px solid #e8eaf6'),
                              borderLeft: `4px solid ${isDisabled ? '#888' : statusColor}`,
                              borderRadius: '12px', padding: '20px',
                              cursor: isDisabled ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s ease',
                              boxShadow: isDisabled ? 'none' : '0 2px 12px rgba(0,0,0,0.08)',
                              opacity: isDisabled ? 0.5 : isArchived ? 0.7 : 1,
                              filter: isDisabled ? 'grayscale(100%)' : 'none',
                              position: 'relative',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                              <span style={{
                                padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                                backgroundColor: theme === 'dark' ? 'rgba(26,115,232,0.15)' : '#e8f0fe',
                                color: theme === 'dark' ? '#8ab4f8' : '#1a56c4',
                                border: theme === 'dark' ? '1px solid rgba(26,115,232,0.4)' : '1px solid #c5d8f8',
                              }}>
                                {moc.mocId || moc._id || 'No ID'}
                              </span>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <span style={{
                                  padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                                  backgroundColor: `${statusColor}22`,
                                  color: statusColor,
                                  border: `1px solid ${statusColor}44`,
                                }}>
                                  {statusLabel}
                                </span>
                                <span style={{
                                  padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                                  backgroundColor: 'rgba(249,171,0,0.15)', color: '#f9ab00',
                                  border: '1px solid rgba(249,171,0,0.4)',
                                }}>
                                  Stage {stageIndex + 1} / 11
                                </span>
                              </div>
                            </div>
                            <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: '700', color: theme === 'dark' ? '#e8e8ff' : '#1a1a3e' }}>
                              {moc.title || 'Untitled MOC'}
                            </h3>
                            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: theme === 'dark' ? '#7070a0' : '#999' }}>
                              <span>🏭 {moc.plant}</span>
                              <span>📋 {moc.changeType}</span>
                              <span style={{
                                padding: '1px 8px', borderRadius: '10px', fontWeight: '600',
                                backgroundColor: moc.riskLevel === 'High' ? 'rgba(220,53,69,0.15)' : moc.riskLevel === 'Medium' ? 'rgba(249,171,0,0.15)' : 'rgba(19,115,51,0.15)',
                                color: moc.riskLevel === 'High' ? '#dc3545' : moc.riskLevel === 'Medium' ? '#f9ab00' : '#137333',
                              }}>⚠ {moc.riskLevel}</span>
                            </div>
                            <div style={{ marginTop: '12px', height: '4px', backgroundColor: theme === 'dark' ? '#2a2a4a' : '#e8eaf6', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${((stageIndex + 1) / 11) * 100}%`, height: '100%', backgroundColor: isDisabled ? '#888' : isArchived ? '#6c757d' : '#1a73e8', borderRadius: '2px', transition: 'width 0.5s ease' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                              <div style={{ fontSize: '11px', color: theme === 'dark' ? '#7070a0' : '#999' }}>
                                {isRejected ? (
                                  <span style={{ color: '#dc3545', fontWeight: '600' }}>⛔ This MOC has been rejected and is no longer accessible.</span>
                                ) : isArchived ? (
                                  <span style={{ color: '#6c757d', fontWeight: '600' }}>📦 Archived — view only.</span>
                                ) : (
                                  <>Currently at: <strong style={{ color: theme === 'dark' ? '#e8e8ff' : '#1a1a3e' }}>{WORKFLOW_STAGES[stageIndex]}</strong></>
                                )}
                              </div>
                              {canArchive && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!window.confirm(`Archive MOC ${moc.mocId}? It will become view-only for everyone.`)) return;
                                    try {
                                      await mocService.archiveMOC(moc.mocId || moc._id, {
                                        actor: { name: authData.name, designation: authData.designation },
                                        comments: 'Archived by creator'
                                      });
                                      setMocList(prev => prev.map(m => (m.mocId || m._id) === (moc.mocId || moc._id) ? { ...m, status: 'Archived' } : m));
                                    } catch (err) {
                                      console.error('Failed to archive MOC', err);
                                      alert('Failed to archive MOC.');
                                    }
                                  }}
                                  style={{
                                    background: 'none', border: `1px solid ${theme === 'dark' ? '#555' : '#ccc'}`,
                                    borderRadius: '6px', padding: '3px 10px', cursor: 'pointer',
                                    fontSize: '11px', fontWeight: '600',
                                    color: theme === 'dark' ? '#aaa' : '#666',
                                    transition: 'all 0.2s ease',
                                  }}
                                  title="Archive this MOC"
                                >
                                  📦 Archive
                                </button>
                              )}
                              {isCreator && isArchived && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!window.confirm(`Unarchive MOC ${moc.mocId}? It will become active again.`)) return;
                                    try {
                                      await mocService.unarchiveMOC(moc.mocId || moc._id, {
                                        actor: { name: authData.name, designation: authData.designation },
                                        comments: 'Restored by creator'
                                      });
                                      setMocList(prev => prev.map(m => (m.mocId || m._id) === (moc.mocId || moc._id) ? { ...m, status: 'Active' } : m));
                                    } catch (err) {
                                      console.error('Failed to unarchive MOC', err);
                                      alert('Failed to unarchive MOC.');
                                    }
                                  }}
                                  style={{
                                    background: 'none', border: `1px solid ${theme === 'dark' ? '#1a73e8' : '#1a73e8'}`,
                                    borderRadius: '6px', padding: '3px 10px', cursor: 'pointer',
                                    fontSize: '11px', fontWeight: '600',
                                    color: '#1a73e8',
                                    transition: 'all 0.2s ease',
                                  }}
                                  title="Unarchive this MOC"
                                >
                                  ♻️ Unarchive
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{
                        backgroundColor: theme === 'dark' ? '#1a1a2e' : '#ffffff',
                        border: theme === 'dark' ? '2px dashed #2a2a4a' : '2px dashed #d0d4e8',
                        borderRadius: '12px', padding: '40px', textAlign: 'center',
                        color: theme === 'dark' ? '#7070a0' : '#999', gridColumn: '1 / -1',
                      }}>
                        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
                        <div style={{ fontSize: '15px', fontWeight: '600' }}>No {mocFilter !== 'All' ? mocFilter.toLowerCase() : ''} MOCs found</div>
                        {mocFilter !== 'All' && <button onClick={() => setMocFilter('All')} style={{ marginTop: '12px', background: 'none', border: '1px solid #1a73e8', borderRadius: '8px', padding: '8px 16px', color: '#1a73e8', cursor: 'pointer', fontWeight: '600' }}>Show All MOCs</button>}
                      </div>
                    );
                  })()}


                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'Projects' && (
          <div>
            {/* GLOBAL QUERY BOX */}
            <div style={styles.queryBox}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Global Query Log</h3>
              {globalQueries.length === 0 ? (
                <p style={{ margin: 0, fontSize: '14px', color: theme === 'dark' ? '#aaa' : '#666' }}>No active queries.</p>
              ) : (
                globalQueries.map(q => (
                  <div key={q.id} style={styles.queryItem}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <strong>From: {q.from} ➔ To: {q.to}</strong>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', backgroundColor: q.status === 'Resolved' ? '#137333' : '#f9ab00', color: q.status === 'Resolved' ? 'white' : '#000' }}>{q.status || 'Active'}</span>
                        <span style={{ fontSize: '12px', color: '#888' }}>{q.timestamp}</span>
                      </div>
                    </div>
                    <div style={{ marginBottom: '8px' }}>{q.description}</div>
                    
                    {q.status === 'Resolved' && q.resolutionMessage && (
                      <div style={{ marginTop: '8px', padding: '8px', backgroundColor: theme === 'dark' ? '#2c2c2c' : '#f1f1f1', borderRadius: '4px', borderLeft: '3px solid #137333', fontSize: '13px' }}>
                        <strong>Resolution:</strong> {q.resolutionMessage}
                      </div>
                    )}
                    
                    {(q.status === 'Active' || !q.status) && authData.designation === q.to && (
                      <div style={{ marginTop: '8px' }}>
                        {resolvingQueryId === q.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <textarea
                              value={resolutionText}
                              onChange={(e) => setResolutionText(e.target.value)}
                              placeholder="Type your resolution reply here..."
                              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: theme === 'dark' ? '1px solid #444' : '1px solid #ccc', backgroundColor: theme === 'dark' ? '#222' : '#fff', color: theme === 'dark' ? '#fff' : '#000', minHeight: '60px', boxSizing: 'border-box' }}
                            />
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button onClick={() => handleResolveQuery(q.id)} style={{ padding: '6px 12px', backgroundColor: '#137333', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>Submit Resolution</button>
                              <button onClick={() => { setResolvingQueryId(null); setResolutionText(""); }} style={{ padding: '6px 12px', backgroundColor: '#555', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setResolvingQueryId(q.id)} style={{ padding: '6px 12px', backgroundColor: '#1a73e8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>Resolve</button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* CLICKABLE PROGRESS TRACKER WITH LEGEND */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', fontSize: '12px', flexWrap: 'wrap', color: theme === 'dark' ? '#aaa' : '#666' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#1a73e8', borderRadius: '50%' }}></span> Active Stage</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#137333', borderRadius: '50%' }}></span> Completed Stage</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#f9ab00', borderRadius: '50%' }}></span> Your Assigned Domain</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: theme === 'dark' ? '#5c3c92' : '#d0bdf4', border: theme === 'dark' ? '2px solid #fff' : '2px solid #000', borderRadius: '50%' }}></span> Currently Viewing</div>
            </div>

            <div style={styles.progressContainer}>
              {WORKFLOW_STAGES.map((stage, idx) => (
                <div
                  key={stage}
                  onClick={() => setViewingStageIndex(idx)}
                  style={styles.stageBadge(
                    idx === viewingStageIndex,
                    idx === currentStageIndex,
                    idx < currentStageIndex,
                    idx === userDomainIndex
                  )}
                  title={idx === userDomainIndex ? "This is your assigned domain" : `Click to view ${stage}`}
                >
                  {idx + 1}. {stage}
                </div>
              ))}
            </div>

            {/* DYNAMIC STAGES RENDERED BASED ON *VIEWING* INDEX */}
            <div style={{ paddingBottom: '40px' }}>
              {viewingStageIndex === 0 ? (
                <CreateMocForm
                  theme={theme}
                  ticketData={ticketData}
                  setTicketData={setTicketData}
                  currentUser={authData}
                  onPromote={(newTicket) => {
                    if (newTicket) {
                      setMocList(prev => {
                        if (prev.find(m => (m.mocId && m.mocId === newTicket.mocId) || (m._id && m._id === newTicket._id))) return prev;
                        return [...prev, { ...newTicket, status: 'Active' }];
                      });
                    }
                    setCurrentStageIndex(1);
                  }}
                  onNext={handleNext}
                />
              ) : viewingStageIndex === 1 ? (
                <AreaHeadApproval
                  theme={theme}
                  ticketData={ticketData}
                  setTicketData={setTicketData}
                  currentUser={authData}
                  onPromote={() => {
                    setCurrentStageIndex(2);
                    setTicketData(prev => prev ? { ...prev, currentStageIndex: 2 } : prev);
                  }}
                  onAddQuery={handleAddQuery}
                  isWorkflowActive={currentStageIndex === 1}
                  isCompleted={currentStageIndex > 1}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              ) : (viewingStageIndex === 2 || viewingStageIndex === 3) ? (
                <ChecklistModule
                  theme={theme}
                  ticketData={ticketData}
                  setTicketData={setTicketData}
                  currentUser={authData}
                  onStage3Promote={() => {
                    setCurrentStageIndex(3);
                    setTicketData(prev => prev ? { ...prev, currentStageIndex: 3 } : prev);
                  }}
                  onPromote={() => {
                    setCurrentStageIndex(4);
                    setTicketData(prev => prev ? { ...prev, currentStageIndex: 4 } : prev);
                  }}
                  onAddQuery={handleAddQuery}
                  currentStageIndex={currentStageIndex}
                  viewingStageIndex={viewingStageIndex}
                  isCompleted={currentStageIndex > viewingStageIndex}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              ) : viewingStageIndex === 4 ? (
                <ReviewGroupStage
                  theme={theme}
                  ticketData={ticketData}
                  setTicketData={setTicketData}
                  currentUser={authData}
                  onPromote={() => {
                    setCurrentStageIndex(5);
                    setTicketData(prev => prev ? { ...prev, currentStageIndex: 5 } : prev);
                  }}
                  onAddQuery={handleAddQuery}
                  isWorkflowActive={currentStageIndex === 4}
                  isCompleted={currentStageIndex > 4}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              ) : viewingStageIndex === 5 ? (
                <CostEstimationStage
                  theme={theme}
                  ticketData={ticketData}
                  setTicketData={setTicketData}
                  currentUser={authData}
                  onPromote={() => {
                    setCurrentStageIndex(6);
                    setTicketData(prev => prev ? { ...prev, currentStageIndex: 6 } : prev);
                  }}
                  onAddQuery={handleAddQuery}
                  isWorkflowActive={currentStageIndex === 5}
                  isCompleted={currentStageIndex > 5}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              ) : viewingStageIndex === 6 ? (
                <SecondaryApprovalStage
                  theme={theme}
                  ticketData={ticketData}
                  setTicketData={setTicketData}
                  currentUser={authData}
                  onPromote={() => {
                    setCurrentStageIndex(7);
                    setTicketData(prev => prev ? { ...prev, currentStageIndex: 7 } : prev);
                  }}
                  onAddQuery={handleAddQuery}
                  isWorkflowActive={currentStageIndex === 6}
                  isCompleted={currentStageIndex > 6}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              ) : viewingStageIndex === 7 ? (
                <SiteHeadApproval
                  theme={theme}
                  ticketData={ticketData}
                  setTicketData={setTicketData}
                  currentUser={authData}
                  onPromote={() => {
                    setCurrentStageIndex(8);
                    setTicketData(prev => prev ? { ...prev, currentStageIndex: 8 } : prev);
                  }}
                  onAddQuery={handleAddQuery}
                  isWorkflowActive={currentStageIndex === 7}
                  isCompleted={currentStageIndex > 7}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              ) : viewingStageIndex === 8 ? (
                <ProjectManagerStage
                  theme={theme}
                  ticketData={ticketData}
                  setTicketData={setTicketData}
                  currentUser={authData}
                  onPromote={() => {
                    setCurrentStageIndex(9);
                    setTicketData(prev => prev ? { ...prev, currentStageIndex: 9 } : prev);
                  }}
                  onAddQuery={handleAddQuery}
                  isWorkflowActive={currentStageIndex === 8}
                  isCompleted={currentStageIndex > 8}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              ) : viewingStageIndex === 9 ? (
                <DocumentationStage
                  theme={theme}
                  ticketData={ticketData}
                  setTicketData={setTicketData}
                  currentUser={authData}
                  onPromote={() => {
                    setCurrentStageIndex(10);
                    setTicketData(prev => prev ? { ...prev, currentStageIndex: 10 } : prev);
                  }}
                  isWorkflowActive={currentStageIndex === 9}
                  isCompleted={currentStageIndex > 9}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              ) : viewingStageIndex === 10 ? (
                <ClosureStage
                  theme={theme}
                  ticketData={ticketData}
                  setTicketData={setTicketData}
                  currentUser={authData}
                  onPromote={() => {}}
                  onAddQuery={handleAddQuery}
                  isWorkflowActive={currentStageIndex === 10}
                  isCompleted={currentStageIndex > 10}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              ) : (
                <div style={{ backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff', padding: '24px', borderRadius: '8px', border: theme === 'dark' ? '1px solid #333333' : '1px solid #eaeaea', color: theme === 'dark' ? '#ffffff' : '#333333' }}>
                  <h3 style={{ marginTop: 0 }}>Workflow Complete</h3>
                  <p style={{ color: theme === 'dark' ? '#aaaaaa' : '#666666' }}>This Management of Change process has been successfully finalized and closed.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'Analytics' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              {[
                { label: 'Total Active MOCs', value: '12', color: '#1a73e8', icon: '📊' },
                { label: 'Avg Approval Time', value: '4 Days', color: '#f9ab00', icon: '⏱️' },
                { label: 'Pending Your Action', value: '3', color: '#dc3545', icon: '⚠️' },
                { label: 'Completed this Month', value: '28', color: '#137333', icon: '✅' }
              ].map((stat, i) => (
                <div key={i} style={{
                  backgroundColor: theme === 'dark' ? '#12122a' : '#f8f9fe',
                  border: theme === 'dark' ? '1px solid #2a2a4a' : '1px solid #e8eaf6',
                  borderTop: `3px solid ${stat.color}`,
                  borderRadius: '12px', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px'
                }}>
                  <div style={{ fontSize: '32px' }}>{stat.icon}</div>
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: theme === 'dark' ? '#e8e8ff' : '#1a1a3e' }}>{stat.value}</div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: theme === 'dark' ? '#7070a0' : '#999', textTransform: 'uppercase' }}>{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div style={{ backgroundColor: theme === 'dark' ? '#12122a' : '#f8f9fe', border: theme === 'dark' ? '1px solid #2a2a4a' : '1px solid #e8eaf6', borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: '16px', color: theme === 'dark' ? '#e8e8ff' : '#1a1a3e' }}>MOCs by Department</h3>
                {[
                  { dept: 'Operations', pct: 45, color: '#1a73e8' },
                  { dept: 'Maintenance', pct: 30, color: '#137333' },
                  { dept: 'HSE', pct: 15, color: '#f9ab00' },
                  { dept: 'Engineering', pct: 10, color: '#dc3545' }
                ].map(item => (
                  <div key={item.dept} style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: theme === 'dark' ? '#7070a0' : '#666' }}>
                      <span>{item.dept}</span><span>{item.pct}%</span>
                    </div>
                    <div style={{ height: '8px', backgroundColor: theme === 'dark' ? '#2a2a4a' : '#e0e2f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${item.pct}%`, height: '100%', backgroundColor: item.color, borderRadius: '4px' }} />
                    </div>
                  </div>
                ))}
              </div>
              
              <div style={{ backgroundColor: theme === 'dark' ? '#12122a' : '#f8f9fe', border: theme === 'dark' ? '1px solid #2a2a4a' : '1px solid #e8eaf6', borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: '16px', color: theme === 'dark' ? '#e8e8ff' : '#1a1a3e' }}>Recent Activity</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {[
                    { msg: 'MOC-2026-042 approved by Site Head', time: '2 hours ago', icon: '🟢' },
                    { msg: 'Query raised on MOC-2026-045', time: '5 hours ago', icon: '🟠' },
                    { msg: 'Cost estimation completed for MOC-2026-048', time: '1 day ago', icon: '🔵' }
                  ].map((act, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', paddingBottom: '16px', borderBottom: theme === 'dark' ? '1px solid #2a2a4a' : '1px solid #e8eaf6' }}>
                      <div style={{ fontSize: '16px' }}>{act.icon}</div>
                      <div>
                        <div style={{ fontSize: '14px', color: theme === 'dark' ? '#e8e8ff' : '#1a1a3e', marginBottom: '4px' }}>{act.msg}</div>
                        <div style={{ fontSize: '11px', color: theme === 'dark' ? '#7070a0' : '#999' }}>{act.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Settings' && (
          <div style={{ maxWidth: '600px', animation: 'fadeIn 0.3s ease' }}>
            <div style={{ backgroundColor: theme === 'dark' ? '#12122a' : '#f8f9fe', border: theme === 'dark' ? '1px solid #2a2a4a' : '1px solid #e8eaf6', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: '16px', color: theme === 'dark' ? '#e8e8ff' : '#1a1a3e' }}>Appearance</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: theme === 'dark' ? '#e8e8ff' : '#1a1a3e' }}>Theme Preference</div>
                  <div style={{ fontSize: '12px', color: theme === 'dark' ? '#7070a0' : '#999', marginTop: '4px' }}>Toggle between light and dark modes</div>
                </div>
                <button
                  onClick={toggleTheme}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: theme === 'dark' ? '1px solid #4a4a6a' : '1px solid #ccc',
                    backgroundColor: theme === 'dark' ? '#2a2a4a' : '#fff', color: theme === 'dark' ? '#e8e8ff' : '#333',
                    cursor: 'pointer', fontWeight: '600', fontSize: '13px'
                  }}
                >
                  {theme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}
                </button>
              </div>
            </div>

            <div style={{ backgroundColor: theme === 'dark' ? '#12122a' : '#f8f9fe', border: theme === 'dark' ? '1px solid #2a2a4a' : '1px solid #e8eaf6', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: '16px', color: theme === 'dark' ? '#e8e8ff' : '#1a1a3e' }}>Notifications</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {[
                  { id: 'email', label: 'Email Notifications', desc: 'Receive daily digests and urgent alerts via email.' },
                  { id: 'sms', label: 'SMS Alerts', desc: 'Get text messages for critical MOC approvals.' },
                  { id: 'push', label: 'In-App Notifications', desc: 'Show toast notifications within the portal.' }
                ].map(notif => (
                  <div key={notif.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: theme === 'dark' ? '#e8e8ff' : '#1a1a3e' }}>{notif.label}</div>
                      <div style={{ fontSize: '12px', color: theme === 'dark' ? '#7070a0' : '#999', marginTop: '4px' }}>{notif.desc}</div>
                    </div>
                    {/* Dummy Toggle */}
                    <div style={{ width: '40px', height: '22px', backgroundColor: '#1a73e8', borderRadius: '11px', position: 'relative', cursor: 'pointer' }}>
                      <div style={{ width: '18px', height: '18px', backgroundColor: '#fff', borderRadius: '50%', position: 'absolute', top: '2px', right: '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ backgroundColor: theme === 'dark' ? '#12122a' : '#f8f9fe', border: theme === 'dark' ? '1px solid #2a2a4a' : '1px solid #e8eaf6', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: '16px', color: theme === 'dark' ? '#e8e8ff' : '#1a1a3e' }}>Profile Settings</h3>
              <p style={{ fontSize: '13px', color: theme === 'dark' ? '#7070a0' : '#666', marginBottom: '16px' }}>Your profile information is managed by HR. Please contact IT support to update your details.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
                <div>
                  <div style={{ color: theme === 'dark' ? '#7070a0' : '#999', marginBottom: '4px' }}>Name</div>
                  <div style={{ fontWeight: '600', color: theme === 'dark' ? '#e8e8ff' : '#1a1a3e' }}>{authData.name}</div>
                </div>
                <div>
                  <div style={{ color: theme === 'dark' ? '#7070a0' : '#999', marginBottom: '4px' }}>Employee ID</div>
                  <div style={{ fontWeight: '600', color: theme === 'dark' ? '#e8e8ff' : '#1a1a3e' }}>{authData.orgNumber}</div>
                </div>
                <div>
                  <div style={{ color: theme === 'dark' ? '#7070a0' : '#999', marginBottom: '4px' }}>Role</div>
                  <div style={{ fontWeight: '600', color: theme === 'dark' ? '#e8e8ff' : '#1a1a3e' }}>{authData.designation}</div>
                </div>
                <div>
                  <div style={{ color: theme === 'dark' ? '#7070a0' : '#999', marginBottom: '4px' }}>Contact</div>
                  <div style={{ fontWeight: '600', color: theme === 'dark' ? '#e8e8ff' : '#1a1a3e' }}>{authData.contact}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        </div>
      </main>
    </div>
  );
}

export default App;