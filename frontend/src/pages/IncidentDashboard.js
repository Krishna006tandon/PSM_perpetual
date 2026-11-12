import React, { useState, useEffect, useCallback } from 'react';
import IncidentFIRModal from '../components/IncidentFIRModal';
import ManagerTriageModal from '../components/ManagerTriageModal';
import IncidentDetailsModal from '../components/IncidentDetailsModal';
import InvestigationWorkspaceModal from '../components/InvestigationWorkspaceModal';
import CapaWorkspaceModal from '../components/CapaWorkspaceModal';
import { getApiUrl, safeFetchJson } from '../utils/apiConfig';
import './IncidentDashboard.css';

const API_URL = getApiUrl();

export default function IncidentDashboard({ currentUser, onBack }) {
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    tier1Count: 0,
    tier2Count: 0,
    tier3Count: 0,
    tier4Count: 0,
    nearMissCount: 0,
    otherIncidentCount: 0,
    pendingClassificationCount: 0,
    pendingTriageCount: 0,
    overdueSlaCount: 0,
    activeInvestigationCount: 0,
    closedCount: 0,
    openCapaCount: 0,
    overdueCapaCount: 0,
    pendingCapaVerificationCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTier, setSelectedTier] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [slaFilter, setSlaFilter] = useState('all');

  // Modals
  const [isFIRModalOpen, setIsFIRModalOpen] = useState(false);
  const [selectedIncidentForTriage, setSelectedIncidentForTriage] = useState(null);
  const [selectedIncidentForDetails, setSelectedIncidentForDetails] = useState(null);
  const [selectedIncidentForInvestigation, setSelectedIncidentForInvestigation] = useState(null);
  const [selectedIncidentForCapa, setSelectedIncidentForCapa] = useState(null);
  const [capaInitialWhyNodeId, setCapaInitialWhyNodeId] = useState(null);

  const fetchIncidentsAndStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };

      const params = new URLSearchParams();
      if (selectedTier !== 'all') params.append('tier', selectedTier);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      if (slaFilter !== 'all') params.append('slaFilter', slaFilter);
      if (searchTerm) params.append('search', searchTerm);

      const [incidentsData, statsData] = await Promise.all([
        safeFetchJson(`${API_URL}/api/incidents?${params.toString()}`, { headers }),
        safeFetchJson(`${API_URL}/api/incidents/stats`, { headers })
      ]);

      setIncidents(incidentsData);
      setStats(statsData);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError(err.message);
      setLoading(false);
    }
  }, [selectedTier, selectedStatus, slaFilter, searchTerm]);

  useEffect(() => {
    fetchIncidentsAndStats();
  }, [fetchIncidentsAndStats]);

  const handleIncidentCreated = (newIncident) => {
    fetchIncidentsAndStats();
    setSelectedIncidentForDetails(newIncident);
  };

  const handleTriageSaved = (updated) => {
    fetchIncidentsAndStats();
  };

  const handleDeleteIncident = async (id, incidentNumber) => {
    if (!window.confirm(`Are you sure you want to delete incident ${incidentNumber}? This will remove all associated Why-Why nodes and CAPA items.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/incidents/${id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (!res.ok) throw new Error('Failed to delete incident');
      fetchIncidentsAndStats();
    } catch (err) {
      alert(err.message);
    }
  };

  const getTierBadgeClass = (val) => {
    if (!val) return 'badge-nearmiss';
    if (val === 'Tier 1 PSE' || val === 'Tier 1') return 'badge-tier1';
    if (val === 'Tier 2 PSE' || val === 'Tier 2') return 'badge-tier2';
    if (val === 'Tier 3 Indicator' || val === 'Tier 3') return 'badge-tier3';
    if (val === 'Tier 4 Indicator' || val === 'Tier 4') return 'badge-tier4';
    if (val === 'Pending Classification' || val.includes('Pending')) return 'badge-pending';
    if (val === 'Other Incident') return 'badge-other';
    return 'badge-nearmiss';
  };

  return (
    <div className="incident-page-container">
      {/* Top Banner / Header */}
      <div className="incident-header">
        <div className="incident-header-left">
          {onBack && (
            <button className="btn-back" onClick={onBack} title="Back to Main Dashboard">
              ← Back
            </button>
          )}
          <div>
            <div className="incident-title-row">
              <span className="incident-header-icon">🛡️</span>
              <h1 className="incident-main-heading">Plant Incident Investigation & EHS Management</h1>
              <span className="badge-standard">ANSI/API RP 754 & OSHA 1910.119(m)</span>
            </div>
            <p className="incident-sub-heading">
              First Incident Reporting (FIR), 7-Day SLA Governance, Cross-Functional Team Triage & Why-Why RCA
            </p>
          </div>
        </div>

        <button 
          className="btn-primary-gradient"
          onClick={() => setIsFIRModalOpen(true)}
        >
          <span style={{ fontSize: '1.1rem' }}>+</span> Log New Incident (FIR)
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="incident-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total Incidents</div>
          <div className="kpi-value">{stats.total}</div>
          <div className="kpi-sub">All logged events</div>
        </div>

        <div className="kpi-card kpi-card-tier1">
          <div className="kpi-label">API 754 Tier 1 PSE</div>
          <div className="kpi-value text-tier1">{stats.tier1Count}</div>
          <div className="kpi-sub">Lagging (High Consequence)</div>
        </div>

        <div className="kpi-card kpi-card-tier2">
          <div className="kpi-label">API 754 Tier 2 PSE</div>
          <div className="kpi-value text-tier2">{stats.tier2Count}</div>
          <div className="kpi-sub">Lagging (Lesser Consequence)</div>
        </div>

        <div className="kpi-card kpi-card-tier3">
          <div className="kpi-label">Tier 3 / Tier 4 Indicators</div>
          <div className="kpi-value text-tier3">{(stats.tier3Count || 0) + (stats.tier4Count || 0)}</div>
          <div className="kpi-sub">Leading (Barrier Challenges)</div>
        </div>

        {stats.pendingClassificationCount > 0 && (
          <div className="kpi-card" style={{ border: '2px dashed #ca8a04', background: '#fef9c3' }}>
            <div className="kpi-label" style={{ color: '#854d0e', fontWeight: '800' }}>⏳ Pending Classification</div>
            <div className="kpi-value" style={{ color: '#854d0e' }}>{stats.pendingClassificationCount}</div>
            <div className="kpi-sub" style={{ color: '#a16207' }}>Additional Info Required</div>
          </div>
        )}

        <div className={`kpi-card ${(stats.overdueCapaCount || 0) > 0 ? 'kpi-card-breached' : ''}`}>
          <div className="kpi-label">Stage 3B CAPA Tracker</div>
          <div className="kpi-value">
            {(stats.overdueCapaCount || 0) > 0 ? (
              <span className="text-danger">{stats.overdueCapaCount} Overdue</span>
            ) : (
              <span>{stats.openCapaCount || 0} Active</span>
            )}
          </div>
          <div className="kpi-sub">
            {stats.pendingCapaVerificationCount || 0} awaiting HSE verification
          </div>
        </div>

        <div className={`kpi-card ${stats.overdueSlaCount > 0 ? 'kpi-card-breached' : ''}`}>
          <div className="kpi-label">7-Day SLA Status</div>
          <div className="kpi-value">
            {stats.overdueSlaCount > 0 ? (
              <span className="text-danger">{stats.overdueSlaCount} Overdue</span>
            ) : (
              <span className="text-success">{stats.pendingTriageCount} In Window</span>
            )}
          </div>
          <div className="kpi-sub">Manager Review Governance</div>
        </div>
      </div>

      {/* Action / Search / Filter Bar */}
      <div className="incident-controls-bar">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search incident number, title, unit, or zone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="filter-select"
          >
            <option value="all">All API 754 Categories</option>
            <option value="Tier 1 PSE">Tier 1 PSE</option>
            <option value="Tier 2 PSE">Tier 2 PSE</option>
            <option value="Tier 3 Indicator">Tier 3 Indicator</option>
            <option value="Tier 4 Indicator">Tier 4 Indicator</option>
            <option value="Near Miss">Near Miss</option>
            <option value="Other Incident">Other Incident</option>
            <option value="Pending Classification">Pending Classification</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Lifecycle Statuses</option>
            <option value="Submitted">Submitted (Pending Review)</option>
            <option value="Investigation Active">Investigation Active</option>
            <option value="CAPA Pending">CAPA Pending</option>
            <option value="CAPA Verification">CAPA Verification</option>
            <option value="Closed">Closed</option>
            <option value="Administratively Closed">Administratively Closed</option>
          </select>

          <select
            value={slaFilter}
            onChange={(e) => setSlaFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All SLA Conditions</option>
            <option value="pending">7-Day Review Pending</option>
            <option value="overdue">⚠️ SLA Overdue Only</option>
          </select>
        </div>
      </div>

      {/* Incidents Table / List */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading Plant Incidents...</p>
        </div>
      ) : error ? (
        <div className="error-banner">
          ⚠️ {error}
        </div>
      ) : incidents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🛡️</div>
          <h3>No Incidents Found</h3>
          <p>There are no incidents matching your active filters. Log a new FIR to begin.</p>
          <button 
            className="btn-primary-gradient"
            onClick={() => setIsFIRModalOpen(true)}
            style={{ marginTop: '14px' }}
          >
            + Log First Incident Report (FIR)
          </button>
        </div>
      ) : (
        <div className="incident-table-wrapper">
          <table className="incident-table">
            <thead>
              <tr>
                <th>Incident ID & Date</th>
                <th>Title & Operational Zone</th>
                <th>API 754 Classification</th>
                <th>7-Day SLA Governance</th>
                <th>CFT Committee</th>
                <th>Lifecycle Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc) => (
                <tr key={inc._id}>
                  <td>
                    <div className="incident-id-badge">{inc.incidentNumber}</div>
                    <div className="incident-date-text">
                      {new Date(inc.dateTime || inc.createdAt).toLocaleDateString()} {new Date(inc.dateTime || inc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>

                  <td>
                    <div 
                      className="incident-title-link"
                      onClick={() => setSelectedIncidentForDetails(inc)}
                      title="Click to view dossier"
                    >
                      {inc.title}
                    </div>
                    <div className="incident-meta-tags">
                      <span className="meta-tag">{inc.plantZone}</span>
                      <span className="meta-tag">{inc.shift}</span>
                      <span className="meta-tag">{inc.facilityType}</span>
                    </div>
                  </td>

                  <td>
                    <span className={`tier-badge ${getTierBadgeClass(inc.api754Classification?.category || inc.api754Classification?.tier)}`}>
                      {inc.api754Classification?.category || inc.api754Classification?.tier || 'Near Miss'}
                    </span>
                    {inc.reviewerDeclaration?.isConfirmed && (
                      <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: '700', marginTop: '3px' }}>
                        ✓ Sec K Declared
                      </div>
                    )}
                    {inc.isLOPC && (
                      <div className="lopc-tag">
                        LOPC: {inc.materialDetails?.chemicalName || inc.materialName || 'Chemical'} ({inc.materialDetails?.quantityInOneHourKg || inc.releaseQuantityKg || 0}kg)
                      </div>
                    )}
                  </td>

                  <td>
                    {inc.triage?.status !== 'Pending' ? (
                      <div className="sla-completed-pill">
                        ✓ Reviewed ({inc.triage?.status === 'Administratively Closed' ? 'Closed' : 'CFT Mandated'})
                      </div>
                    ) : inc.isSlaOverdue ? (
                      <div className="sla-breached-pill">
                        ⚠️ Overdue ({Math.abs(inc.slaDaysRemaining)}d past SLA)
                      </div>
                    ) : (
                      <div className="sla-active-pill">
                        ⏱️ {inc.slaDaysRemaining}d remaining
                      </div>
                    )}
                  </td>

                  <td>
                    {inc.cft?.leader?.name ? (
                      <div className="cft-assigned-box">
                        <strong>{inc.cft.leader.name}</strong>
                        <div className="cft-sub">Leader ({inc.cft.members?.length || 0} members)</div>
                      </div>
                    ) : (
                      <span className="cft-unassigned-tag">Unassigned</span>
                    )}
                  </td>

                  <td>
                    <span className={`status-pill status-${(inc.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
                      {inc.status}
                    </span>
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    <div className="row-actions">
                      <button
                        className="btn-action-rca"
                        onClick={() => setSelectedIncidentForInvestigation(inc)}
                        title="Open Stage 3A Why-Why RCA Investigation Workspace"
                      >
                        🔬 Why-Why RCA
                      </button>
                      <button
                        className="btn-action-capa"
                        onClick={() => {
                          setCapaInitialWhyNodeId(null);
                          setSelectedIncidentForCapa(inc);
                        }}
                        title="Open Stage 3B CAPA Action & Verification Workspace"
                      >
                        📋 CAPAs
                      </button>
                      <button
                        className="btn-action-triage"
                        onClick={() => setSelectedIncidentForTriage(inc)}
                        title="Conduct Manager Review & CFT Setup"
                      >
                        ⚖️ Triage / CFT
                      </button>
                      <button
                        className="btn-action-view"
                        onClick={() => setSelectedIncidentForDetails(inc)}
                        title="View Incident Dossier"
                      >
                        📄 Dossier
                      </button>
                      <button
                        className="btn-action-delete"
                        onClick={() => handleDeleteIncident(inc._id, inc.incidentNumber)}
                        title="Delete Incident"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <IncidentFIRModal
        isOpen={isFIRModalOpen}
        onClose={() => setIsFIRModalOpen(false)}
        onIncidentCreated={handleIncidentCreated}
        currentUser={currentUser}
      />

      <ManagerTriageModal
        isOpen={!!selectedIncidentForTriage}
        onClose={() => setSelectedIncidentForTriage(null)}
        incident={selectedIncidentForTriage}
        onTriageSaved={handleTriageSaved}
        currentUser={currentUser}
      />

      <InvestigationWorkspaceModal
        isOpen={!!selectedIncidentForInvestigation}
        onClose={() => setSelectedIncidentForInvestigation(null)}
        incident={selectedIncidentForInvestigation}
        currentUser={currentUser}
        onInvestigationUpdated={fetchIncidentsAndStats}
        onCreateCapaFromNode={(inc, whyNode) => {
          setSelectedIncidentForInvestigation(null);
          setCapaInitialWhyNodeId(whyNode?._id || null);
          setSelectedIncidentForCapa(inc);
        }}
      />

      <CapaWorkspaceModal
        isOpen={!!selectedIncidentForCapa}
        onClose={() => {
          setSelectedIncidentForCapa(null);
          setCapaInitialWhyNodeId(null);
        }}
        incident={selectedIncidentForCapa}
        currentUser={currentUser}
        initialWhyNodeId={capaInitialWhyNodeId}
        onCapaUpdated={fetchIncidentsAndStats}
      />

      <IncidentDetailsModal
        isOpen={!!selectedIncidentForDetails}
        onClose={() => setSelectedIncidentForDetails(null)}
        incident={selectedIncidentForDetails}
        onOpenTriage={(inc) => setSelectedIncidentForTriage(inc)}
        onOpenInvestigation={(inc) => {
          setSelectedIncidentForDetails(null);
          setSelectedIncidentForInvestigation(inc);
        }}
        onOpenCapa={(inc) => {
          setSelectedIncidentForDetails(null);
          setCapaInitialWhyNodeId(null);
          setSelectedIncidentForCapa(inc);
        }}
      />
    </div>
  );
}
