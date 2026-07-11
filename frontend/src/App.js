import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';

function App() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="app-container">
      <Sidebar />

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <div>
            <h1>Dashboard Overview</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
              Welcome back! Here is your latest summary.
            </p>
          </div>
          <button className="theme-toggle" onClick={toggleTheme}>
            Toggle to {theme === 'dark' ? 'Light' : 'Dark'} Mode
          </button>
        </header>
      </main>
    </div>
  );
}

export default App;
