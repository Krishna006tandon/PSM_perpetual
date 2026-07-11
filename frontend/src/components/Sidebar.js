import React, { useState } from 'react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'projects', label: 'Projects' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'settings', label: 'Settings' },
];

function Sidebar() {
  const [activeNav, setActiveNav] = useState('dashboard');

  return (
    <aside className="sidebar">
      <h2>Brand</h2>
      <nav>
        <ul>
          {NAV_ITEMS.map(item => (
            <li 
              key={item.id} 
              className={activeNav === item.id ? 'active' : ''}
              onClick={() => setActiveNav(item.id)}
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
