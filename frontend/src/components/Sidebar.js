import React, { useState } from 'react';

const NAV_ITEMS = [
  { id: 'Dashboard', label: 'Dashboard' },
  { id: 'Analytics', label: 'Analytics' },
  { id: 'Settings', label: 'Settings' },
];

function Sidebar({ activeTab, setActiveTab }) {
  // Local state to control if the submenu is open or closed
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);

  return (
    <aside className="sidebar">
      <h2>Brand</h2>
      <nav>
        <ul>
          {/* 1. Dashboard */}
          <li 
            className={activeTab === 'Dashboard' ? 'active' : ''}
            onClick={() => setActiveTab('Dashboard')}
            style={{ cursor: 'pointer' }}
          >
            Dashboard
          </li>

          {/* 2. Projects (Dropdown Header) */}
          <li 
            onClick={() => setIsProjectsOpen(!isProjectsOpen)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          >
            Projects <span style={{ fontSize: '10px' }}>{isProjectsOpen ? '▼' : '▶'}</span>
          </li>

          {/* 3. Submenu Items (Only visible if isProjectsOpen is true) */}
          {isProjectsOpen && (
            <div style={{ backgroundColor: 'rgba(0,0,0,0.05)', padding: '5px 0' }}>
              <li 
                className={activeTab === 'Projects' ? 'active' : ''}
                onClick={() => setActiveTab('Projects')}
                style={{ paddingLeft: '40px', fontSize: '14px', cursor: 'pointer' }}
              >
                MOC Module
              </li>
              {/* You can add more sub-projects here later like 'Permit to Work' */}
            </div>
          )}

          {/* 4. The rest of the menu */}
          {NAV_ITEMS.filter(item => item.id !== 'Dashboard').map(item => (
            <li 
              key={item.id} 
              className={activeTab === item.id ? 'active' : ''}
              onClick={() => setActiveTab(item.id)}
              style={{ cursor: 'pointer' }}
            >
              {item.label}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;