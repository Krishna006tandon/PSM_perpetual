import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChecklistModule from './components/sub-elements/ChecklistModule';
import CreateMocForm from './components/sub-elements/CreateMocForm';
import AreaHeadApproval from './components/sub-elements/AreaHeadApproval';
import ReviewGroupStage from './components/sub-elements/ReviewGroupStage';
import SiteHeadApproval from './components/sub-elements/SiteHeadApproval';
import DocumentationStage from './components/sub-elements/DocumentationStage';
import ClosureStage from './components/sub-elements/ClosureStage';

const WORKFLOW_STAGES = [
  "Creation", "Area Head Approval", "CTS Verification",
  "CTS Head Verification", "Review Group", "Site Head Approval",
  "Documentation", "Closure"
];

const dashboardModules = [
  { id: 'moc', title: 'Management of Change (MOC)', isActive: true }
];

function App() {
  const [theme, setTheme] = useState('dark');
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [profileOpen, setProfileOpen] = useState(false);

  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [viewingStageIndex, setViewingStageIndex] = useState(0);

  // When the workflow advances, do NOT auto-jump the view — let the user navigate manually
  // (viewingStageIndex is only updated when the user clicks stage badges or Prev/Next buttons)

  const [ticketData, setTicketData] = useState(null);

  // --- GLOBAL QUERY STATE ---
  const [globalQueries, setGlobalQueries] = useState([]);

  const handleAddQuery = (newQuery) => {
    setGlobalQueries(prev => [
      ...prev,
      { ...newQuery, timestamp: new Date().toLocaleTimeString(), id: Date.now() }
    ]);
  };

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authStep, setAuthStep] = useState('login');

  const [authData, setAuthData] = useState({
    name: 'Amit Patel', designation: 'Process Engineer', orgNumber: 'ORG-7742', contact: 'amit.patel@company.com'
  });
  const [otp, setOtp] = useState('123456');

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  // --- IDENTIFY USER'S DOMAIN ---
  const getDomainIndex = (designation) => {
    if (designation === 'Process Engineer') return 0;
    if (designation === 'Area Head') return 1;
    if (designation === 'CTS Reviewer') return 2;
    if (designation === 'CTS Head') return 3;
    if (designation.includes('Reviewer')) return 4;
    if (designation === 'Site Head') return 5;
    if (designation === 'Project Manager') return 6;
    if (designation === 'Area Owner') return 7;
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
                <label style={styles.label}>System Role / Designation</label>
                <select style={styles.select} value={authData.designation} onChange={(e) => setAuthData({...authData, designation: e.target.value})}>
                  <option value="Process Engineer">Process Engineer (Initiator)</option>
                  <option value="Area Head">Area Head</option>
                  <option value="CTS Reviewer">CTS Reviewer</option>
                  <option value="CTS Head">CTS Head</option>
                  <option value="Mechanical Reviewer">Mechanical Reviewer</option>
                  <option value="Safety Reviewer">Safety Reviewer</option>
                  <option value="Site Head">Site Head</option>
                  <option value="Project Manager">Project Manager (Documentation)</option>
                  <option value="Area Owner">Area Owner (Closure)</option>
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
            <h1 style={{ margin: 0, fontSize: '24px' }}>{activeTab === 'Dashboard' ? 'Enterprise Dashboard' : `MOC Workflow: ${ticketData ? ticketData.title : 'New Ticket'}`}</h1>
            <div style={{ fontSize: '13px', color: theme === 'dark' ? '#aaaaaa' : '#666666', marginTop: '4px' }}>Logged in as: <strong>{authData.name}</strong> ({authData.designation})</div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button className="theme-toggle" onClick={toggleTheme}>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</button>

            {/* Profile Icon Button */}
            <div style={{ position: 'relative' }}>
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
                    position: 'absolute', right: 0, top: '48px', zIndex: 1000,
                    backgroundColor: theme === 'dark' ? '#1a1a2e' : '#ffffff',
                    border: theme === 'dark' ? '1px solid #2a2a4a' : '1px solid #e8eaf6',
                    borderRadius: '12px', padding: '16px', width: '240px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
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
                    ⎋ Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {activeTab === 'Dashboard' && (
          <div>
            <h2 style={{ color: theme === 'dark' ? '#ffffff' : '#333333', borderBottom: theme === 'dark' ? '1px solid #444444' : '1px solid #eaeaea', paddingBottom: '8px', marginTop: '24px' }}>Available Modules</h2>
            <div style={styles.gridContainer}>
              {dashboardModules.map((mod) => (
                <div key={mod.id} style={{ ...styles.dashboardCard, border: mod.isActive ? '2px solid #1a73e8' : styles.dashboardCard.border }} onClick={() => mod.isActive ? setActiveTab('Projects') : null}>
                  <h3 style={{ margin: 0, color: mod.isActive ? '#1a73e8' : 'inherit', fontSize: '18px' }}>{mod.title}</h3>
                </div>
              ))}
            </div>
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
                      <span style={{ fontSize: '12px', color: '#888' }}>{q.timestamp}</span>
                    </div>
                    <div>{q.description}</div>
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
                  setTicketData={setTicketData}
                  currentUser={authData}
                  onPromote={() => setCurrentStageIndex(1)}
                  onNext={handleNext}
                />
              ) : viewingStageIndex === 1 ? (
                <AreaHeadApproval
                  theme={theme}
                  ticketData={ticketData}
                  setTicketData={setTicketData}
                  currentUser={authData}
                  onPromote={() => setCurrentStageIndex(2)}
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
                  onStage3Promote={() => setCurrentStageIndex(3)}
                  onPromote={() => setCurrentStageIndex(4)}
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
                  onPromote={() => setCurrentStageIndex(5)}
                  onAddQuery={handleAddQuery}
                  isWorkflowActive={currentStageIndex === 4}
                  isCompleted={currentStageIndex > 4}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              ) : viewingStageIndex === 5 ? (
                <SiteHeadApproval
                  theme={theme}
                  ticketData={ticketData}
                  setTicketData={setTicketData}
                  currentUser={authData}
                  onPromote={() => setCurrentStageIndex(6)}
                  onAddQuery={handleAddQuery}
                  isWorkflowActive={currentStageIndex === 5}
                  isCompleted={currentStageIndex > 5}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              ) : viewingStageIndex === 6 ? (
                <DocumentationStage
                  theme={theme}
                  ticketData={ticketData}
                  setTicketData={setTicketData}
                  currentUser={authData}
                  onPromote={() => setCurrentStageIndex(7)}
                  isWorkflowActive={currentStageIndex === 6}
                  isCompleted={currentStageIndex > 6}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              ) : viewingStageIndex === 7 ? (
                <ClosureStage
                  theme={theme}
                  ticketData={ticketData}
                  setTicketData={setTicketData}
                  currentUser={authData}
                  onPromote={() => setCurrentStageIndex(8)}
                  onAddQuery={handleAddQuery}
                  isWorkflowActive={currentStageIndex === 7}
                  isCompleted={currentStageIndex > 7}
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
      </main>
    </div>
  );
}

export default App;