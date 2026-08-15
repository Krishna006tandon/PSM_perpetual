import React, { useState, useEffect } from 'react';
// import Sidebar from '../components/Sidebar'; // Sidebar is handled by main App.js
import ChecklistModule from '../components/sub-elements/ChecklistModule';
import CreateMocForm from '../components/sub-elements/CreateMocForm';
import AreaHeadApproval from '../components/sub-elements/AreaHeadApproval';
import ReviewGroupStage from '../components/sub-elements/ReviewGroupStage';
import CostEstimationStage from '../components/sub-elements/CostEstimationStage';
import SecondaryApprovalStage from '../components/sub-elements/SecondaryApprovalStage';
import SiteHeadApproval from '../components/sub-elements/SiteHeadApproval';
import ProjectManagerStage from '../components/sub-elements/ProjectManagerStage';
import DocumentationStage from '../components/sub-elements/DocumentationStage';
import ClosureStage from '../components/sub-elements/ClosureStage';
import { mocService } from '../api/mocService';
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

export default function MocDashboard() {
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGuideStage, setSelectedGuideStage] = useState(null);

  // --- GLOBAL QUERY STATE ---
  const [globalQueries, setGlobalQueries] = useState([]);
  const [resolvingQueryId, setResolvingQueryId] = useState(null);
  const [resolutionText, setResolutionText] = useState("");

  const printMOCSummary = (moc) => {
    let html = `
      <html>
        <head>
          <title>MOC Summary Report - ${moc.mocId || moc._id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
            h1 { color: #1a73e8; border-bottom: 2px solid #1a73e8; padding-bottom: 10px; }
            h2 { color: #137333; margin-top: 30px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            h3 { color: #555; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .meta-item { background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #eee; }
            .label { font-weight: bold; color: #555; text-transform: uppercase; font-size: 12px; }
            .value { font-size: 16px; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #f2f2f2; width: 50%; }
            .history-item { margin-top: 10px; padding: 10px; background: #f1f3f4; border-radius: 4px; border-left: 4px solid #1a73e8; }
            .print-btn { display: block; margin: 20px 0; padding: 12px 24px; background-color: #1a73e8; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; text-align: center; font-weight: bold; }
            .print-btn:hover { background-color: #1557b0; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <button class="print-btn no-print" onclick="window.print()">Download / Print Summary Report</button>
          <h1>MOC Summary Report: ${moc.title || 'Untitled MOC'}</h1>
          <div class="meta-grid">
            <div class="meta-item"><div class="label">MOC ID</div><div class="value">${moc.mocId || moc._id}</div></div>
            <div class="meta-item"><div class="label">Status</div><div class="value">${moc.status}</div></div>
            <div class="meta-item"><div class="label">Plant</div><div class="value">${moc.plant}</div></div>
            <div class="meta-item"><div class="label">Department</div><div class="value">${moc.department}</div></div>
            <div class="meta-item"><div class="label">Risk Level</div><div class="value">${moc.riskLevel}</div></div>
            <div class="meta-item"><div class="label">Change Type</div><div class="value">${moc.changeType}</div></div>
          </div>
          
          <h2>Description</h2>
          <p>${moc.description || 'No description provided.'}</p>
    `;

    const stages = [
      "Stage 1: Creation (Initiator)",
      "Stage 2: Area Head Approval",
      "Stage 3: Pre-Implementation Checklist",
      "Stage 4: Hazop / Risk Assessment",
      "Stage 5: Department Approvals (Dynamic)",
      "Stage 6: Cost Estimation",
      "Stage 7: Secondary Head Approval (Sequential)",
      "Stage 8: Site Head Final Approval",
      "Stage 9: Project Manager Execution",
      "Stage 10: Documentation & Revalidation",
      "Stage 11: Closure & Archiving"
    ];

    stages.forEach((stageName, idx) => {
      const stageNum = idx + 1;
      html += `<h2>${stageName}</h2>`;
      
      // Look for history for this stage (stageIndex in DB is 0-indexed)
      const stageHistories = (moc.stageHistory || []).filter(h => h.stageIndex === (stageNum - 1));
      if (stageHistories.length > 0) {
        stageHistories.forEach(h => {
          html += `<div class="history-item">
            <strong>Action:</strong> ${h.action} <br/>
            <strong>By:</strong> ${h.actor?.name} (${h.actor?.designation}) <br/>
            <strong>Time:</strong> ${new Date(h.timestamp).toLocaleString()} <br/>
            ${h.comments ? `<strong>Comments:</strong> ${h.comments}` : ''}
          </div>`;
        });
      } else {
        html += `<p><em>No actions recorded yet.</em></p>`;
      }

      // Render specific stage data
      if (stageNum === 3 && moc.checklistResponses?.stage3) {
        html += `<table><tr><th>Question</th><th>Response</th></tr>`;
        moc.checklistResponses.stage3.forEach(q => {
          html += `<tr><td>${q.question}</td><td>${q.status}</td></tr>`;
        });
        html += `</table>`;
      }
      
      if (stageNum === 5 && moc.checklistResponses?.stage5) {
        for (const [dept, qs] of Object.entries(moc.checklistResponses.stage5)) {
          html += `<h3>${dept} (Status: ${qs.status || 'Pending'})</h3><table><tr><th>Item</th><th>Response</th><th>Remarks</th></tr>`;
          if (qs.answers && typeof qs.answers === 'object') {
            for (const [qId, ansObj] of Object.entries(qs.answers)) {
              let questionText = qId;
              if (qId === 'q1') questionText = `Has the impact on ${dept} been assessed?`;
              if (qId === 'q2') questionText = `Are all ${dept} drawings updated?`;
              if (qId === 'q3') questionText = `Is the ${dept} related documentation complete?`;
              if (qId === 'q4') questionText = `Has the ${dept} team been trained on the changes?`;
              
              html += `<tr><td>${questionText}</td><td>${ansObj.answer || '-'}</td><td>${ansObj.remark || '-'}</td></tr>`;
            }
          }
          html += `</table>`;
        }
      }

      if (stageNum === 6 && moc.costEstimation?.departments?.length > 0) {
        html += `<table><tr><th>Department</th><th>Material Cost</th><th>Services Cost</th><th>Remarks</th></tr>`;
        moc.costEstimation.departments.forEach(d => {
          html += `<tr><td>${d.name}</td><td>$${d.materialCost || 0}</td><td>$${d.thirdPartyCost || 0}</td><td>${d.remarks || '-'}</td></tr>`;
        });
        html += `</table>`;
      }
      
      if (stageNum === 9 && moc.assignedPM?.name) {
        html += `<div style="margin-top: 10px; padding: 10px; border: 1px solid #ccc; border-radius: 4px;">
          <strong>Assigned PM:</strong> ${moc.assignedPM.name} (${moc.assignedPM.department})<br/>
          <strong>Assigned By:</strong> ${moc.assignedPM.assignedBy} on ${new Date(moc.assignedPM.assignedAt).toLocaleDateString()}
        </div>`;
      }
      
      if (stageNum === 10 && moc.checklistResponses?.stage10) {
        html += `<table><tr><th>Documentation Item</th><th>Response</th></tr>`;
        moc.checklistResponses.stage10.forEach(q => {
          html += `<tr><td>${q.question}</td><td>${q.status}</td></tr>`;
        });
        html += `</table>`;
      }
    });

    html += `
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
  };

  useEffect(() => {
    if (ticketData?.queries) {
      setGlobalQueries(ticketData.queries);
    } else {
      setGlobalQueries([]);
    }
  }, [ticketData]);

  const handleAddQuery = async (newQuery) => {
    if (ticketData) {
      try {
        const updatedMoc = await mocService.addQuery(ticketData.mocId || ticketData._id, newQuery);
        setTicketData(updatedMoc);
        setGlobalQueries(updatedMoc.queries || []);
      } catch (err) {
        console.error("Failed to add query", err);
      }
    } else {
      setGlobalQueries(prev => [
        ...prev,
        { ...newQuery, timestamp: new Date().toLocaleTimeString(), id: Date.now(), status: 'Active', resolutionMessage: '' }
      ]);
    }
  };

  const handleResolveQuery = async (queryId) => {
    if (ticketData) {
      try {
        const updatedMoc = await mocService.resolveQuery(ticketData.mocId || ticketData._id, { queryId, resolutionMessage: resolutionText });
        setTicketData(updatedMoc);
        setGlobalQueries(updatedMoc.queries || []);
      } catch (err) {
        console.error("Failed to resolve query", err);
      }
    } else {
      setGlobalQueries(prev => prev.map(q => {
        if ((q._id || q.id) === queryId) {
          return { ...q, status: 'Resolved', resolutionMessage: resolutionText };
        }
        return q;
      }));
    }
    setResolvingQueryId(null);
    setResolutionText("");
  };

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [loginStage, setLoginStage] = useState("Stage 1: Creation");

  const [authData, setAuthData] = useState({
    name: 'Amit Patel', designation: 'Process Engineer', orgNumber: 'ORG-7742', contact: 'amit.patel@company.com'
  });

  useEffect(() => {
    const fetchMOCs = async () => {
      try {
        const result = await mocService.getAllMOCs(authData.orgNumber);
        setMocList(result || []);
      } catch (err) {
        console.error("Failed to fetch MOCs:", err);
      }
    };
    if (isAuthenticated) {
      fetchMOCs();
    }
  }, [isAuthenticated, authData.orgNumber]);

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
    authContainer: { 
      display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', 
      background: theme === 'dark' 
        ? 'radial-gradient(circle at 15% 50%, rgba(45,20,80,1) 0%, rgba(18,18,30,1) 50%, rgba(10,10,20,1) 100%)' 
        : 'radial-gradient(circle at 15% 50%, rgba(220,235,255,1) 0%, rgba(245,247,250,1) 50%, rgba(255,255,255,1) 100%)',
      color: theme === 'dark' ? '#ffffff' : '#333333',
      padding: '20px'
    },
    authCard: { 
      background: theme === 'dark' ? 'rgba(30, 30, 45, 0.65)' : 'rgba(255, 255, 255, 0.65)', 
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      padding: '48px 40px', borderRadius: '24px', 
      boxShadow: theme === 'dark' ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.08)', 
      width: '100%', maxWidth: '440px', 
      border: theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.4)',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
    },

    inputGroup: { display: 'flex', flexDirection: 'column', marginBottom: '20px' },
    label: { marginBottom: '8px', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', color: theme === 'dark' ? '#a0a0b0' : '#666666' },
    input: { 
      width: '100%', boxSizing: 'border-box',
      padding: '12px 16px', borderRadius: '12px', 
      border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)', 
      backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.8)', 
      color: theme === 'dark' ? '#ffffff' : '#333333', fontSize: '15px', outline: 'none',
      transition: 'all 0.2s ease',
    },
    select: { 
      width: '100%', boxSizing: 'border-box',
      padding: '14px 16px', borderRadius: '8px', 
      border: '1px solid var(--divider)', 
      backgroundColor: 'var(--bg-default)', 
      color: 'var(--text-primary)', 
      fontSize: '1rem', outline: 'none', cursor: 'pointer', appearance: 'none',
      transition: 'border-color 0.2s ease'
    },
    authToggle: { display: 'flex', backgroundColor: 'var(--bg-default)', borderRadius: '12px', padding: '6px', marginBottom: '32px' },
    authToggleBtn: (active) => ({
      flex: 1, padding: '10px', border: 'none', borderRadius: '8px',
      backgroundColor: active ? 'var(--bg-paper)' : 'transparent', 
      color: active ? 'var(--text-primary)' : 'var(--text-secondary)', 
      fontSize: '0.95rem', fontWeight: active ? '700' : '500', 
      outline: 'none', cursor: 'pointer',
      boxShadow: active ? 'var(--shadow-sm)' : 'none',
      transition: 'all 0.2s ease',
    }),
    primaryBtn: { 
      width: '100%', padding: '16px', marginTop: '16px',
      backgroundColor: 'var(--primary-main)', 
      color: '#ffffff', border: 'none', borderRadius: '8px', 
      fontSize: '1.05rem', fontWeight: '700', 
      cursor: 'pointer', transition: 'all 0.2s ease', 
      boxShadow: 'var(--shadow-md)'
    },
    gridContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px', marginTop: '20px' },
    dashboardCard: { 
      backgroundColor: 'var(--bg-paper)', 
      color: 'var(--text-primary)', 
      borderRadius: '12px', padding: '24px', 
      boxShadow: 'var(--shadow-md)', 
      border: '1px solid var(--divider)', 
      cursor: 'pointer', display: 'flex', flexDirection: 'column', 
      justifyContent: 'center', alignItems: 'center', textAlign: 'center', 
      height: '140px', transition: 'all 0.2s ease' 
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={styles.authContainer}>
        <div style={styles.authCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '800', background: theme === 'dark' ? 'linear-gradient(90deg, #fff, #aaa)' : 'linear-gradient(90deg, #1a73e8, #333)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              MOC Portal
            </h2>
            <button onClick={toggleTheme} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '8px', borderRadius: '50%', backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>

          <div style={styles.authToggle}>
            <button style={styles.authToggleBtn(!isSignup)} onClick={() => {
              setIsSignup(false);
              setAuthData({ ...authData, orgNumber: 'ORG-7742' }); // Enforce hardcoded org id on Login
            }}>Login</button>
            <button style={styles.authToggleBtn(isSignup)} onClick={() => {
              setIsSignup(true);
              setAuthData({ ...authData, orgNumber: '' }); // Enable new user to register their organization
            }}>Sign Up</button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); setIsAuthenticated(true); }}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Full Name</label>
              <input style={{...styles.input, ':focus': { borderColor: '#1a73e8' }}} type="text" value={authData.name} onChange={(e) => setAuthData({...authData, name: e.target.value})} required placeholder="Enter your full name" />
            </div>
            
            <div style={styles.inputGroup}>
              <label style={styles.label}>Stage Group</label>
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
              <label style={styles.label}>Role</label>
              <select style={styles.select} value={authData.designation} onChange={(e) => setAuthData({...authData, designation: e.target.value})}>
                {STAGE_ROLES[loginStage].map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Organization ID</label>
              <input 
                style={{...styles.input, backgroundColor: !isSignup ? (theme === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.03)') : styles.input.backgroundColor, opacity: !isSignup ? 0.7 : 1 }} 
                type="text" 
                value={authData.orgNumber} 
                onChange={(e) => setAuthData({...authData, orgNumber: e.target.value})} 
                required 
                placeholder="Enter Organization ID"
                readOnly={!isSignup} // Keep it hardcoded for us in login
                title={!isSignup ? "Organization ID is pre-filled for login" : ""}
              />
            </div>
            
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email Address</label>
              <input style={styles.input} type="email" value={authData.contact} onChange={(e) => setAuthData({...authData, contact: e.target.value})} required placeholder="you@company.com" />
            </div>

            <button 
              type="submit" 
              style={styles.primaryBtn}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              {isSignup ? 'Create Account' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <main className="main-content" style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
        <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 40px', borderBottom: '1px solid var(--divider)', backgroundColor: 'var(--bg-paper)' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', color: 'var(--text-primary)' }}>{activeTab === 'Dashboard' ? 'Enterprise Dashboard' : activeTab === 'Analytics' ? 'Analytics Overview' : activeTab === 'Settings' ? 'Application Settings' : `MOC Workflow: ${ticketData ? ticketData.title : 'New Ticket'}`}</h1>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Logged in as: <strong>{authData.name}</strong> ({authData.designation})</div>
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
                    onClick={() => { setIsAuthenticated(false); setIsSignup(false); setActiveTab('Dashboard'); setProfileOpen(false); }}
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
                    { label: 'Rejected', value: mocList.filter(m => m.status === 'Rejected' || m.status === 'Permanently Rejected').length, color: '#dc3545', filterKey: 'Rejected' },
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

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {['All', 'Active', 'Closed', 'Rejected'].map(filter => (
                      <button
                        key={filter}
                        onClick={() => setMocFilter(filter)}
                        style={{
                          padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                          backgroundColor: mocFilter === filter ? '#1a73e8' : (theme === 'dark' ? '#333' : '#e0e0e0'),
                          color: mocFilter === filter ? 'white' : (theme === 'dark' ? '#ccc' : '#333'),
                          fontWeight: '600'
                        }}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                  <div>
                    <input 
                      type="text" 
                      placeholder="Search MOCs by ID or Title..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        padding: '8px 16px', borderRadius: '20px', border: theme === 'dark' ? '1px solid #555' : '1px solid #ccc',
                        backgroundColor: theme === 'dark' ? '#222' : '#fff', color: theme === 'dark' ? '#fff' : '#333',
                        width: '250px', outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* MOC Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                  {(() => {
                    const filteredList = mocList.filter(m => {
                      const matchesFilter = mocFilter === 'All' ? true : (mocFilter === 'Rejected' ? (m.status === 'Rejected' || m.status === 'Permanently Rejected') : m.status === mocFilter);
                      const matchesSearch = searchQuery === '' || 
                        (m.mocId || m._id).toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (m.title || '').toLowerCase().includes(searchQuery.toLowerCase());
                      return matchesFilter && matchesSearch;
                    });
                    return filteredList.length > 0 ? (
                      filteredList.map(moc => {
                        const stageIndex = moc.currentStageIndex || 0;
                        const isRejected = moc.status === 'Rejected' || moc.status === 'Permanently Rejected';
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
                            onClick={async () => {
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
                              cursor: 'pointer',
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
                                  <span style={{ color: '#dc3545', fontWeight: '600' }}>⛔ This MOC has been rejected.</span>
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
                              {(moc.status === 'Closed' || moc.status === 'Rejected') && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    printMOCSummary(moc);
                                  }}
                                  style={{
                                    background: 'none', border: `1px solid ${theme === 'dark' ? '#137333' : '#137333'}`,
                                    borderRadius: '6px', padding: '3px 10px', cursor: 'pointer',
                                    fontSize: '11px', fontWeight: '600',
                                    color: '#137333',
                                    transition: 'all 0.2s ease',
                                    marginLeft: '8px'
                                  }}
                                  title="Download Summary Report"
                                >
                                  📄 Summary
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              {/* GLOBAL QUERY BOX */}
              <div style={{ ...styles.queryBox, marginBottom: 0 }}>
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
                    
                    {(q.status === 'Active' || !q.status) && q.to && q.to.includes(authData.designation) && (
                      <div style={{ marginTop: '8px' }}>
                        {resolvingQueryId === (q._id || q.id) ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <textarea
                              value={resolutionText}
                              onChange={(e) => setResolutionText(e.target.value)}
                              placeholder="Type your resolution reply here..."
                              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: theme === 'dark' ? '1px solid #444' : '1px solid #ccc', backgroundColor: theme === 'dark' ? '#222' : '#fff', color: theme === 'dark' ? '#fff' : '#000', minHeight: '60px', boxSizing: 'border-box' }}
                            />
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button onClick={() => handleResolveQuery(q._id || q.id)} style={{ padding: '6px 12px', backgroundColor: '#137333', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>Submit Resolution</button>
                              <button onClick={() => { setResolvingQueryId(null); setResolutionText(""); }} style={{ padding: '6px 12px', backgroundColor: '#555', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setResolvingQueryId(q._id || q.id)} style={{ padding: '6px 12px', backgroundColor: '#1a73e8', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>Resolve</button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
              </div>
              
              {/* COST SUMMARY BOX */}
              <div style={{ ...styles.queryBox, marginBottom: 0 }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Global Cost Summary</h3>
                {(() => {
                  const depts = ticketData?.costEstimation?.departments || [];
                  const hasCosts = depts.length > 0;
                  if (!hasCosts) {
                    return <p style={{ margin: 0, fontSize: '14px', color: theme === 'dark' ? '#aaa' : '#666' }}>Cost has not been estimated yet.</p>;
                  }
                  
                  const totalMaterial = depts.reduce((sum, d) => sum + (d.materialCost || 0), 0);
                  const totalServices = depts.reduce((sum, d) => sum + (d.thirdPartyCost || 0), 0);
                  const grandTotal = totalMaterial + totalServices;
                  
                  return (
                    <div style={{ padding: '16px', backgroundColor: theme === 'dark' ? '#222' : '#f8f9fa', borderRadius: '8px', border: theme === 'dark' ? '1px solid #333' : '1px solid #e9ecef' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                        <span style={{ color: theme === 'dark' ? '#aaa' : '#666' }}>Total Material Cost:</span>
                        <strong>${totalMaterial.toLocaleString()}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px' }}>
                        <span style={{ color: theme === 'dark' ? '#aaa' : '#666' }}>Total Third-Party Services:</span>
                        <strong>${totalServices.toLocaleString()}</strong>
                      </div>
                      <div style={{ height: '1px', backgroundColor: theme === 'dark' ? '#444' : '#ddd', margin: '12px 0' }}></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', color: '#137333' }}>
                        <strong>Grand Total:</strong>
                        <strong>${grandTotal.toLocaleString()}</strong>
                      </div>
                    </div>
                  );
                })()}
              </div>
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

              {(ticketData?.status === 'Rejected' || ticketData?.status === 'Permanently Rejected') && (
                <div style={{ padding: '16px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '8px', marginBottom: '20px', border: '1px solid #f5c6cb' }}>
                  <strong>⛔ This MOC has been {ticketData?.status === 'Permanently Rejected' ? 'permanently rejected' : 'rejected'}.</strong> It is now view-only and no further actions can be taken.
                </div>
              )}

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
                  isWorkflowActive={currentStageIndex === 1 && ticketData?.status !== 'Rejected' && ticketData?.status !== 'Permanently Rejected'}
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
                  isWorkflowActive={currentStageIndex === viewingStageIndex && ticketData?.status !== 'Rejected' && ticketData?.status !== 'Permanently Rejected'}
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
                  isWorkflowActive={currentStageIndex === 4 && ticketData?.status !== 'Rejected' && ticketData?.status !== 'Permanently Rejected'}
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
                  isWorkflowActive={currentStageIndex === 5 && ticketData?.status !== 'Rejected' && ticketData?.status !== 'Permanently Rejected'}
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
                  isWorkflowActive={currentStageIndex === 6 && ticketData?.status !== 'Rejected' && ticketData?.status !== 'Permanently Rejected'}
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
                  isWorkflowActive={currentStageIndex === 7 && ticketData?.status !== 'Rejected' && ticketData?.status !== 'Permanently Rejected'}
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
                  isWorkflowActive={currentStageIndex === 8 && ticketData?.status !== 'Rejected' && ticketData?.status !== 'Permanently Rejected'}
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
                    setViewingStageIndex(10);
                  }}
                  isWorkflowActive={currentStageIndex === 9 && ticketData?.status !== 'Rejected' && ticketData?.status !== 'Permanently Rejected'}
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
                  isWorkflowActive={currentStageIndex === 10 && ticketData?.status !== 'Rejected' && ticketData?.status !== 'Permanently Rejected'}
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

        {activeTab === 'Analytics' && (() => {
          const total = mocList.length || 1;
          const active = mocList.filter(m => m.status === 'Active').length;
          const closed = mocList.filter(m => m.status === 'Closed').length;
          const rejected = mocList.filter(m => m.status === 'Rejected' || m.status === 'Permanently Rejected').length;
          
          const depts = {};
          mocList.forEach(m => {
            const d = m.department || 'Unknown';
            depts[d] = (depts[d] || 0) + 1;
          });
          const colors = ['#1a73e8', '#137333', '#f9ab00', '#dc3545', '#6c3483'];
          const deptStats = Object.keys(depts).map((d, i) => ({
            dept: d,
            pct: Math.round((depts[d] / total) * 100),
            color: colors[i % colors.length]
          })).sort((a,b) => b.pct - a.pct).slice(0, 5);

          return (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                {[
                  { label: 'Total Active MOCs', value: active, color: '#1a73e8', icon: '📊' },
                  { label: 'Rejected MOCs', value: rejected, color: '#dc3545', icon: '⛔' },
                  { label: 'Closed/Completed', value: closed, color: '#137333', icon: '✅' },
                  { label: 'Total MOCs', value: mocList.length, color: '#f9ab00', icon: '📋' }
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
                  {deptStats.length === 0 ? <div style={{color: '#888'}}>No data available</div> : deptStats.map(item => (
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
                  <h3 style={{ margin: '0 0 20px', fontSize: '16px', color: theme === 'dark' ? '#e8e8ff' : '#1a1a3e' }}>MOC Stage Distribution</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {(() => {
                      const stages = {};
                      mocList.forEach(m => {
                        const s = m.currentStageIndex || 0;
                        stages[s] = (stages[s] || 0) + 1;
                      });
                      return Object.keys(stages).sort((a,b) => b-a).slice(0, 4).map(s => (
                        <div key={s} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', paddingBottom: '16px', borderBottom: theme === 'dark' ? '1px solid #2a2a4a' : '1px solid #e8eaf6' }}>
                          <div style={{ fontSize: '16px' }}>📌</div>
                          <div>
                            <div style={{ fontSize: '14px', color: theme === 'dark' ? '#e8e8ff' : '#1a1a3e', marginBottom: '4px' }}>Stage {s}: {WORKFLOW_STAGES[s] || 'Unknown'}</div>
                            <div style={{ fontSize: '11px', color: theme === 'dark' ? '#7070a0' : '#999' }}>{stages[s]} MOC(s) currently at this stage</div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

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
        {activeTab === 'User Guide' && (() => {
          const guideStages = [
            { title: "1. Creation (Initiator)", desc: "The Process Engineer creates the MOC ticket, adds metadata (Plant, Dept, Change Type, Risk), and provides a description of the modification." },
            { title: "2. Area Head Approval", desc: "The Area Head reviews the initial proposal. They evaluate if the modification is necessary and formally approve or reject it." },
            { title: "3. Pre-Implementation Checklist", desc: "CTS Reviewers complete a series of required pre-implementation questions (e.g., updating P&IDs)." },
            { title: "4. Hazop / Risk Assessment", desc: "CTS Head verifies safety standards, verifies the risk level, and adds sign-off comments for hazard mitigation." },
            { title: "5. Department Approvals (Dynamic)", desc: "The MOC is dynamically routed to multiple departments (e.g., Operations, HSE, Electrical). All departments must complete their respective checklists before advancing." },
            { title: "6. Cost Estimation", desc: "The Cost Estimator reviews the approved technical scope and records the material and third-party service costs." },
            { title: "7. Secondary Head Approval (Sequential)", desc: "A sequential sign-off chain involving the Area Head (re-validation), CTS Head, Engineering Head, and HSE Head." },
            { title: "8. Site Head Final Approval", desc: "The Site Head provides the ultimate authorization to proceed with physical execution." },
            { title: "9. Project Manager Execution", desc: "The Engineering Head assigns a PM. The PM then coordinates the physical execution and checks off milestones." },
            { title: "10. Documentation & Revalidation", desc: "Post-execution, the PM ensures all real-world documentation (SOPs, drawings) accurately reflect the new physical changes." },
            { title: "11. Closure & Archiving", desc: "The Area Owner formally signs off on the completed modification and marks the MOC as Closed." }
          ];
          return (
            <div style={{ animation: 'fadeIn 0.3s ease', maxWidth: '800px' }}>
              <div style={{ backgroundColor: theme === 'dark' ? '#12122a' : '#f8f9fe', border: theme === 'dark' ? '1px solid #2a2a4a' : '1px solid #e8eaf6', borderRadius: '12px', padding: '32px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#1a73e8' }}>MOC Portal User Guide</h2>
                <p style={{ lineHeight: '1.6', marginBottom: '24px', color: theme === 'dark' ? '#ccc' : '#444' }}>
                  Welcome to the Management of Change (MOC) Portal. This system ensures all plant modifications are tracked, reviewed, and executed safely through a standardized 11-stage workflow.
                </p>
                
                <h3 style={{ fontSize: '18px', marginBottom: '12px', borderBottom: '1px solid #444', paddingBottom: '8px' }}>Roles & Responsibilities</h3>
                <ul style={{ listStyleType: 'disc', paddingLeft: '24px', lineHeight: '1.8', marginBottom: '24px', color: theme === 'dark' ? '#ccc' : '#444' }}>
                  <li><strong>Process Engineer / Initiator:</strong> Creates MOC tickets, provides initial details, and handles the "Documentation" phase.</li>
                  <li><strong>Area Head:</strong> First level of approval (Stage 2) and signs off on final financial cost packages (Stage 7).</li>
                  <li><strong>Department Reviewers (Mechanical, HSE, etc.):</strong> Responsible for answering checklist questions specific to their domain.</li>
                  <li><strong>Cost Estimator:</strong> Estimates material and 3rd-party costs for approved modifications.</li>
                  <li><strong>Site Head / CTS Head / Engineering Head:</strong> Sequential high-level approvals before execution.</li>
                  <li><strong>Project Manager:</strong> Assigned to execute the physical modification and update task checklists.</li>
                </ul>

                <h3 style={{ fontSize: '18px', marginBottom: '12px', borderBottom: '1px solid #444', paddingBottom: '8px' }}>The 11-Stage Workflow</h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {guideStages.map((stage, i) => {
                    const isExpanded = selectedGuideStage === i;
                    return (
                      <div key={i} style={{ backgroundColor: theme === 'dark' ? '#1a1a2e' : '#fff', borderRadius: '6px', border: theme === 'dark' ? '1px solid #333' : '1px solid #eee', overflow: 'hidden' }}>
                        <div 
                          onClick={() => setSelectedGuideStage(isExpanded ? null : i)}
                          style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isExpanded ? (theme === 'dark' ? '#2a2a4a' : '#f0f4ff') : 'transparent', fontWeight: isExpanded ? '600' : '400', transition: 'background-color 0.2s' }}
                        >
                          <span>{stage.title}</span>
                          <span>{isExpanded ? '▼' : '▶'}</span>
                        </div>
                        {isExpanded && (
                          <div style={{ padding: '16px', color: theme === 'dark' ? '#aaa' : '#555', borderTop: theme === 'dark' ? '1px solid #333' : '1px solid #eee', lineHeight: '1.6' }}>
                            {stage.desc}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}
      </main>
    </>
  );
}
