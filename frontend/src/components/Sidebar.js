import React, { useState } from 'react';

const NAV_ITEMS = [
  { 
    id: 'dashboard', 
    label: 'Dashboard',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect>
      </svg>
    ),
    subItems: []
  },
  { 
    id: 'pha', 
    label: 'PHA Workspaces',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
      </svg>
    ),
    subItems: [
      { id: 'pha-new', label: 'New Study', icon: '+' },
      { id: 'pha-list', label: 'All Studies', icon: '☰' },
      { id: 'pha-archive', label: 'Archive', icon: '◷' }
    ]
  },
  { 
    id: 'moc', 
    label: 'MOC Workspaces',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    ),
    subItems: []
  },
  { 
    id: 'analytics', 
    label: 'Analytics',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10"></path><path d="M12 20V4"></path><path d="M6 20v-6"></path>
      </svg>
    ),
    subItems: []
  },
  { 
    id: 'settings', 
    label: 'Settings',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
    ),
    subItems: []
  },
];

function Sidebar({ activeView, onNavigate }) {
  const [openMenuId, setOpenMenuId] = useState(null);

  const handleItemClick = (item) => {
    onNavigate(item.id);
    
    // Toggle circular sub-menu if it has sub-items
    if (item.subItems && item.subItems.length > 0) {
      setOpenMenuId(openMenuId === item.id ? null : item.id);
    } else {
      setOpenMenuId(null);
    }
  };

  const calculatePosition = (index, total) => {
    // Spread in a semi-circle from -45deg to 45deg
    const R = 75; // Radius
    let angleDeg = 0;
    if (total === 1) angleDeg = 0;
    else if (total === 2) angleDeg = index === 0 ? -30 : 30;
    else if (total === 3) angleDeg = index === 0 ? -45 : (index === 1 ? 0 : 45);
    else {
      // General formula for spreading from -60 to 60
      const startAngle = -60;
      const endAngle = 60;
      angleDeg = startAngle + (index * ((endAngle - startAngle) / (total - 1)));
    }
    
    const angleRad = (angleDeg * Math.PI) / 180;
    const x = Math.cos(angleRad) * R;
    const y = Math.sin(angleRad) * R;
    
    return { '--target-x': `${x}px`, '--target-y': `${y}px` };
  };

  return (
    <aside className="sidebar">
      <h2>Brand</h2>
      <nav className="sidebar-nav">
        <ul>
          {NAV_ITEMS.map(item => (
            <li key={item.id} className="sidebar-item-container">
              <div 
                className={`sidebar-item ${activeView === item.id ? 'active' : ''}`}
                onClick={() => handleItemClick(item)}
              >
                <span className="icon">{item.icon}</span>
                <span className="label">{item.label}</span>
              </div>
              
              {/* Radial Sub-menu */}
              {item.subItems && item.subItems.length > 0 && (
                <div className={`sub-menu-container ${openMenuId === item.id ? 'open' : ''}`}>
                  {item.subItems.map((subItem, idx) => (
                    <div 
                      key={subItem.id} 
                      className="sub-tab" 
                      style={calculatePosition(idx, item.subItems.length)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate(subItem.id);
                        setOpenMenuId(null);
                      }}
                    >
                      {subItem.icon}
                      <span className="tooltip">{subItem.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;
