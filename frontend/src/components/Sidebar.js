import React, { useState } from 'react';

const NAV_ITEMS = [
  { id: 'Dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'Analytics', label: 'Analytics', icon: '📈' },
  { id: 'Settings', label: 'Settings', icon: '⚙️' },
  { id: 'User Guide', label: 'User Guide', icon: '📖' },
];

function Sidebar({ activeTab, setActiveTab }) {
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className="sidebar" style={{ width: isCollapsed ? '80px' : '260px', transition: 'width 0.3s ease', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        {!isCollapsed && <h2 style={{ margin: 0 }}>Brand</h2>}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{ background: 'none', border: 'none', color: 'inherit', fontSize: '20px', cursor: 'pointer', padding: isCollapsed ? '0' : '0 10px' }}
        >
          ☰
        </button>
      </div>
      <nav>
        <ul>
          {/* 1. Dashboard */}
          <li 
            className={activeTab === 'Dashboard' ? 'active' : ''}
            onClick={() => setActiveTab('Dashboard')}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
            title="Dashboard"
          >
            <span>📊</span>
            {!isCollapsed && <span>Dashboard</span>}
          </li>

          {/* 2. Projects (Dropdown Header) */}
          <li 
            onClick={() => !isCollapsed && setIsProjectsOpen(!isProjectsOpen)}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', justifyContent: isCollapsed ? 'center' : 'flex-start' }}
            title="Projects"
          >
            <span>📁</span>
            {!isCollapsed && (
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span>Projects</span>
                <span style={{ fontSize: '10px' }}>{isProjectsOpen ? '▼' : '▶'}</span>
              </div>
            )}
          </li>

          {/* 3. Submenu Items (Only visible if isProjectsOpen is true and not collapsed) */}
          {isProjectsOpen && !isCollapsed && (
            <div style={{ backgroundColor: 'rgba(0,0,0,0.05)', padding: '5px 0' }}>
              <li 
                className={activeTab === 'Projects' ? 'active' : ''}
                onClick={() => setActiveTab('Projects')}
                style={{ paddingLeft: '40px', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
              >
                <span>📝</span>
                <span>MOC Module</span>
              </li>
            </div>
          )}

          {/* 4. The rest of the menu */}
          {NAV_ITEMS.filter(item => item.id !== 'Dashboard').map(item => (
            <li 
              key={item.id} 
              className={activeTab === item.id ? 'active' : ''}
              onClick={() => setActiveTab(item.id)}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
              title={item.label}
            >
              <span>{item.icon}</span>
              {!isCollapsed && <span>{item.label}</span>}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;