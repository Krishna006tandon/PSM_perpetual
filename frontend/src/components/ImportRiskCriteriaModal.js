import React, { useState, useEffect, useMemo, useRef } from 'react';
import './ImportRiskCriteriaModal.css';

const ImportRiskCriteriaModal = ({
  isOpen,
  onClose,
  targetStudy,
  onImportSuccess
}) => {
  const [studies, setStudies] = useState([]);
  const [loadingStudies, setLoadingStudies] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('ALL');
  const [selectedStudyId, setSelectedStudyId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Cache fetched criteria so switching between studies is instant
  const [criteriaCache, setCriteriaCache] = useState({});
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewTab, setPreviewTab] = useState('severity'); // 'severity' | 'likelihood' | 'matrix'
  const [importing, setImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef(null);
  const API_URL = process.env.REACT_APP_API_URL || 'https://api.perpetualsolutions.co.in';

  // Fetch all accessible studies when modal opens
  useEffect(() => {
    if (!isOpen) return;
    fetchStudies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const fetchStudies = async () => {
    setLoadingStudies(true);
    setErrorMsg('');
    try {
      const token = localStorage.getItem('token');
      let res = await fetch(`${API_URL}/api/studies/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        res = await fetch(`${API_URL}/api/studies/recent?all=true`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      if (res.ok) {
        const data = await res.json();
        const otherStudies = Array.isArray(data)
          ? data.filter(s => s._id !== targetStudy._id)
          : [];
        setStudies(otherStudies);

        if (otherStudies.length > 0) {
          setSelectedStudyId(otherStudies[0]._id);
        }
      } else {
        setErrorMsg('Failed to load studies list from server.');
      }
    } catch (err) {
      console.error('Error fetching studies:', err);
      setErrorMsg('Network error while loading studies.');
    } finally {
      setLoadingStudies(false);
    }
  };

  // Distinct projects list
  const projectsList = useMemo(() => {
    const map = new Map();
    studies.forEach(s => {
      const pName = (s.projectName && s.projectName.trim()) || 'Unassigned Project';
      map.set(pName, (map.get(pName) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [studies]);

  // Filtered studies based on project filter and search input
  const filteredStudies = useMemo(() => {
    return studies.filter(s => {
      const pName = (s.projectName && s.projectName.trim()) || 'Unassigned Project';
      if (selectedProjectId !== 'ALL' && pName !== selectedProjectId) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const sName = (s.studyName || '').toLowerCase();
        const pStr = pName.toLowerCase();
        const fac = (s.facility || '').toLowerCase();
        const unit = (s.plantUnit || '').toLowerCase();
        return sName.includes(query) || pStr.includes(query) || fac.includes(query) || unit.includes(query);
      }
      return true;
    });
  }, [studies, selectedProjectId, searchQuery]);

  // Whenever selectedStudyId changes, fetch preview if not already cached
  useEffect(() => {
    if (!selectedStudyId) return;
    if (criteriaCache[selectedStudyId]) return;

    const fetchPreview = async () => {
      setLoadingPreview(true);
      setErrorMsg('');
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/risk-criteria/${selectedStudyId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setCriteriaCache(prev => ({ ...prev, [selectedStudyId]: data }));
        } else {
          setErrorMsg('Failed to load risk criteria for this study.');
        }
      } catch (err) {
        console.error('Error fetching criteria preview:', err);
        setErrorMsg('Network error while previewing risk criteria.');
      } finally {
        setLoadingPreview(false);
      }
    };

    fetchPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudyId]);

  const currentPreview = criteriaCache[selectedStudyId] || null;
  const selectedStudyObj = useMemo(() => {
    return studies.find(s => s._id === selectedStudyId);
  }, [studies, selectedStudyId]);

  // Check if current preview has custom populated consequence text
  const isPopulated = useMemo(() => {
    if (!currentPreview || !currentPreview.severityLevels) return false;
    return currentPreview.severityLevels.some(s => {
      if (!s.consequences) return false;
      return Object.values(s.consequences).some(v => typeof v === 'string' && v.trim().length > 0);
    });
  }, [currentPreview]);

  // Execute Import
  const handleImport = async () => {
    if (!selectedStudyId || !currentPreview) return;

    const confirmMsg = `Import Risk Criteria from "${selectedStudyObj?.studyName || 'selected study'}" into "${targetStudy.studyName}"?\n\nThis will apply all consequence categories, severity descriptions, likelihood levels, and matrix colors to this study.`;
    if (!window.confirm(confirmMsg)) return;

    setImporting(true);
    setErrorMsg('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/risk-criteria/${targetStudy._id}/import/${selectedStudyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const updated = await res.json();
        if (onImportSuccess) {
          onImportSuccess(updated);
        }
        onClose();
        alert(`Risk criteria successfully imported from "${selectedStudyObj?.studyName || 'selected study'}"!`);
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.message || 'Server error while importing risk criteria.');
      }
    } catch (err) {
      console.error('Error importing criteria:', err);
      setErrorMsg('Network error while importing risk criteria.');
    } finally {
      setImporting(false);
    }
  };

  // Export current preview as JSON template
  const handleExportJSON = () => {
    if (!currentPreview) return;
    const exportData = {
      sourceStudyName: selectedStudyObj?.studyName,
      projectName: selectedStudyObj?.projectName,
      consequenceCategories: currentPreview.consequenceCategories,
      severityLevels: currentPreview.severityLevels,
      likelihoodLevels: currentPreview.likelihoodLevels,
      matrixCells: currentPreview.matrixCells,
      riskCategories: currentPreview.riskCategories,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RiskCriteria_${(selectedStudyObj?.studyName || 'template').replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import from JSON file
  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed.severityLevels || !parsed.likelihoodLevels) {
          throw new Error('Invalid format: Missing severity or likelihood levels.');
        }

        if (!window.confirm(`Import risk criteria from "${file.name}" into "${targetStudy.studyName}"?`)) {
          return;
        }

        setImporting(true);
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/risk-criteria/${targetStudy._id}/import`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ criteria: parsed })
        });

        if (res.ok) {
          const updated = await res.json();
          if (onImportSuccess) {
            onImportSuccess(updated);
          }
          onClose();
          alert(`Risk criteria successfully imported from "${file.name}"!`);
        } else {
          const err = await res.json().catch(() => ({}));
          setErrorMsg(err.message || 'Failed to import JSON file.');
        }
      } catch (err) {
        console.error('File parse error:', err);
        setErrorMsg('Invalid JSON file format for Risk Criteria.');
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="import-criteria-overlay" onClick={onClose}>
      <div className="import-criteria-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="import-criteria-header">
          <div className="import-header-left">
            <div className="import-header-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <div>
              <h3 className="import-criteria-title">
                IMPORT RISK CRITERIA & MATRIX
              </h3>
              <p className="import-criteria-subtitle">
                Fetch and clone risk consequence definitions, likelihood ratings & matrix colors from another project or study
              </p>
            </div>
          </div>
          <button className="import-criteria-close" onClick={onClose} title="Close (Esc)">&times;</button>
        </div>

        {/* 2-Column Split Workspace */}
        <div className="import-criteria-workspace">
          {/* Left Column: Studies Explorer */}
          <div className="import-sidebar">
            <div className="import-sidebar-top">
              <div className="import-sidebar-heading">
                <span>Source Studies</span>
                <span className="import-count-pill">{filteredStudies.length} Available</span>
              </div>

              {/* Search Bar */}
              <div className="import-search-box">
                <span className="import-search-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <input
                  type="text"
                  className="import-search-input"
                  placeholder="Search by study, unit, facility..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Project Filter Pills */}
              <div className="import-project-pills">
                <button
                  className={`import-project-pill ${selectedProjectId === 'ALL' ? 'active' : ''}`}
                  onClick={() => setSelectedProjectId('ALL')}
                >
                  All Projects ({studies.length})
                </button>
                {projectsList.map(([pName, count]) => (
                  <button
                    key={pName}
                    className={`import-project-pill ${selectedProjectId === pName ? 'active' : ''}`}
                    onClick={() => setSelectedProjectId(pName)}
                  >
                    📁 {pName} ({count})
                  </button>
                ))}
              </div>
            </div>

            {/* Studies Cards List */}
            <div className="import-studies-list">
              {loadingStudies ? (
                <div className="import-state-wrapper">
                  <div className="import-spinner-circle"></div>
                  <span style={{ fontSize: '12px' }}>Loading studies...</span>
                </div>
              ) : filteredStudies.length === 0 ? (
                <div className="import-state-wrapper">
                  <div className="import-state-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '600' }}>No studies found</span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Try adjusting project filter or search query</span>
                </div>
              ) : (
                filteredStudies.map(s => {
                  const isSelected = s._id === selectedStudyId;
                  const pName = (s.projectName && s.projectName.trim()) || 'Unassigned Project';
                  return (
                    <div
                      key={s._id}
                      className={`import-study-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedStudyId(s._id)}
                    >
                      <div className="import-study-card-header">
                        <h4 className="import-card-title">{s.studyName}</h4>
                        {isSelected && (
                          <div className="import-card-check">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        )}
                      </div>

                      <div className="import-card-meta">
                        <span className="import-card-project-badge">
                          📁 {pName}
                        </span>
                        {s.plantUnit && (
                          <span className="import-card-unit">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                            </svg>
                            {s.plantUnit}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Live Interactive Preview */}
          <div className="import-preview-area">
            {errorMsg && (
              <div style={{ padding: '10px 24px', background: '#fef2f2', borderBottom: '1px solid #fca5a5', color: '#b91c1c', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}

            {!selectedStudyId ? (
              <div className="import-state-wrapper" style={{ height: '100%' }}>
                <div className="import-state-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <h3>Select a Study on the Left</h3>
                <p style={{ fontSize: '13px', maxWidth: '320px', color: '#94a3b8' }}>
                  Choose any study from any project to preview its consequence categories and risk matrix before importing.
                </p>
              </div>
            ) : loadingPreview && !currentPreview ? (
              <div className="import-state-wrapper" style={{ height: '100%' }}>
                <div className="import-spinner-circle"></div>
                <span style={{ fontSize: '13px', fontWeight: '600' }}>Loading Risk Criteria from study...</span>
              </div>
            ) : !currentPreview ? (
              <div className="import-state-wrapper" style={{ height: '100%' }}>
                <span>No risk criteria configured for this study.</span>
              </div>
            ) : (
              <>
                {/* Top Detail Header */}
                <div className="import-detail-header">
                  <div className="import-detail-title-group">
                    <div className="import-detail-breadcrumbs">
                      <span>📁 {selectedStudyObj?.projectName || 'Unassigned Project'}</span>
                      <span>›</span>
                      <span>{selectedStudyObj?.facility || 'Facility'}</span>
                      {selectedStudyObj?.plantUnit && (
                        <>
                          <span>›</span>
                          <span>Unit: {selectedStudyObj.plantUnit}</span>
                        </>
                      )}
                    </div>
                    <h2 className="import-detail-study-name">
                      {selectedStudyObj?.studyName}
                    </h2>
                  </div>

                  <div>
                    {isPopulated ? (
                      <span className="badge-status-populated">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Populated Definitions
                      </span>
                    ) : (
                      <span className="badge-status-default">
                        ℹ️ Default Blank Criteria
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Metrics Banner */}
                <div className="import-metrics-banner">
                  <div className="import-metric-box">
                    <span className="import-metric-label">Severity Levels</span>
                    <span className="import-metric-value">
                      ⚡ {currentPreview.severityLevels?.length || 0} Levels
                    </span>
                  </div>

                  <div className="import-metric-box">
                    <span className="import-metric-label">Likelihood Levels</span>
                    <span className="import-metric-value">
                      📊 {currentPreview.likelihoodLevels?.length || 0} Levels
                    </span>
                  </div>

                  <div className="import-metric-box">
                    <span className="import-metric-label">Matrix Size</span>
                    <span className="import-metric-value">
                      {(currentPreview.severityLevels?.length || 0)} &times; {(currentPreview.likelihoodLevels?.length || 0)} Cells
                    </span>
                  </div>

                  <div className="import-metric-box" style={{ gridColumn: 'span 2' }}>
                    <span className="import-metric-label">Risk Categories & Colors</span>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '3px' }}>
                      {(currentPreview.riskCategories || []).map(cat => (
                        <span
                          key={cat.name}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '2px 7px',
                            borderRadius: '12px',
                            backgroundColor: '#ffffff',
                            border: `1.5px solid ${cat.color || '#cbd5e1'}`
                          }}
                        >
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: cat.color }}></span>
                          {cat.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tabs Bar */}
                <div className="import-tabs-bar">
                  <button
                    className={`import-tab-pill ${previewTab === 'severity' ? 'active' : ''}`}
                    onClick={() => setPreviewTab('severity')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    Consequence Categories (Severity)
                  </button>
                  <button
                    className={`import-tab-pill ${previewTab === 'likelihood' ? 'active' : ''}`}
                    onClick={() => setPreviewTab('likelihood')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                    Likelihood Definitions
                  </button>
                  <button
                    className={`import-tab-pill ${previewTab === 'matrix' ? 'active' : ''}`}
                    onClick={() => setPreviewTab('matrix')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <line x1="3" y1="9" x2="21" y2="9" />
                      <line x1="3" y1="15" x2="21" y2="15" />
                      <line x1="9" y1="3" x2="9" y2="21" />
                      <line x1="15" y1="3" x2="15" y2="21" />
                    </svg>
                    Risk Matrix Grid
                  </button>
                </div>

                {/* Preview Content Area */}
                <div className="import-preview-body">
                  {/* Tab 1: Consequence Categories (Severity Definitions) */}
                  {previewTab === 'severity' && (
                    <div className="import-table-card">
                      <table className="import-table-view">
                        <thead>
                          <tr>
                            <th className="col-level">Lvl</th>
                            <th className="col-name">Name</th>
                            {(currentPreview.consequenceCategories || []).map(cat => {
                              const catLower = cat.toLowerCase();
                              let dotClass = 'cat-safety';
                              if (catLower.includes('env')) dotClass = 'cat-env';
                              else if (catLower.includes('asset')) dotClass = 'cat-asset';
                              else if (catLower.includes('rep')) dotClass = 'cat-rep';

                              return (
                                <th key={cat}>
                                  <div className="th-category-header">
                                    <span className={`cat-indicator-dot ${dotClass}`}></span>
                                    {cat}
                                  </div>
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {(currentPreview.severityLevels || []).map(s => (
                            <tr key={s.level}>
                              <td className="col-level">{s.level}</td>
                              <td className="col-name">{s.name || `Severity ${s.level}`}</td>
                              {(currentPreview.consequenceCategories || []).map(cat => (
                                <td key={cat}>
                                  {(s.consequences && s.consequences[cat] && s.consequences[cat].trim()) ? (
                                    s.consequences[cat]
                                  ) : (
                                    <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>—</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Tab 2: Likelihood Definitions */}
                  {previewTab === 'likelihood' && (
                    <div className="import-table-card">
                      <table className="import-table-view">
                        <thead>
                          <tr>
                            <th className="col-level">Lvl</th>
                            <th className="col-name">Name</th>
                            <th>Description</th>
                            <th style={{ width: '220px' }}>Frequency</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(currentPreview.likelihoodLevels || []).map(l => (
                            <tr key={l.level}>
                              <td className="col-level">{l.level}</td>
                              <td className="col-name">{l.name || `Likelihood ${l.level}`}</td>
                              <td>
                                {l.description ? (
                                  l.description
                                ) : (
                                  <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>—</span>
                                )}
                              </td>
                              <td>
                                {l.frequency ? (
                                  <span style={{ fontWeight: '600', color: '#1e3a8a' }}>{l.frequency}</span>
                                ) : (
                                  <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Tab 3: Risk Matrix Grid */}
                  {previewTab === 'matrix' && (
                    <div className="import-matrix-grid-card">
                      <table className="import-matrix-table">
                        <thead>
                          <tr>
                            <th colSpan="2" rowSpan="2" style={{ background: '#f8fafc' }}></th>
                            <th colSpan={currentPreview.severityLevels?.length || 1}>SEVERITY</th>
                          </tr>
                          <tr>
                            {(currentPreview.severityLevels || []).map(s => (
                              <th key={s.level}>{s.name} ({s.level})</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(currentPreview.likelihoodLevels || []).map((l, i) => (
                            <tr key={l.level}>
                              {i === 0 && (
                                <th
                                  rowSpan={currentPreview.likelihoodLevels.length}
                                  style={{
                                    writingMode: 'vertical-rl',
                                    transform: 'rotate(180deg)',
                                    background: '#f1f5f9',
                                    padding: '8px'
                                  }}
                                >
                                  LIKELIHOOD
                                </th>
                              )}
                              <th style={{ textAlign: 'right' }}>{l.name} ({l.level})</th>
                              {(currentPreview.severityLevels || []).map(s => {
                                const cell = (currentPreview.matrixCells || []).find(
                                  c => c.severityLevel === s.level && c.likelihoodLevel === l.level
                                ) || {};
                                const categoryObj = (currentPreview.riskCategories || []).find(c => c.name === cell.category);
                                const cellBg = categoryObj ? categoryObj.color : '#ffffff';

                                return (
                                  <td
                                    key={s.level}
                                    style={{
                                      backgroundColor: cellBg,
                                      color: '#0f172a'
                                    }}
                                  >
                                    <div className="import-matrix-cell-content">
                                      <span className="import-matrix-score">{cell.score}</span>
                                      <span className="import-matrix-category">{cell.category}</span>
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="import-criteria-footer">
          <div className="import-footer-left">
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <button
              className="btn-file-pill"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              title="Upload JSON Risk Criteria file"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload JSON File
            </button>
            {currentPreview && (
              <button
                className="btn-file-pill"
                onClick={handleExportJSON}
                title="Download this criteria template as JSON"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export JSON
              </button>
            )}
          </div>

          <div className="import-footer-right">
            <span style={{ fontSize: '12px', color: '#64748b', marginRight: '6px' }}>
              Target: <strong>{targetStudy.studyName}</strong>
            </span>
            <button className="btn-action-cancel" onClick={onClose} disabled={importing}>
              CANCEL
            </button>
            <button
              className="btn-action-import"
              onClick={handleImport}
              disabled={importing || !selectedStudyId || !currentPreview}
            >
              {importing ? (
                <>
                  <div className="import-spinner-circle" style={{ width: '14px', height: '14px', borderWidth: '2px', borderTopColor: '#ffffff' }}></div>
                  IMPORTING...
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  IMPORT & APPLY CRITERIA
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportRiskCriteriaModal;
