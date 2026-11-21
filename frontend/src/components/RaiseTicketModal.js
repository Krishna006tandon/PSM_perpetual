import React, { useState, useEffect } from 'react';
import './RaiseTicketModal.css';
import { getApiUrl } from '../utils/apiConfig';

const API_URL = getApiUrl();

const CATEGORIES = [
  'Bug / Error',
  'Performance / Lag',
  'Calculation / Formula',
  'Feature Request',
  'UI / Display',
  'Access / Permission',
  'Other'
];

const PRIORITIES = [
  { value: 'Low', label: 'Low - Minor Cosmetic / General Query' },
  { value: 'Medium', label: 'Medium - Functional Glitch / Workaround Available' },
  { value: 'High', label: 'High - Core Feature Blocked / Impaired' },
  { value: 'Critical', label: 'Critical ⚠️ - Study Data Inaccessible / System Failure' }
];

export default function RaiseTicketModal({ isOpen, onClose, currentUser, activeStudy }) {
  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'history'
  const [formData, setFormData] = useState({
    title: '',
    category: 'Bug / Error',
    priority: 'Medium',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [submitError, setSubmitError] = useState('');

  // History state
  const [myTickets, setMyTickets] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  useEffect(() => {
    if (isOpen && activeTab === 'history') {
      fetchMyTickets();
    }
  }, [isOpen, activeTab]);

  const fetchMyTickets = async () => {
    try {
      setHistoryLoading(true);
      const res = await fetch(`${API_URL}/api/tickets/my`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setMyTickets(data);
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      setSubmitError('Please enter both a title and description.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(null);

    const systemInfo = {
      currentUrl: window.location.href,
      studyId: activeStudy?._id || '',
      studyName: activeStudy?.studyName || '',
      browser: navigator.userAgent,
      os: navigator.platform,
      screenResolution: `${window.screen.width}x${window.screen.height}`
    };

    try {
      const res = await fetch(`${API_URL}/api/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          systemInfo
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitSuccess(data.ticket);
        setFormData({
          title: '',
          category: 'Bug / Error',
          priority: 'Medium',
          description: ''
        });
        fetchMyTickets();
      } else {
        setSubmitError(data.error || 'Failed to submit ticket');
      }
    } catch (err) {
      console.error('Submit ticket error:', err);
      setSubmitError(`Network error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async (ticketId) => {
    if (!replyMessage.trim()) return;
    setIsSendingReply(true);
    try {
      const res = await fetch(`${API_URL}/api/tickets/${ticketId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ message: replyMessage })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedTicket(data.ticket);
        setReplyMessage('');
        fetchMyTickets();
      } else {
        alert(data.error || 'Failed to send reply');
      }
    } catch (err) {
      alert(`Network error: ${err.message}`);
    } finally {
      setIsSendingReply(false);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Open': return 'status-open';
      case 'In Progress': return 'status-in-progress';
      case 'Under Review': return 'status-under-review';
      case 'Resolved': return 'status-resolved';
      case 'Closed': return 'status-closed';
      default: return 'status-open';
    }
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'Critical': return 'priority-critical';
      case 'High': return 'priority-high';
      case 'Medium': return 'priority-medium';
      case 'Low': return 'priority-low';
      default: return 'priority-medium';
    }
  };

  return (
    <div className="ticket-modal-overlay" onClick={onClose}>
      <div className="ticket-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ticket-header">
          <div className="ticket-header-title">
            <span style={{ fontSize: '1.4rem' }}>🎟️</span>
            <div>
              <h3>Support & Developer Desk</h3>
              <span className="ticket-header-badge">NexByte_Core Dispatch</span>
            </div>
          </div>
          <button className="ticket-close-btn" onClick={onClose} title="Close window">
            &times;
          </button>
        </div>

        {/* Tabs */}
        <div className="ticket-tabs">
          <button
            className={`ticket-tab ${activeTab === 'new' ? 'active' : ''}`}
            onClick={() => { setActiveTab('new'); setSelectedTicket(null); }}
          >
            ➕ Raise a New Ticket
          </button>
          <button
            className={`ticket-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => { setActiveTab('history'); setSelectedTicket(null); }}
          >
            📋 My Tickets ({myTickets.length})
          </button>
        </div>

        {/* Body */}
        <div className="ticket-body">
          {activeTab === 'new' ? (
            <div>
              {submitSuccess ? (
                <div style={{ textAlign: 'center', padding: '30px 20px' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🎉</div>
                  <h3 style={{ color: '#0f172a', margin: '0 0 8px 0' }}>Ticket Raised Successfully!</h3>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', maxWidth: '480px', margin: '16px auto', textAlign: 'left' }}>
                    <p style={{ margin: '4px 0' }}><strong>Reference ID:</strong> <span style={{ color: '#00a896', fontWeight: 'bold' }}>#{submitSuccess.ticketId}</span></p>
                    <p style={{ margin: '4px 0' }}><strong>Subject:</strong> {submitSuccess.title}</p>
                    <p style={{ margin: '4px 0' }}><strong>Status:</strong> <span className="ticket-status-pill status-open">Open</span></p>
                    <p style={{ margin: '4px 0' }}><strong>Priority:</strong> {submitSuccess.priority}</p>
                  </div>
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px 18px', maxWidth: '520px', margin: '16px auto', color: '#1e40af', fontSize: '0.9rem' }}>
                    ✉️ Automated notifications sent to <strong>NexByte_Core (nexbyte.dev@gmail.com)</strong> & Platform Owner.
                    <br />
                    You will receive status emails directly at <strong>{currentUser?.email}</strong> with complete transparency!
                  </div>
                  <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button
                      onClick={() => setSubmitSuccess(null)}
                      style={{ padding: '10px 20px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Raise Another Ticket
                    </button>
                    <button
                      onClick={() => { setActiveTab('history'); setSubmitSuccess(null); }}
                      style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #00a896 0%, #028090 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      View My Tickets
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {/* Context Banner */}
                  <div className="ticket-context-box">
                    <div>
                      <strong>Account:</strong> {currentUser?.name || 'User'} ({currentUser?.companyName || 'Organization'}) • Code: {currentUser?.companyCode || 'N/A'}
                    </div>
                    {activeStudy?.studyName && (
                      <div>
                        <strong>Active Study:</strong> {activeStudy.studyName}
                      </div>
                    )}
                  </div>

                  {submitError && (
                    <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.88rem', fontWeight: 'bold' }}>
                      ⚠️ {submitError}
                    </div>
                  )}

                  <div className="ticket-form-group">
                    <label>📌 Issue Title / Summary *</label>
                    <input
                      type="text"
                      className="ticket-input"
                      placeholder="e.g. Recommendation registry not exporting properly, or Error while loading node 3"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="ticket-grid-2">
                    <div className="ticket-form-group">
                      <label>📂 Category</label>
                      <select
                        className="ticket-select"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      >
                        {CATEGORIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="ticket-form-group">
                      <label>⚡ Priority Level</label>
                      <select
                        className="ticket-select"
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      >
                        {PRIORITIES.map(p => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="ticket-form-group">
                    <label>📝 Detailed Description & Error Message *</label>
                    <textarea
                      className="ticket-textarea"
                      placeholder="Please explain:
1. What happened or what error message appeared?
2. What were you doing when it occurred?
3. Any specific node, scenario, or worksheet affected?"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                    />
                  </div>

                  <div className="ticket-footer" style={{ padding: '12px 0 0 0', background: 'transparent', borderTop: 'none' }}>
                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                      🛡️ Dev Team: <strong>nexbyte.dev@gmail.com</strong> • Email alerts enabled
                    </div>
                    <button
                      type="submit"
                      className="ticket-submit-btn"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? '⏳ Submitting...' : '🚀 Submit Ticket'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : selectedTicket ? (
            /* Detailed Ticket View */
            <div>
              <button
                onClick={() => setSelectedTicket(null)}
                style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 'bold', marginBottom: '16px' }}
              >
                &larr; Back to Tickets List
              </button>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <span style={{ color: '#00a896', fontWeight: '800', fontSize: '0.9rem' }}>#{selectedTicket.ticketId}</span>
                    <h3 style={{ margin: '4px 0', fontSize: '1.25rem', color: '#0f172a' }}>{selectedTicket.title}</h3>
                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                      Category: <strong>{selectedTicket.category}</strong> • Created on {new Date(selectedTicket.createdAt).toLocaleString('en-GB')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className={`priority-pill ${getPriorityClass(selectedTicket.priority)}`}>
                      {selectedTicket.priority} Priority
                    </span>
                    <span className={`ticket-status-pill ${getStatusClass(selectedTicket.status)}`}>
                      {selectedTicket.status}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: '#1e293b' }}>Reported Issue:</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                    {selectedTicket.description}
                  </p>
                </div>

                {selectedTicket.resolutionNotes && (
                  <div style={{ marginTop: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderLeft: '4px solid #16a34a', borderRadius: '8px', padding: '14px' }}>
                    <h4 style={{ margin: '0 0 6px 0', color: '#166534', fontSize: '0.95rem' }}>💬 Developer Resolution Note:</h4>
                    <p style={{ margin: 0, color: '#15803d', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                      {selectedTicket.resolutionNotes}
                    </p>
                  </div>
                )}
              </div>

              {/* Status Timeline */}
              {selectedTicket.timeline && selectedTicket.timeline.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '0.98rem' }}>🕒 Progress Timeline & Audit:</h4>
                  <div style={{ borderLeft: '2px solid #e2e8f0', paddingLeft: '16px', marginLeft: '8px' }}>
                    {selectedTicket.timeline.map((entry, idx) => (
                      <div key={idx} style={{ marginBottom: '14px', position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '-22px', top: '2px', width: '10px', height: '10px', borderRadius: '50%', background: '#00a896', border: '2px solid white' }}></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#64748b' }}>
                          <strong style={{ color: '#0f172a' }}>{entry.action}</strong>
                          <span>{new Date(entry.timestamp).toLocaleString('en-GB')}</span>
                        </div>
                        {entry.note && (
                          <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: '3px' }}>
                            {entry.note}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conversation Messages */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '0.98rem' }}>💬 Discussion Thread:</h4>
                <div style={{ maxHeight: '220px', overflowY: 'auto', marginBottom: '14px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#fafafa' }}>
                  {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                    selectedTicket.messages.map((m, idx) => {
                      const isDev = m.sender === 'Developer' || m.sender === 'Owner';
                      return (
                        <div key={idx} style={{ marginBottom: '12px', textAlign: isDev ? 'left' : 'right' }}>
                          <div style={{
                            display: 'inline-block',
                            maxWidth: '80%',
                            background: isDev ? '#ffffff' : 'linear-gradient(135deg, #00a896 0%, #028090 100%)',
                            color: isDev ? '#0f172a' : '#ffffff',
                            border: isDev ? '1px solid #cbd5e1' : 'none',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            textAlign: 'left',
                            fontSize: '0.88rem'
                          }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: isDev ? '#028090' : 'rgba(255,255,255,0.85)', marginBottom: '4px' }}>
                              {m.senderName || m.sender} • {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div style={{ whiteSpace: 'pre-wrap' }}>{m.message}</div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', padding: '16px' }}>
                      No follow-up messages yet. You can post a message below to talk directly with NexByte_Core.
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="ticket-input"
                    placeholder="Type a message or response to NexByte_Core engineering..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSendReply(selectedTicket._id); }}
                  />
                  <button
                    onClick={() => handleSendReply(selectedTicket._id)}
                    className="ticket-submit-btn"
                    disabled={isSendingReply || !replyMessage.trim()}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {isSendingReply ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Ticket History List */
            <div>
              {historyLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  ⏳ Loading your support tickets...
                </div>
              ) : myTickets.length === 0 ? (
                <div style={{ padding: '50px 20px', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>✨</div>
                  <h4 style={{ margin: '0 0 6px 0', color: '#0f172a' }}>No Tickets Raised Yet</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>If you face any issues, errors, or need assistance, click "Raise a New Ticket" above.</p>
                </div>
              ) : (
                <div>
                  {myTickets.map(t => (
                    <div
                      key={t._id}
                      className="ticket-card"
                      onClick={() => setSelectedTicket(t)}
                    >
                      <div className="ticket-card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: '#00a896', fontWeight: '800', fontSize: '0.88rem' }}>#{t.ticketId}</span>
                          <span className={`priority-pill ${getPriorityClass(t.priority)}`}>
                            {t.priority}
                          </span>
                        </div>
                        <span className={`ticket-status-pill ${getStatusClass(t.status)}`}>
                          {t.status}
                        </span>
                      </div>
                      <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: '#0f172a' }}>{t.title}</h4>
                      <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#64748b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {t.description}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#94a3b8' }}>
                        <span>📂 {t.category}</span>
                        <span>🕒 {new Date(t.createdAt).toLocaleDateString('en-GB')}</span>
                      </div>
                      {t.resolutionNotes && (
                        <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#16a34a', fontWeight: 'bold' }}>
                          ✓ Resolution note added by Dev
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
