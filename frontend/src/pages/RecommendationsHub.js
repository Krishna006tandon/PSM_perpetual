import React, { useState, useEffect, useMemo } from 'react';
import './RecommendationsHub.css';

export default function RecommendationsHub({ 
  initialTab = 'pha', 
  onOpenStudy, 
  onOpenMoc,
  theme,
  toggleTheme 
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'pha');
  const [phaScenarios, setPhaScenarios] = useState([]);
  const [mocTickets, setMocTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // PHA Filters
  const [phaSearch, setPhaSearch] = useState('');
  const [selectedStudyId, setSelectedStudyId] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // MOC Filters
  const [mocSearch, setMocSearch] = useState('');
  const [mocStatusFilter, setMocStatusFilter] = useState('All');

  // Fetch data on mount
  useEffect(() => {
    fetchRecommendationsData();
  }, []);

  // Sync tab if initialTab changes from parent
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const fetchRecommendationsData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const apiUrl = process.env.REACT_APP_API_URL || 'https://api.perpetualsolutions.co.in';

    try {
      // 1. Fetch PHA Company-wide Recommendations
      const phaPromise = fetch(`${apiUrl}/api/scenarios/company/recommendations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.ok ? res.json() : [])
      .catch(err => {
        console.error('Error fetching PHA recommendations:', err);
        return [];
      });

      // 2. Fetch MOC Tickets for MOC Recommendations
      const mocPromise = fetch(`${apiUrl}/api/mocs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.ok ? res.json() : [])
      .catch(err => {
        console.error('Error fetching MOC tickets:', err);
        return [];
      });

      const [phaData, mocData] = await Promise.all([phaPromise, mocPromise]);
      setPhaScenarios(Array.isArray(phaData) ? phaData : []);
      setMocTickets(Array.isArray(mocData) ? mocData : []);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Extract MOC Action Items / Queries from MOC tickets
  const mocActionItems = useMemo(() => {
    const items = [];
    (mocTickets || []).forEach(ticket => {
      // Check queries
      if (Array.isArray(ticket.queries) && ticket.queries.length > 0) {
        ticket.queries.forEach((q, idx) => {
          items.push({
            id: `${ticket._id}-q-${idx}`,
            mocId: ticket.mocId || ticket._id,
            title: ticket.title,
            plant: ticket.plant || 'Main Plant',
            department: ticket.department || 'Operations',
            stageIndex: ticket.currentStageIndex,
            description: q.description || 'Action required',
            from: q.from || 'Reviewer',
            to: q.to || 'Assignee',
            status: q.status || 'Active',
            resolutionMessage: q.resolutionMessage || '',
            date: q.timestamp ? new Date(q.timestamp).toLocaleDateString() : '',
            ticketRaw: ticket
          });
        });
      } else {
        // If ticket has remarks or is an active MOC
        items.push({
          id: `${ticket._id}-main`,
          mocId: ticket.mocId || ticket._id,
          title: ticket.title,
          plant: ticket.plant || 'Main Plant',
          department: ticket.department || 'Operations',
          stageIndex: ticket.currentStageIndex,
          description: ticket.description || 'MOC Review & Implementation',
          from: ticket.requestor?.name || 'Initiator',
          to: ticket.assignedPM?.name || 'Review Team',
          status: ticket.status === 'Closed' ? 'Resolved' : 'Active',
          resolutionMessage: ticket.status === 'Closed' ? 'MOC Completed & Closed' : '',
          date: ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : '',
          ticketRaw: ticket
        });
      }
    });
    return items;
  }, [mocTickets]);

  // Unique Studies list for filter dropdown
  const uniqueStudies = useMemo(() => {
    const map = new Map();
    phaScenarios.forEach(sc => {
      const sId = sc.studyId?._id || sc.studyId;
      const sName = sc.studyId?.studyName || 'Unnamed Study';
      if (sId && !map.has(String(sId))) {
        map.set(String(sId), sName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [phaScenarios]);

  // Filtered PHA Scenarios
  const filteredPhaScenarios = useMemo(() => {
    return phaScenarios.filter(sc => {
      // Study filter
      if (selectedStudyId !== 'All') {
        const sId = sc.studyId?._id || sc.studyId;
        if (String(sId) !== String(selectedStudyId)) return false;
      }

      // Status filter
      const curStatus = sc.status || sc.recommendationData?.status || 'Open';
      if (selectedStatus !== 'All' && curStatus.toLowerCase() !== selectedStatus.toLowerCase()) {
        return false;
      }

      // Search filter
      if (phaSearch.trim()) {
        const query = phaSearch.toLowerCase();
        const recNo = (sc.recommendationNo || '').toLowerCase();
        const text = (sc.additionalProtection || '').toLowerCase();
        const studyName = (sc.studyId?.studyName || '').toLowerCase();
        const nodeDesc = (sc.nodeId?.description || '').toLowerCase();
        const devText = (sc.deviationId?.deviationAuto || '').toLowerCase();
        const causeText = (sc.causeId?.description || '').toLowerCase();

        return (
          recNo.includes(query) ||
          text.includes(query) ||
          studyName.includes(query) ||
          nodeDesc.includes(query) ||
          devText.includes(query) ||
          causeText.includes(query)
        );
      }

      return true;
    });
  }, [phaScenarios, selectedStudyId, selectedStatus, phaSearch]);

  // Filtered MOC Action Items
  const filteredMocItems = useMemo(() => {
    return mocActionItems.filter(item => {
      if (mocStatusFilter !== 'All' && item.status.toLowerCase() !== mocStatusFilter.toLowerCase()) {
        return false;
      }

      if (mocSearch.trim()) {
        const query = mocSearch.toLowerCase();
        return (
          item.mocId.toLowerCase().includes(query) ||
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.from.toLowerCase().includes(query) ||
          item.to.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [mocActionItems, mocStatusFilter, mocSearch]);

  // PHA Metrics
  const phaStats = useMemo(() => {
    let open = 0, inProgress = 0, closed = 0;
    phaScenarios.forEach(sc => {
      const st = (sc.status || 'Open').toLowerCase();
      if (st === 'closed' || st === 'resolved') closed++;
      else if (st === 'in progress') inProgress++;
      else open++;
    });
    return { total: phaScenarios.length, open, inProgress, closed };
  }, [phaScenarios]);

  // MOC Metrics
  const mocStats = useMemo(() => {
    let active = 0, resolved = 0;
    mocActionItems.forEach(it => {
      if (it.status.toLowerCase() === 'resolved') resolved++;
      else active++;
    });
    return { total: mocActionItems.length, active, resolved };
  }, [mocActionItems]);

  // Handle status update directly from the table
  const handleUpdatePhaStatus = async (scId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL || 'https://api.perpetualsolutions.co.in';

      // Optimistic update
      setPhaScenarios(prev => prev.map(sc => sc._id === scId ? { ...sc, status: newStatus } : sc));

      await fetch(`${apiUrl}/api/scenarios/${scId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (e) {
      console.error('Failed to update recommendation status:', e);
    }
  };

  // Export PHA Recommendations to CSV
  const handleExportPhaCsv = () => {
    if (!filteredPhaScenarios.length) {
      alert('No recommendations to export.');
      return;
    }

    const headers = ['Rec No', 'Study Name', 'PHA Type', 'Node', 'Deviation', 'Cause', 'Recommendation', 'Inherent Risk', 'Safeguards', 'Status'];
    const rows = filteredPhaScenarios.map(sc => [
      `"${sc.recommendationNo || ''}"`,
      `"${sc.studyId?.studyName || ''}"`,
      `"${sc.studyId?.phaType || ''}"`,
      `"${sc.nodeId?.description || ''}"`,
      `"${sc.deviationId?.deviationAuto || ''}"`,
      `"${sc.causeId?.description || ''}"`,
      `"${(sc.additionalProtection || '').replace(/"/g, '""')}"`,
      `"${sc.inherentRiskRR || ''}"`,
      `"${(sc.presentProtection || '').replace(/"/g, '""')}"`,
      `"${sc.status || 'Open'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PHA_Recommendations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export MOC Recommendations to CSV
  const handleExportMocCsv = () => {
    if (!filteredMocItems.length) {
      alert('No MOC recommendations to export.');
      return;
    }

    const headers = ['MOC ID', 'Title', 'Plant', 'Department', 'Action / Query', 'From', 'To', 'Status', 'Date'];
    const rows = filteredMocItems.map(it => [
      `"${it.mocId}"`,
      `"${it.title.replace(/"/g, '""')}"`,
      `"${it.plant}"`,
      `"${it.department}"`,
      `"${it.description.replace(/"/g, '""')}"`,
      `"${it.from}"`,
      `"${it.to}"`,
      `"${it.status}"`,
      `"${it.date}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MOC_Recommendations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="rec-hub-container">
      {/* Top Header */}
      <div className="rec-hub-header">
        <div className="rec-hub-title">
          <h1>Recommendations Register</h1>
          <p>Consolidated register of Safety (PHA) & Management of Change (MOC) recommendations across all units</p>
        </div>

        {/* 2-Option Tabs: PHA & MOC */}
        <div className="rec-tab-switcher">
          <button 
            type="button"
            className={`rec-tab-btn ${activeTab === 'pha' ? 'active' : ''}`}
            onClick={() => setActiveTab('pha')}
          >
            <span>📋 PHA Recommendations</span>
            <span className="rec-count-badge">{phaStats.total}</span>
          </button>
          
          <button 
            type="button"
            className={`rec-tab-btn ${activeTab === 'moc' ? 'active' : ''}`}
            onClick={() => setActiveTab('moc')}
          >
            <span>🔄 MOC Recommendations</span>
            <span className="rec-count-badge">{mocStats.total}</span>
          </button>
        </div>
      </div>

      {/* ===================== TAB 1: PHA RECOMMENDATIONS ===================== */}
      {activeTab === 'pha' && (
        <>
          {/* Stat Cards */}
          <div className="rec-stats-grid">
            <div className="rec-stat-card">
              <span className="rec-stat-label">Total PHA Recommendations</span>
              <span className="rec-stat-value">{phaStats.total}</span>
            </div>
            <div className="rec-stat-card stat-open">
              <span className="rec-stat-label">Open Actions</span>
              <span className="rec-stat-value">{phaStats.open}</span>
            </div>
            <div className="rec-stat-card stat-progress">
              <span className="rec-stat-label">In Progress</span>
              <span className="rec-stat-value">{phaStats.inProgress}</span>
            </div>
            <div className="rec-stat-card stat-closed">
              <span className="rec-stat-label">Closed / Implemented</span>
              <span className="rec-stat-value">{phaStats.closed}</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="rec-filter-bar">
            <div className="rec-filter-group">
              <input 
                type="text"
                className="rec-search-input"
                placeholder="Search recommendations, rec #, deviation..."
                value={phaSearch}
                onChange={(e) => setPhaSearch(e.target.value)}
              />

              <select 
                className="rec-select-filter"
                value={selectedStudyId}
                onChange={(e) => setSelectedStudyId(e.target.value)}
              >
                <option value="All">All Studies ({uniqueStudies.length})</option>
                {uniqueStudies.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <select 
                className="rec-select-filter"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Closed">Closed</option>
                <option value="Under Review">Under Review</option>
              </select>
            </div>

            <div className="rec-filter-group">
              <button 
                type="button" 
                className="rec-btn-action rec-btn-export"
                onClick={handleExportPhaCsv}
                title="Download CSV report"
              >
                📥 Export CSV
              </button>
              <button 
                type="button" 
                className="rec-btn-action"
                onClick={fetchRecommendationsData}
                title="Refresh recommendations"
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="rec-table-wrapper">
            {loading ? (
              <div className="rec-empty">
                <div className="rec-empty-icon">⏳</div>
                <h3>Loading PHA Recommendations...</h3>
              </div>
            ) : filteredPhaScenarios.length === 0 ? (
              <div className="rec-empty">
                <div className="rec-empty-icon">📋</div>
                <h3>No Recommendations Found</h3>
                <p>No safety recommendations match your current filter or search criteria.</p>
              </div>
            ) : (
              <table className="rec-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Rec #</th>
                    <th style={{ width: '180px' }}>Study / Unit</th>
                    <th style={{ width: '140px' }}>Node / Section</th>
                    <th style={{ width: '200px' }}>Deviation & Cause</th>
                    <th>Recommendation Description</th>
                    <th style={{ width: '90px' }}>Risk</th>
                    <th style={{ width: '130px' }}>Status</th>
                    <th style={{ width: '110px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPhaScenarios.map((sc, index) => {
                    const curStatus = sc.status || 'Open';
                    const statusClass = curStatus.toLowerCase().replace(/\s+/g, '-');
                    const studyObj = sc.studyId;

                    return (
                      <tr key={sc._id || index}>
                        <td>
                          <span className="badge-rec-no">{sc.recommendationNo || `REC-${index + 1}`}</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>
                            {studyObj?.studyName || 'Study'}
                          </div>
                          {studyObj?.phaType && (
                            <span className="badge-study-tag">{studyObj.phaType}</span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{sc.nodeId?.description || 'General'}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: '12.5px', color: '#1e40af', fontWeight: 600 }}>
                            {sc.deviationId?.deviationAuto || 'Deviation'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                            {sc.causeId?.description || 'Cause'}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>
                            {sc.additionalProtection || 'No recommendation specified'}
                          </div>
                          {sc.presentProtection && (
                            <div style={{ fontSize: '11.5px', color: '#059669', marginTop: '4px' }}>
                              <strong>Safeguard:</strong> {sc.presentProtection}
                            </div>
                          )}
                        </td>
                        <td>
                          {sc.inherentRiskRR ? (
                            <span style={{ 
                              padding: '2px 8px', 
                              borderRadius: '4px', 
                              fontSize: '11px', 
                              fontWeight: 800,
                              backgroundColor: sc.inherentRiskRR >= 15 ? '#fee2e2' : (sc.inherentRiskRR >= 8 ? '#fef3c7' : '#dcfce7'),
                              color: sc.inherentRiskRR >= 15 ? '#b91c1c' : (sc.inherentRiskRR >= 8 ? '#b45309' : '#15803d')
                            }}>
                              RR {sc.inherentRiskRR}
                            </span>
                          ) : '—'}
                        </td>
                        <td>
                          <select 
                            className={`status-select ${statusClass}`}
                            value={curStatus}
                            onChange={(e) => handleUpdatePhaStatus(sc._id, e.target.value)}
                          >
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Closed">Closed</option>
                            <option value="Under Review">Under Review</option>
                          </select>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {studyObj && onOpenStudy && (
                            <button 
                              type="button"
                              className="btn-open-link"
                              onClick={() => onOpenStudy(studyObj)}
                              title="Open this study"
                            >
                              Open Study ➔
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ===================== TAB 2: MOC RECOMMENDATIONS ===================== */}
      {activeTab === 'moc' && (
        <>
          {/* MOC Stats */}
          <div className="rec-stats-grid">
            <div className="rec-stat-card">
              <span className="rec-stat-label">Total MOC Action Items</span>
              <span className="rec-stat-value">{mocStats.total}</span>
            </div>
            <div className="rec-stat-card stat-open">
              <span className="rec-stat-label">Active / Pending</span>
              <span className="rec-stat-value">{mocStats.active}</span>
            </div>
            <div className="rec-stat-card stat-closed">
              <span className="rec-stat-label">Resolved / Closed</span>
              <span className="rec-stat-value">{mocStats.resolved}</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="rec-filter-bar">
            <div className="rec-filter-group">
              <input 
                type="text"
                className="rec-search-input"
                placeholder="Search MOC ID, title, query text, reviewer..."
                value={mocSearch}
                onChange={(e) => setMocSearch(e.target.value)}
              />

              <select 
                className="rec-select-filter"
                value={mocStatusFilter}
                onChange={(e) => setMocStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>

            <div className="rec-filter-group">
              <button 
                type="button" 
                className="rec-btn-action rec-btn-export"
                onClick={handleExportMocCsv}
                title="Download CSV report"
              >
                📥 Export CSV
              </button>
              <button 
                type="button" 
                className="rec-btn-action"
                onClick={fetchRecommendationsData}
                title="Refresh recommendations"
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* MOC Table */}
          <div className="rec-table-wrapper">
            {loading ? (
              <div className="rec-empty">
                <div className="rec-empty-icon">⏳</div>
                <h3>Loading MOC Action Items...</h3>
              </div>
            ) : filteredMocItems.length === 0 ? (
              <div className="rec-empty">
                <div className="rec-empty-icon">🔄</div>
                <h3>No MOC Action Items Found</h3>
                <p>No queries or action items match your current filter.</p>
              </div>
            ) : (
              <table className="rec-table">
                <thead>
                  <tr>
                    <th style={{ width: '130px' }}>MOC ID</th>
                    <th style={{ width: '220px' }}>MOC Title & Dept</th>
                    <th>Action / Recommendation</th>
                    <th style={{ width: '180px' }}>Reviewer ➔ Assignee</th>
                    <th style={{ width: '100px' }}>Status</th>
                    <th style={{ width: '180px' }}>Resolution</th>
                    <th style={{ width: '110px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMocItems.map(item => (
                    <tr key={item.id}>
                      <td>
                        <span className="badge-rec-no">{item.mocId}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.title}</div>
                        <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                          {item.plant} • {item.department}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.description}</div>
                        {item.date && (
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                            Created: {item.date}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '12px' }}>
                          <span style={{ color: '#64748b' }}>From:</span> <strong>{item.from}</strong>
                        </div>
                        <div style={{ fontSize: '12px', marginTop: '2px' }}>
                          <span style={{ color: '#64748b' }}>To:</span> <strong>{item.to}</strong>
                        </div>
                      </td>
                      <td>
                        <span className={`status-select ${item.status === 'Resolved' ? 'closed' : 'open'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        {item.resolutionMessage ? (
                          <div style={{ fontSize: '12px', color: '#15803d', fontWeight: 500 }}>
                            {item.resolutionMessage}
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Pending resolution</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {onOpenMoc && (
                          <button 
                            type="button"
                            className="btn-open-link"
                            onClick={onOpenMoc}
                            title="Go to MOC Dashboard"
                          >
                            Open MOC ➔
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
