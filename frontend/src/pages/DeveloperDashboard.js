import React, { useState, useEffect } from 'react';
import './DeveloperDashboard.css';
import { getApiUrl } from '../utils/apiConfig';

const API_URL = getApiUrl();
const DEV_EMAIL = 'nexbyte.dev@gmail.com';

const STATUS_OPTIONS = ['ALL', 'Open', 'In Progress', 'Under Review', 'Resolved', 'Closed'];
const PRIORITY_OPTIONS = ['ALL', 'Critical', 'High', 'Medium', 'Low'];

export default function DeveloperDashboard({ onLogout, currentUser }) {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    underReview: 0,
    resolved: 0,
    closed: 0,
    critical: 0
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected Ticket for Inspection
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [resolutionNoteInput, setResolutionNoteInput] = useState('');
  const [newStatusInput, setNewStatusInput] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusUpdateSuccess, setStatusUpdateSuccess] = useState('');

  // Discussion reply
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Dev passcode access (fallback if not logged in as SuperAdmin/Dev)
  const [devAccessKey, setDevAccessKey] = useState(localStorage.getItem('devAccessKey') || '');
  const [keyInput, setKeyInput] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Check authorization: SuperAdmin, nexbyte.dev@gmail.com, or dev key
    const isDevUser =
      currentUser?.role === 'SuperAdmin' ||
      currentUser?.email?.toLowerCase() === DEV_EMAIL.toLowerCase();

    if (isDevUser || devAccessKey === 'nexbyte-dev-2026') {
      setIsAuthorized(true);
    } else {
      setIsAuthorized(false);
    }
  }, [currentUser, devAccessKey]);

  useEffect(() => {
    if (isAuthorized) {
      fetchTickets();
      fetchStats();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized, statusFilter, priorityFilter, searchTerm]);

  const getAuthHeaders = () => {
    const headers = {
      'Content-Type': 'application/json'
    };
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (devAccessKey) headers['X-Dev-Access-Key'] = devAccessKey;
    return headers;
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tickets/dev/stats`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching ticket stats:', err);
    }
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (priorityFilter !== 'ALL') params.append('priority', priorityFilter);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const res = await fetch(`${API_URL}/api/tickets/dev/all?${params.toString()}`, {
        headers: getAuthHeaders()
      });

      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      }
    } catch (err) {
      console.error('Error fetching dev tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTicket = (t) => {
    setSelectedTicket(t);
    setNewStatusInput(t.status);
    setResolutionNoteInput(t.resolutionNotes || '');
    setStatusUpdateSuccess('');
  };

  const handleUpdateStatus = async () => {
    if (!selectedTicket) return;
    setIsUpdatingStatus(true);
    setStatusUpdateSuccess('');
    try {
      const res = await fetch(`${API_URL}/api/tickets/dev/${selectedTicket._id}/status`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          status: newStatusInput,
          resolutionNotes: resolutionNoteInput
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusUpdateSuccess(`✅ Status updated to "${newStatusInput}" & email dispatched to customer!`);
        setSelectedTicket(data.ticket);
        fetchTickets();
        fetchStats();
      } else {
        alert(data.error || 'Failed to update ticket status');
      }
    } catch (err) {
      alert(`Error updating ticket: ${err.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    setIsSendingReply(true);
    try {
      const res = await fetch(`${API_URL}/api/tickets/${selectedTicket._id}/message`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ message: replyText })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedTicket(data.ticket);
        setReplyText('');
        fetchTickets();
      } else {
        alert(data.error || 'Failed to send message');
      }
    } catch (err) {
      alert(`Error sending message: ${err.message}`);
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleDevKeySubmit = (e) => {
    e.preventDefault();
    if (keyInput.trim() === 'nexbyte-dev-2026') {
      localStorage.setItem('devAccessKey', keyInput.trim());
      setDevAccessKey(keyInput.trim());
      setIsAuthorized(true);
    } else {
      alert('Invalid Developer Passcode. Please contact NexByte_Core (nexbyte.dev@gmail.com).');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Open':
        return <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 'bold' }}>Open</span>;
      case 'In Progress':
        return <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 'bold' }}>In Progress</span>;
      case 'Under Review':
        return <span style={{ background: '#f3e8ff', color: '#7e22ce', padding: '3px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 'bold' }}>Under Review</span>;
      case 'Resolved':
        return <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 'bold' }}>Resolved ✓</span>;
      case 'Closed':
        return <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 10px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 'bold' }}>Closed</span>;
      default:
        return <span>{status}</span>;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Critical':
        return <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold' }}>⚠️ Critical</span>;
      case 'High':
        return <span style={{ background: '#fff7ed', color: '#ea580c', border: '1px solid #ffedd5', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold' }}>High</span>;
      case 'Medium':
        return <span style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #dbeafe', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold' }}>Medium</span>;
      case 'Low':
        return <span style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold' }}>Low</span>;
      default:
        return <span>{priority}</span>;
    }
  };

  // If unauthorized, prompt for Developer passcode
  if (!isAuthorized) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: '20px' }}>
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '36px', maxWidth: '440px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🛠️</div>
          <h2 style={{ margin: '0 0 6px 0', color: '#0f172a' }}>NexByte_Core Desk</h2>
          <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '0.9rem' }}>
            Authorized Developer & Engineering Console (<strong>{DEV_EMAIL}</strong>)
          </p>

          <form onSubmit={handleDevKeySubmit}>
            <input
              type="password"
              placeholder="Enter Developer Passcode..."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box', marginBottom: '16px', outline: 'none' }}
              required
            />
            <button
              type="submit"
              style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #00a896 0%, #028090 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}
            >
              🔓 Unlock Developer Console
            </button>
          </form>

          <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <a href="/" style={{ color: '#028090', textDecoration: 'none', fontWeight: 'bold' }}>&larr; Return to Platform</a>
            {onLogout && (
              <button onClick={onLogout} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 'bold' }}>
                Logout
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dev-dashboard">
      {/* Top Navbar */}
      <header className="dev-navbar">
        <div className="dev-nav-brand">
          <span style={{ fontSize: '1.6rem' }}>🛠️</span>
          <div>
            <h2>NexByte_Core Hub</h2>
            <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
              Dispatch Email: <strong>{DEV_EMAIL}</strong> • PS-MagnaShield Support
            </div>
          </div>
          <span className="dev-pill">Active Live SLA</span>
        </div>

        <div className="dev-nav-actions">
          <button
            onClick={() => { fetchTickets(); fetchStats(); }}
            style={{ padding: '8px 16px', background: 'rgba(255, 255, 255, 0.1)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.88rem' }}
          >
            🔄 Refresh
          </button>
          <a
            href="/"
            style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #00a896 0%, #028090 100%)', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.88rem' }}
          >
            🏢 Open Platform
          </a>
          {onLogout && (
            <button
              onClick={onLogout}
              style={{ padding: '8px 14px', background: 'transparent', color: '#f87171', border: '1px solid #ef4444', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.88rem' }}
            >
              Sign Out
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="dev-content">
        {/* KPI Grid */}
        <div className="dev-kpi-grid">
          <div className="dev-kpi-card" onClick={() => setStatusFilter('ALL')}>
            <span className="dev-kpi-label">Total Tickets</span>
            <span className="dev-kpi-val">{stats.total}</span>
          </div>
          <div className="dev-kpi-card" onClick={() => setStatusFilter('Open')} style={{ borderLeft: '4px solid #f59e0b' }}>
            <span className="dev-kpi-label">Open / Unassigned</span>
            <span className="dev-kpi-val" style={{ color: '#d97706' }}>{stats.open}</span>
          </div>
          <div className="dev-kpi-card" onClick={() => setStatusFilter('In Progress')} style={{ borderLeft: '4px solid #0284c7' }}>
            <span className="dev-kpi-label">In Progress</span>
            <span className="dev-kpi-val" style={{ color: '#0284c7' }}>{stats.inProgress}</span>
          </div>
          <div className="dev-kpi-card" onClick={() => setStatusFilter('Under Review')} style={{ borderLeft: '4px solid #7c3aed' }}>
            <span className="dev-kpi-label">Under Review</span>
            <span className="dev-kpi-val" style={{ color: '#7c3aed' }}>{stats.underReview}</span>
          </div>
          <div className="dev-kpi-card" onClick={() => setStatusFilter('Resolved')} style={{ borderLeft: '4px solid #10b981' }}>
            <span className="dev-kpi-label">Resolved / Closed</span>
            <span className="dev-kpi-val" style={{ color: '#10b981' }}>{stats.resolved + stats.closed}</span>
          </div>
          <div className="dev-kpi-card" onClick={() => setPriorityFilter('Critical')} style={{ borderLeft: '4px solid #ef4444' }}>
            <span className="dev-kpi-label">Critical Issues</span>
            <span className="dev-kpi-val" style={{ color: '#ef4444' }}>{stats.critical}</span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="dev-filter-bar">
          <input
            type="text"
            className="dev-search-input"
            placeholder="🔍 Search by Ticket ID, Title, Customer, Company, or Email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <div className="dev-filter-group">
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b', marginRight: '6px', fontWeight: 'bold' }}>Status:</span>
              <select
                className="dev-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b', marginRight: '6px', fontWeight: 'bold' }}>Priority:</span>
              <select
                className="dev-select"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                {PRIORITY_OPTIONS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tickets Table */}
        <div className="dev-table-container">
          <table className="dev-table">
            <thead>
              <tr>
                <th style={{ width: '110px' }}>Ticket ID</th>
                <th style={{ width: '110px' }}>Priority</th>
                <th>Issue Summary</th>
                <th>Customer / Company</th>
                <th>Category</th>
                <th style={{ width: '120px' }}>Status</th>
                <th style={{ width: '120px' }}>Date</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    ⏳ Loading developer ticket queue...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    No support tickets matching current filters.
                  </td>
                </tr>
              ) : (
                tickets.map(t => (
                  <tr key={t._id}>
                    <td>
                      <strong style={{ color: '#00a896', fontSize: '0.92rem' }}>#{t.ticketId}</strong>
                    </td>
                    <td>{getPriorityBadge(t.priority)}</td>
                    <td>
                      <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.95rem' }}>{t.title}</strong>
                      <span style={{ color: '#64748b', fontSize: '0.8rem', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {t.description}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: '#1e293b', display: 'block' }}>{t.customerName}</strong>
                      <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{t.customerEmail}</span>
                      {t.companyName && (
                        <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem' }}>
                          🏢 {t.companyName} {t.companyCode ? `(Code: ${t.companyCode})` : ''}
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{ background: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 'bold' }}>
                        {t.category}
                      </span>
                    </td>
                    <td>{getStatusBadge(t.status)}</td>
                    <td style={{ color: '#64748b', fontSize: '0.82rem' }}>
                      {new Date(t.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => handleOpenTicket(t)}
                        style={{
                          background: 'linear-gradient(135deg, #028090 0%, #00a896 100%)',
                          color: 'white',
                          border: 'none',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          fontSize: '0.82rem',
                          cursor: 'pointer'
                        }}
                      >
                        Inspect & Resolve
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Ticket Details & Action Modal */}
      {selectedTicket && (
        <div className="dev-modal-overlay" onClick={() => setSelectedTicket(null)}>
          <div className="dev-modal-container" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="dev-modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ margin: 0, color: 'white', fontSize: '1.3rem' }}>
                    #{selectedTicket.ticketId}: {selectedTicket.title}
                  </h3>
                  {getPriorityBadge(selectedTicket.priority)}
                </div>
                <div style={{ marginTop: '4px', color: '#94a3b8', fontSize: '0.85rem' }}>
                  Category: {selectedTicket.category} • Logged on {new Date(selectedTicket.createdAt).toLocaleString('en-GB')}
                </div>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                style={{ background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: 'white', fontSize: '1.4rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="dev-modal-body">
              {/* Customer Info Card */}
              <div className="dev-section-card">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '0.88rem' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem' }}>Customer Name</span>
                    <strong style={{ color: '#0f172a' }}>{selectedTicket.customerName}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem' }}>Customer Email</span>
                    <a href={`mailto:${selectedTicket.customerEmail}`} style={{ color: '#028090', fontWeight: 'bold' }}>
                      {selectedTicket.customerEmail}
                    </a>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem' }}>Company & Code</span>
                    <strong>{selectedTicket.companyName} {selectedTicket.companyCode ? `(${selectedTicket.companyCode})` : ''}</strong>
                  </div>
                  {selectedTicket.contact && (
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem' }}>Contact</span>
                      <strong>📞 {selectedTicket.contact}</strong>
                    </div>
                  )}
                  {selectedTicket.systemInfo?.currentUrl && (
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem' }}>Originating Page / Context</span>
                      <span style={{ color: '#475569', fontSize: '0.82rem', wordBreak: 'break-all' }}>{selectedTicket.systemInfo.currentUrl}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Problem Description */}
              <div className="dev-section-card">
                <h4 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>Reported Problem / Error Details:</h4>
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderLeft: '4px solid #00a896', borderRadius: '6px', padding: '14px', fontSize: '0.9rem', color: '#1e293b', whiteSpace: 'pre-wrap', fontFamily: 'Consolas, monospace, sans-serif' }}>
                  {selectedTicket.description}
                </div>
              </div>

              {/* Developer Action: Change Status & Resolution Notes */}
              <div className="dev-section-card" style={{ border: '1px solid #00a896', background: 'rgba(0, 168, 150, 0.02)' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#028090', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⚡</span> Developer Resolution & Status Dispatch
                </h4>

                {statusUpdateSuccess && (
                  <div style={{ background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.88rem', fontWeight: 'bold' }}>
                    {statusUpdateSuccess}
                  </div>
                )}

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '6px' }}>
                    Update Ticket Status:
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['Open', 'In Progress', 'Under Review', 'Resolved', 'Closed'].map(st => {
                      const isSelected = newStatusInput === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          className="dev-status-btn"
                          onClick={() => setNewStatusInput(st)}
                          style={{
                            background: isSelected ? '#00a896' : '#ffffff',
                            color: isSelected ? '#ffffff' : '#334155',
                            border: isSelected ? '1px solid #00a896' : '1px solid #cbd5e1'
                          }}
                        >
                          {st === 'Resolved' ? '✓ ' : ''}{st}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '6px' }}>
                    Developer Resolution Note (This is emailed directly to the customer):
                  </label>
                  <textarea
                    rows={3}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                    placeholder="e.g. Fixed the validation error on scenario save. Changes deployed and tested on VPS."
                    value={resolutionNoteInput}
                    onChange={(e) => setResolutionNoteInput(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleUpdateStatus}
                  disabled={isUpdatingStatus}
                  style={{
                    background: 'linear-gradient(135deg, #00a896 0%, #028090 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(0, 168, 150, 0.25)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {isUpdatingStatus ? 'Dispatched Email & Updating...' : '💾 Update Status & Notify Customer via Email'}
                </button>
              </div>

              {/* Discussion Thread */}
              <div className="dev-section-card">
                <h4 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>💬 Customer & Developer Conversation:</h4>
                <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '12px', background: '#fafafa', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                    selectedTicket.messages.map((m, idx) => {
                      const isDev = m.sender === 'Developer' || m.sender === 'Owner';
                      return (
                        <div key={idx} style={{ marginBottom: '10px', textAlign: isDev ? 'right' : 'left' }}>
                          <div style={{
                            display: 'inline-block',
                            maxWidth: '80%',
                            background: isDev ? '#00a896' : '#ffffff',
                            color: isDev ? '#ffffff' : '#0f172a',
                            border: isDev ? 'none' : '1px solid #cbd5e1',
                            padding: '8px 14px',
                            borderRadius: '10px',
                            textAlign: 'left',
                            fontSize: '0.88rem'
                          }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: isDev ? 'rgba(255,255,255,0.85)' : '#64748b', marginBottom: '2px' }}>
                              {m.senderName || m.sender} • {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div style={{ whiteSpace: 'pre-wrap' }}>{m.message}</div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', padding: '16px' }}>
                      No follow-up messages yet.
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    style={{ flex: 1, padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem' }}
                    placeholder="Send a quick reply to customer..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSendReply(); }}
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={isSendingReply || !replyText.trim()}
                    style={{ padding: '10px 18px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    {isSendingReply ? 'Sending...' : 'Reply'}
                  </button>
                </div>
              </div>

              {/* Audit Timeline */}
              {selectedTicket.timeline && selectedTicket.timeline.length > 0 && (
                <div className="dev-section-card">
                  <h4 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>🕒 Audit Timeline:</h4>
                  <div style={{ borderLeft: '2px solid #e2e8f0', paddingLeft: '14px', marginLeft: '6px' }}>
                    {selectedTicket.timeline.map((entry, idx) => (
                      <div key={idx} style={{ marginBottom: '10px', fontSize: '0.82rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                          <strong style={{ color: '#0f172a' }}>{entry.action}</strong>
                          <span>{new Date(entry.timestamp).toLocaleString('en-GB')}</span>
                        </div>
                        {entry.note && <div style={{ color: '#334155', marginTop: '2px' }}>{entry.note}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 24px', background: '#ffffff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                All ticket updates are permanently archived and emailed to customer for complete transparency.
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                style={{ padding: '8px 20px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
