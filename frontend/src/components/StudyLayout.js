import React, { useState } from 'react';
import './StudyLayout.css';

// SVG Icons for the sidebar items
const ICONS = {
  data: '📊',
  nodes: '🏢',
  deviations: '⛙',
  causes: '🔗',
  pha: '📋',
  safeguards: '🛡️',
  recommendations: '🎯',
  checklists: '✅',
  risk: '⚠️',
  action: '⏱️',
  overview: '📄',
  team: '👥',
  docs: '📁',
  analysis: '📝',
  summary: '📉',
  close: '✖️'
};

const STUDY_NAV_ITEMS = [
  {
    id: 'study-data',
    label: 'STUDY DATA',
    icon: ICONS.data,
    subItems: [
      { id: 'overview', label: 'Overview', icon: ICONS.overview },
      { id: 'team', label: 'Team', icon: ICONS.team },
      { id: 'documents', label: 'Docs', icon: ICONS.docs }
    ]
  },
  {
    id: 'nodes',
    label: 'NODES',
    icon: ICONS.nodes,
    subItems: [
      { id: 'nodes-registry', label: 'Registry', icon: ICONS.nodes }
    ]
  },
  {
    id: 'deviations',
    label: 'DEVIATIONS',
    icon: ICONS.deviations,
    subItems: [
      { id: 'deviations-registry', label: 'Registry', icon: ICONS.deviations }
    ]
  },
  {
    id: 'causes',
    label: 'CAUSES WORKSHEET',
    icon: ICONS.causes,
    subItems: [
      { id: 'causes-registry', label: 'Registry', icon: ICONS.causes }
    ]
  },
  {
    id: 'pha-worksheets',
    label: 'PHA WORKSHEETS',
    icon: ICONS.pha,
    subItems: [
      { id: 'pha-worksheets-analysis', label: 'Analysis', icon: ICONS.analysis },
      { id: 'pha-risk-summary', label: 'Summary', icon: ICONS.summary }
    ]
  },
  { id: 'safeguards', label: 'SAFEGUARDS', icon: ICONS.safeguards, subItems: [] },
  { id: 'recommendations', label: 'RECOMMENDATIONS', icon: ICONS.recommendations, subItems: [] },
  { id: 'check-lists', label: 'CHECK LISTS', icon: ICONS.checklists, subItems: [] },
  { id: 'risk-criteria', label: 'RISK CRITERIA', icon: ICONS.risk, subItems: [] },
  { id: 'action-tracking', label: 'ACTION TRACKING', icon: ICONS.action, subItems: [] }
];

const StudyLayout = ({ activeTab, onBack, onNavigate, theme, toggleTheme, children }) => {
  const [openMenuId, setOpenMenuId] = useState(null);

  // Helper to determine if a primary tab is active based on activeTab
  const isPrimaryActive = (item) => {
    if (activeTab === item.id) return true;
    if (item.subItems && item.subItems.find(sub => sub.id === activeTab)) return true;
    // Map specific registry tabs back to their parent
    if (item.id === 'pha-worksheets' && activeTab === 'pha-worksheets') return true;
    return false;
  };

  const handleItemClick = (item) => {
    // If it has subItems, toggle the radial menu
    if (item.subItems && item.subItems.length > 0) {
      setOpenMenuId(openMenuId === item.id ? null : item.id);
    } else {
      // If no subItems, just navigate directly
      onNavigate(item.id);
      setOpenMenuId(null);
    }
  };

  const calculatePosition = (index, total) => {
    const R = 75; // Radius
    let angleDeg = 0;
    
    // Spread evenly in a semi-circle based on total items
    if (total === 1) angleDeg = 0;
    else if (total === 2) angleDeg = index === 0 ? -30 : 30;
    else if (total === 3) angleDeg = index === 0 ? -45 : (index === 1 ? 0 : 45);
    else if (total === 4) angleDeg = index === 0 ? -60 : (index === 1 ? -20 : (index === 2 ? 20 : 60));
    else {
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
    <div className="study-layout-container">
      <div className="study-main-layout">
        
        {/* Radial Animated Sidebar */}
        <div className="study-radial-sidebar">
          <div className="sidebar-header" onClick={onBack}>
            <span>&lt;</span> BACK TO LIST
          </div>
          
          <nav className="radial-sidebar-nav">
            <ul>
              {STUDY_NAV_ITEMS.map(item => {
                // If the menu is open, we append a "Hide" button to the subItems array
                const hasSubItems = item.subItems && item.subItems.length > 0;
                let activeSubItems = hasSubItems ? [...item.subItems] : [];
                
                if (hasSubItems) {
                  activeSubItems.push({ id: 'hide-menu', label: 'Hide', icon: ICONS.close, isHideButton: true });
                }

                return (
                  <li key={item.id} className="radial-item-container">
                    <div 
                      className={`radial-item ${isPrimaryActive(item) ? 'active' : ''}`}
                      onClick={() => handleItemClick(item)}
                    >
                      <span className="icon">{item.icon}</span>
                      <span className="label">{item.label}</span>
                    </div>
                    
                    {/* Radial Sub-menu */}
                    {hasSubItems && (
                      <div className={`radial-sub-menu-container ${openMenuId === item.id ? 'open' : ''}`}>
                        {activeSubItems.map((subItem, idx) => (
                          <div 
                            key={subItem.id} 
                            className={`radial-sub-tab ${subItem.isHideButton ? 'hide-btn' : ''}`}
                            style={calculatePosition(idx, activeSubItems.length)}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!subItem.isHideButton) {
                                // For pha-worksheets-analysis, we map it back to pha-worksheets which is what App expects
                                const navigateTo = subItem.id === 'pha-worksheets-analysis' ? 'pha-worksheets' : subItem.id;
                                onNavigate(navigateTo);
                              }
                              setOpenMenuId(null); // Close menu whether it's a real tab or the Hide button
                            }}
                          >
                            {subItem.icon}
                            <span className="tooltip">{subItem.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="study-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default StudyLayout;
