import React, { useState } from 'react';
import './Settings.css';

const Settings = ({ theme, toggleTheme, currentUser, onNavigate }) => {
  // 1. Hide Deviation Decomposition Columns (Guideword, Parameter, Material, Equipment, Instrument)
  // Default is true (Enabled / Hidden by default as requested by user)
  const [hideDecomposition, setHideDecomposition] = useState(() => {
    const saved = localStorage.getItem('pha_hide_decomposition');
    return saved !== null ? saved === 'true' : true;
  });

  // 2. Dynamic Textfield Auto-Expansion
  const [dynamicTextfields, setDynamicTextfields] = useState(() => {
    const saved = localStorage.getItem('pha_dynamic_textfields');
    return saved !== null ? saved === 'true' : true;
  });

  // 3. Smart Recommendation Deduplication
  const [smartRecDeduplication, setSmartRecDeduplication] = useState(() => {
    const saved = localStorage.getItem('pha_rec_deduplication');
    return saved !== null ? saved === 'true' : true;
  });

  // 4. Base Table Font Size
  const [fontSize, setFontSize] = useState(() => {
    return localStorage.getItem('pha_font_size') || '13.5';
  });

  // 5. Toast notification
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleToggleHideDecomposition = () => {
    const nextVal = !hideDecomposition;
    setHideDecomposition(nextVal);
    localStorage.setItem('pha_hide_decomposition', String(nextVal));
    showToast(
      nextVal
        ? 'Decomposition columns will be HIDDEN by default in PHA Worksheet'
        : 'Decomposition columns will be SHOWN by default in PHA Worksheet'
    );
  };

  const handleToggleDynamicTextfields = () => {
    const nextVal = !dynamicTextfields;
    setDynamicTextfields(nextVal);
    localStorage.setItem('pha_dynamic_textfields', String(nextVal));
    showToast(`Dynamic textfields ${nextVal ? 'Enabled' : 'Disabled'}`);
  };

  const handleToggleDeduplication = () => {
    const nextVal = !smartRecDeduplication;
    setSmartRecDeduplication(nextVal);
    localStorage.setItem('pha_rec_deduplication', String(nextVal));
    showToast(`Smart recommendation deduplication ${nextVal ? 'Enabled' : 'Disabled'}`);
  };

  const handleFontSizeChange = (size) => {
    setFontSize(size);
    localStorage.setItem('pha_font_size', size);
    showToast(`Worksheet default font size set to ${size}px`);
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Reset all PHA Worksheet and application preferences to recommended defaults?')) {
      localStorage.setItem('pha_hide_decomposition', 'true');
      localStorage.setItem('pha_dynamic_textfields', 'true');
      localStorage.setItem('pha_rec_deduplication', 'true');
      localStorage.setItem('pha_font_size', '13.5');

      setHideDecomposition(true);
      setDynamicTextfields(true);
      setSmartRecDeduplication(true);
      setFontSize('13.5');

      showToast('All preferences reset to factory defaults');
    }
  };

  const handleClearWorksheetCache = () => {
    if (window.confirm('Clear local worksheet cache and trash history? This will not delete saved studies on the server.')) {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('pha_trash_') || key.startsWith('pha_cache_')) {
          localStorage.removeItem(key);
        }
      });
      showToast('Worksheet local cache cleared successfully');
    }
  };

  return (
    <div className="settings-container">
      {/* Header */}
      <div className="settings-header-wrap">
        <div className="settings-title-area">
          <h1>⚙️ Application Settings</h1>
          <p>Manage PHA Worksheet table preferences, column visibility defaults, and interface settings.</p>
        </div>
        <div className="settings-top-actions">
          {onNavigate && (
            <button
              type="button"
              className="btn-settings-back"
              onClick={() => onNavigate('dashboard')}
            >
              ← Back to Dashboard
            </button>
          )}
        </div>
      </div>

      <div className="settings-content-grid">
        {/* Section 1: PHA Worksheet Table Preferences */}
        <div className="settings-section-card">
          <div className="settings-section-header">
            <h2>📋 PHA Worksheet Table Preferences</h2>
            <span className="section-badge">Core Engine</span>
          </div>

          {/* Primary Request: Hide Deviation Decomposition Columns Default Option */}
          <div className="setting-item-row">
            <div className="setting-info">
              <div className="setting-title-wrap">
                <span className="setting-title">Hide Deviation Decomposition Columns by Default</span>
                <span className="setting-badge-highlight">User Preference</span>
              </div>
              <p className="setting-desc">
                When enabled (default), the 5 decomposition dropdown columns — <strong>Guideword</strong>, <strong>Parameter</strong>, <strong>Material</strong>, <strong>Equipment</strong>, and <strong>Instrument</strong> — are hidden automatically when opening the PHA Worksheet. You can still reveal them anytime in the worksheet toolbar.
              </p>
            </div>
            <div className="toggle-switch-container">
              <label className="toggle-switch" title="Toggle default visibility">
                <input
                  type="checkbox"
                  checked={hideDecomposition}
                  onChange={handleToggleHideDecomposition}
                />
                <span className="toggle-slider"></span>
              </label>
              <span className={`toggle-status-label ${hideDecomposition ? 'enabled' : 'disabled'}`}>
                {hideDecomposition ? 'Enabled (Hidden)' : 'Disabled (Visible)'}
              </span>
            </div>
          </div>

          {/* Dynamic Auto-Expanding Textfields */}
          <div className="setting-item-row">
            <div className="setting-info">
              <div className="setting-title-wrap">
                <span className="setting-title">Dynamic Textfield Auto-Expansion</span>
              </div>
              <p className="setting-desc">
                Automatically adjusts text input and comment box heights to fit all content seamlessly without vertical or horizontal scrollbars.
              </p>
            </div>
            <div className="toggle-switch-container">
              <label className="toggle-switch" title="Toggle dynamic textfield auto-expansion">
                <input
                  type="checkbox"
                  checked={dynamicTextfields}
                  onChange={handleToggleDynamicTextfields}
                />
                <span className="toggle-slider"></span>
              </label>
              <span className={`toggle-status-label ${dynamicTextfields ? 'enabled' : 'disabled'}`}>
                {dynamicTextfields ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          {/* Smart Recommendation Deduplication */}
          <div className="setting-item-row">
            <div className="setting-info">
              <div className="setting-title-wrap">
                <span className="setting-title">Smart Recommendation Deduplication & Sequential Numbering</span>
              </div>
              <p className="setting-desc">
                Ensures identical recommendations across different causes or nodes share the same canonical identifier (R1, R2, ...) and groups them into unified entries in the register.
              </p>
            </div>
            <div className="toggle-switch-container">
              <label className="toggle-switch" title="Toggle recommendation deduplication">
                <input
                  type="checkbox"
                  checked={smartRecDeduplication}
                  onChange={handleToggleDeduplication}
                />
                <span className="toggle-slider"></span>
              </label>
              <span className={`toggle-status-label ${smartRecDeduplication ? 'enabled' : 'disabled'}`}>
                {smartRecDeduplication ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          {/* Worksheet Base Font Size */}
          <div className="setting-item-row">
            <div className="setting-info">
              <div className="setting-title-wrap">
                <span className="setting-title">Worksheet Base Font Size</span>
              </div>
              <p className="setting-desc">
                Select the base typography scale for PHA Worksheet rows and columns.
              </p>
            </div>
            <div className="segmented-control">
              {[
                { size: '12', label: '12px (Compact)' },
                { size: '13.5', label: '13.5px (Standard)' },
                { size: '15', label: '15px (Large)' },
                { size: '16.5', label: '16.5px (XL)' }
              ].map((opt) => (
                <button
                  key={opt.size}
                  type="button"
                  className={`segmented-btn ${fontSize === opt.size ? 'active' : ''}`}
                  onClick={() => handleFontSizeChange(opt.size)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 2: Appearance & Theme */}
        <div className="settings-section-card">
          <div className="settings-section-header">
            <h2>🎨 Appearance & Theme</h2>
            <span className="section-badge">UI</span>
          </div>

          <div className="setting-item-row">
            <div className="setting-info">
              <div className="setting-title-wrap">
                <span className="setting-title">Interface Color Scheme</span>
              </div>
              <p className="setting-desc">
                Switch between high-contrast light enterprise theme and dark mode for low-light environments.
              </p>
            </div>
            <div className="segmented-control">
              <button
                type="button"
                className={`segmented-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => theme !== 'light' && toggleTheme()}
              >
                ☀️ Light Mode
              </button>
              <button
                type="button"
                className={`segmented-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => theme !== 'dark' && toggleTheme()}
              >
                🌙 Dark Mode
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: User & Session Info */}
        <div className="settings-section-card">
          <div className="settings-section-header">
            <h2>👤 Account Profile & Session</h2>
            <span className="section-badge">Account</span>
          </div>

          <div className="user-profile-box">
            <div className="user-avatar-circle">
              {(currentUser?.fullName || currentUser?.email || 'U').charAt(0)}
            </div>
            <div className="user-details">
              <h4>{currentUser?.fullName || 'Active User'}</h4>
              <p>Email: {currentUser?.email || 'N/A'}</p>
              <p style={{ marginTop: '2px' }}>Role: <strong>{currentUser?.role || 'Engineer'}</strong></p>
            </div>
          </div>
        </div>

        {/* Section 4: Maintenance & Reset Actions */}
        <div className="settings-section-card">
          <div className="settings-section-header">
            <h2>🛠️ Storage & Maintenance</h2>
            <span className="section-badge">System</span>
          </div>

          <div className="setting-item-row">
            <div className="setting-info">
              <div className="setting-title-wrap">
                <span className="setting-title">Clear Local Worksheet Cache</span>
              </div>
              <p className="setting-desc">
                Removes temporary local client caches, trash histories, and cached column sizes. Server studies remain untouched.
              </p>
            </div>
            <button
              type="button"
              className="btn-danger-outline"
              onClick={handleClearWorksheetCache}
            >
              Clear Local Cache
            </button>
          </div>

          <div className="setting-item-row">
            <div className="setting-info">
              <div className="setting-title-wrap">
                <span className="setting-title">Reset Preferences to Factory Defaults</span>
              </div>
              <p className="setting-desc">
                Restores default visibility (decomposition columns hidden), standard font size (13.5px), and recommendation deduplication.
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary-action"
              onClick={handleResetToDefaults}
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="settings-toast">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default Settings;
