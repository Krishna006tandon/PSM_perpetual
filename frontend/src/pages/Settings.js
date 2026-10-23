import React, { useState } from 'react';
import './Settings.css';
import {
  getLopaMapping,
  saveLopaMapping,
  resetLopaMapping,
  UNIVERSAL_PHA_FIELD_GROUPS,
  SEVERITY_SOURCES,
  findFieldLabel
} from '../utils/lopaMapping';

const Settings = ({ theme, toggleTheme, currentUser, onNavigate, hasActiveStudy, activeStudy }) => {
  const getEffectiveFeatures = () => {
    if (Array.isArray(currentUser?.features) && currentUser.features.length > 0) return currentUser.features;
    try {
      const stored = JSON.parse(localStorage.getItem('userFeatures'));
      if (Array.isArray(stored)) return stored;
    } catch (e) {}
    return ['PHA', 'MOC', 'LOPA', 'BOWTIE'];
  };
  const effectiveFeatures = getEffectiveFeatures();
  const hasLopa = effectiveFeatures.includes('LOPA');

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

  // 5. LOPA Field Mapping State
  const [lopaMapping, setLopaMapping] = useState(() => getLopaMapping());

  // 6. Toast notification
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleLopaMappingChange = (key, value) => {
    setLopaMapping((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveLopaMapping = () => {
    saveLopaMapping(lopaMapping);
    showToast('LOPA field mapping saved successfully! Changes applied to LOPA Worksheet.');
  };

  const handleResetLopaMapping = () => {
    if (window.confirm('Reset PHA → LOPA field mapping to system defaults?')) {
      const def = resetLopaMapping();
      setLopaMapping(def);
      showToast('LOPA field mapping reset to default configuration');
    }
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
      const def = resetLopaMapping();
      setLopaMapping(def);

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

        {/* Section: PHA → LOPA Field Mapping Configuration (Only if LOPA module is unlocked) */}
        {hasLopa && (
        <div className="settings-section-card lopa-mapping-card">
          <div className="settings-section-header">
            <h2>🔗 PHA → LOPA Field Mapping Configuration</h2>
            <span className="section-badge" style={{ backgroundColor: 'rgba(2, 132, 199, 0.1)', color: '#0284c7' }}>
              LOPA Integration
            </span>
          </div>
          <p className="section-intro-text">
            Configure how PHA Worksheet data transfers into Layer of Protection Analysis (LOPA).
            When a consequence row is ticked with the <strong>LOPA</strong> checkbox in the PHA Worksheet, these mappings dictate what data appears in each LOPA column and report exports.
          </p>

          <div className="lopa-mapping-flow-preview">
            <div className="mapping-preview-item">
              <span className="mapping-source-badge">{findFieldLabel(lopaMapping.scenarioSource)}</span>
              <span className="mapping-arrow">➔</span>
              <span className="mapping-target-badge">{lopaMapping.scenarioLabel || 'Scenario'}</span>
            </div>
            <div className="mapping-preview-item">
              <span className="mapping-source-badge">{findFieldLabel(lopaMapping.initiatingEventSource)}</span>
              <span className="mapping-arrow">➔</span>
              <span className="mapping-target-badge">{lopaMapping.initiatingEventLabel || 'Initiating Event'}</span>
            </div>
            <div className="mapping-preview-item">
              <span className="mapping-source-badge">{findFieldLabel(lopaMapping.iplSource)}</span>
              <span className="mapping-arrow">➔</span>
              <span className="mapping-target-badge">{lopaMapping.iplLabel || 'IPL'}</span>
            </div>
            <div className="mapping-preview-item">
              <span className="mapping-source-badge">{findFieldLabel(lopaMapping.severitySource)}</span>
              <span className="mapping-arrow">➔</span>
              <span className="mapping-target-badge">Severity</span>
            </div>
          </div>

          <div className="lopa-mapping-grid">
            {/* 1. Consequence -> Scenario */}
            <div className="lopa-mapping-box">
              <div className="mapping-box-header">
                <span className="mapping-step-badge">1</span>
                <div>
                  <h4>Scenario Mapping</h4>
                  <small>Map ANY PHA field to Scenario</small>
                </div>
              </div>
              <div className="mapping-field-group">
                <label>Data Source Field:</label>
                <select
                  value={lopaMapping.scenarioSource}
                  onChange={(e) => handleLopaMappingChange('scenarioSource', e.target.value)}
                  className="mapping-select"
                >
                  {UNIVERSAL_PHA_FIELD_GROUPS.map((grp) => (
                    <optgroup key={grp.group} label={grp.group}>
                      {grp.options.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <span className="field-hint">
                  Selected: <strong>{findFieldLabel(lopaMapping.scenarioSource)}</strong>
                </span>
              </div>
              <div className="mapping-field-group" style={{ marginTop: '12px' }}>
                <label>Table Column Label:</label>
                <input
                  type="text"
                  value={lopaMapping.scenarioLabel}
                  onChange={(e) => handleLopaMappingChange('scenarioLabel', e.target.value)}
                  placeholder="e.g. Scenario"
                  className="mapping-input"
                />
              </div>
            </div>

            {/* 2. Cause -> Initiating Event */}
            <div className="lopa-mapping-box">
              <div className="mapping-box-header">
                <span className="mapping-step-badge">2</span>
                <div>
                  <h4>Initiating Event Mapping</h4>
                  <small>Map ANY PHA field to Initiating Event</small>
                </div>
              </div>
              <div className="mapping-field-group">
                <label>Data Source Field:</label>
                <select
                  value={lopaMapping.initiatingEventSource}
                  onChange={(e) => handleLopaMappingChange('initiatingEventSource', e.target.value)}
                  className="mapping-select"
                >
                  {UNIVERSAL_PHA_FIELD_GROUPS.map((grp) => (
                    <optgroup key={grp.group} label={grp.group}>
                      {grp.options.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <span className="field-hint">
                  Selected: <strong>{findFieldLabel(lopaMapping.initiatingEventSource)}</strong>
                </span>
              </div>
              <div className="mapping-field-group" style={{ marginTop: '12px' }}>
                <label>Table Column Label:</label>
                <input
                  type="text"
                  value={lopaMapping.initiatingEventLabel}
                  onChange={(e) => handleLopaMappingChange('initiatingEventLabel', e.target.value)}
                  placeholder="e.g. Initiating Event"
                  className="mapping-input"
                />
              </div>
            </div>

            {/* 3. Safeguard -> IPL */}
            <div className="lopa-mapping-box">
              <div className="mapping-step-badge-wrap" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid var(--divider)' }}>
                <span className="mapping-step-badge">3</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Independent Protection Layer (IPL)</h4>
                  <small style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Map ANY PHA field to IPL</small>
                </div>
              </div>
              <div className="mapping-field-group">
                <label>Data Source Field:</label>
                <select
                  value={lopaMapping.iplSource}
                  onChange={(e) => handleLopaMappingChange('iplSource', e.target.value)}
                  className="mapping-select"
                >
                  {UNIVERSAL_PHA_FIELD_GROUPS.map((grp) => (
                    <optgroup key={grp.group} label={grp.group}>
                      {grp.options.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <span className="field-hint">
                  Selected: <strong>{findFieldLabel(lopaMapping.iplSource)}</strong>
                </span>
              </div>
              <div className="mapping-field-group" style={{ marginTop: '12px' }}>
                <label>Table Column Label:</label>
                <input
                  type="text"
                  value={lopaMapping.iplLabel}
                  onChange={(e) => handleLopaMappingChange('iplLabel', e.target.value)}
                  placeholder="e.g. Independent Protection Layer (IPL)"
                  className="mapping-input"
                />
              </div>
            </div>

            {/* 4. Severity Source */}
            <div className="lopa-mapping-box">
              <div className="mapping-box-header">
                <span className="mapping-step-badge">4</span>
                <div>
                  <h4>Severity (S) Source</h4>
                  <small>From PHA Risk Ranking</small>
                </div>
              </div>
              <div className="mapping-field-group">
                <label>Severity Score Source:</label>
                <select
                  value={lopaMapping.severitySource}
                  onChange={(e) => handleLopaMappingChange('severitySource', e.target.value)}
                  className="mapping-select"
                >
                  {SEVERITY_SOURCES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <span className="field-hint">
                  {SEVERITY_SOURCES.find((s) => s.id === lopaMapping.severitySource)?.desc}
                </span>
              </div>
              <div className="mapping-field-group" style={{ marginTop: '12px' }}>
                <label>Transfer PHA Recommendations:</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                  <label className="toggle-switch" style={{ margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={!!lopaMapping.transferRecommendations}
                      onChange={(e) => handleLopaMappingChange('transferRecommendations', e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    {lopaMapping.transferRecommendations ? 'Auto-populate recommendations' : 'Manual entry only'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="lopa-mapping-actions">
            <button
              type="button"
              className="btn-save-mapping"
              onClick={handleSaveLopaMapping}
            >
              💾 Save Mapping Configuration
            </button>
            <button
              type="button"
              className="btn-reset-mapping"
              onClick={handleResetLopaMapping}
            >
              ↺ Reset to Defaults
            </button>
            {hasActiveStudy && (
              <button
                type="button"
                className="btn-lopa-preview-link"
                onClick={() => onNavigate('lopa')}
              >
                🛡️ Open LOPA Worksheet ↗
              </button>
            )}
          </div>
        </div>
        )}

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
