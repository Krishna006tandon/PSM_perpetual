import React, { useState, useEffect } from 'react';
import StudyLayout from '../components/StudyLayout';
import AddMemberModal from '../components/AddMemberModal';
import AttendanceSheet from '../components/AttendanceSheet';
import './TeamMembers.css';

const TeamMembers = ({ study, onBack, onNavigate, theme, toggleTheme, canEdit, onUpdate }) => {
  const [members, setMembers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState(null);
  const [isPrintingAttendance, setIsPrintingAttendance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [meetingDates, setMeetingDates] = useState(study?.meetingDates || []);
  const [showAddDateModal, setShowAddDateModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [dateInput, setDateInput] = useState('');

  // Date Edit & Delete States
  const [dateToEdit, setDateToEdit] = useState(null);
  const [editDateInput, setEditDateInput] = useState('');
  const [dateToDelete, setDateToDelete] = useState(null);

  // Delete Member State
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');

  useEffect(() => {
    if (study?.meetingDates) {
      setMeetingDates(study.meetingDates);
    }
  }, [study?.meetingDates]);

  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://api.perpetualsolutions.co.in/api/teams/${study._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [study._id]);

  // Append new member to the end of the array (sequential addition)
  const handleMemberAdded = (newMember) => {
    setMembers(prev => [...prev, newMember]);
    setIsModalOpen(false);
  };

  // Update existing member in place
  const handleMemberUpdated = (updatedMember) => {
    setMembers(prev => prev.map(m => m._id === updatedMember._id ? updatedMember : m));
    setMemberToEdit(null);
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://api.perpetualsolutions.co.in/api/teams/${memberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (response.ok) {
        setMembers(prev => prev.map(m => m._id === memberId ? { ...m, role: newRole } : m));
      }
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  const handleAttendanceChange = async (memberId, date, present) => {
    try {
      const token = localStorage.getItem('token');
      // Optimistic update
      setMembers(prev => prev.map(m => {
        if (m._id === memberId) {
          return { ...m, attendanceDates: { ...m.attendanceDates, [date]: present } };
        }
        return m;
      }));
      
      const member = members.find(m => m._id === memberId);
      const updatedAttendance = { ...member.attendanceDates, [date]: present };
      
      await fetch(`https://api.perpetualsolutions.co.in/api/teams/${memberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ attendanceDates: updatedAttendance })
      });
    } catch (error) {
      console.error('Failed to update attendance:', error);
    }
  };

  const submitAddDate = async () => {
    if (!dateInput) return;
    if (meetingDates.includes(dateInput)) {
      alert("Date already exists!");
      return;
    }
    const newDates = [...meetingDates, dateInput];
    setMeetingDates(newDates);
    setShowAddDateModal(false);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://api.perpetualsolutions.co.in/api/studies/${study._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ meetingDates: newDates })
      });
      if (res.ok && onUpdate) {
        const updatedStudy = await res.json();
        onUpdate(updatedStudy);
      }
    } catch (err) {
      console.error('Failed to add date:', err);
    }
  };

  const submitEditDate = async () => {
    if (!editDateInput || !dateToEdit) return;
    if (editDateInput === dateToEdit) {
      setDateToEdit(null);
      return;
    }
    if (meetingDates.includes(editDateInput)) {
      alert("Date already exists!");
      return;
    }

    const oldDate = dateToEdit;
    const newDates = meetingDates.map(d => d === oldDate ? editDateInput : d);
    setMeetingDates(newDates);

    // Optimistically migrate attendance records for all members
    const updatedMembers = members.map(m => {
      if (m.attendanceDates && m.attendanceDates[oldDate] !== undefined) {
        const newAttendance = { ...m.attendanceDates };
        newAttendance[editDateInput] = newAttendance[oldDate];
        delete newAttendance[oldDate];
        return { ...m, attendanceDates: newAttendance };
      }
      return m;
    });
    setMembers(updatedMembers);

    // Migrate momData if exists
    let updatedMomData = study.momData ? { ...study.momData } : null;
    if (updatedMomData && updatedMomData[oldDate] !== undefined) {
      updatedMomData[editDateInput] = updatedMomData[oldDate];
      delete updatedMomData[oldDate];
    }

    setDateToEdit(null);

    try {
      const token = localStorage.getItem('token');
      // 1. Update Study meetingDates (and momData)
      const studyPayload = { meetingDates: newDates };
      if (updatedMomData) {
        studyPayload.momData = updatedMomData;
      }
      const res = await fetch(`https://api.perpetualsolutions.co.in/api/studies/${study._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(studyPayload)
      });
      if (res.ok && onUpdate) {
        const updatedStudy = await res.json();
        onUpdate(updatedStudy);
      }

      // 2. Persist attendance updates for members who had records on oldDate
      for (const m of updatedMembers) {
        if (m.attendanceDates && m.attendanceDates[editDateInput] !== undefined) {
          await fetch(`https://api.perpetualsolutions.co.in/api/teams/${m._id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ attendanceDates: m.attendanceDates })
          });
        }
      }
    } catch (err) {
      console.error('Failed to update meeting date:', err);
      alert('Failed to update meeting date on server.');
    }
  };

  const confirmDeleteDate = async () => {
    if (!dateToDelete) return;
    const targetDate = dateToDelete;
    const newDates = meetingDates.filter(d => d !== targetDate);
    setMeetingDates(newDates);
    setDateToDelete(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://api.perpetualsolutions.co.in/api/studies/${study._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ meetingDates: newDates })
      });
      if (res.ok && onUpdate) {
        const updatedStudy = await res.json();
        onUpdate(updatedStudy);
      }
    } catch (err) {
      console.error('Failed to delete meeting date:', err);
      alert('Failed to delete meeting date on server.');
    }
  };

  const confirmDeleteMember = async () => {
    if (!memberToDelete || !deleteReason.trim()) {
      alert("Please provide a reason for deletion.");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://api.perpetualsolutions.co.in/api/teams/${memberToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: deleteReason })
      });

      if (response.ok) {
        setMembers(prev => prev.filter(m => m._id !== memberToDelete._id));
        setMemberToDelete(null);
        setDeleteReason('');
      } else {
        console.error('Failed to delete member');
      }
    } catch (error) {
      console.error('Failed to delete member:', error);
    }
  };

  if (!study) return null;

  return (
    <StudyLayout activeTab="team" onBack={onBack} onNavigate={onNavigate} theme={theme} toggleTheme={toggleTheme}>
      <div className="team-container">
        <div className="team-header">
          <div className="team-header-left">
            <h2>TEAM MEMBERS</h2>
            <span className="team-count-badge">{members.length}</span>
          </div>
          <div style={{display: 'flex', gap: '10px'}}>
            {canEdit && <button className="btn-add-member" style={{backgroundColor: '#10b981'}} onClick={() => {
              setDateInput(new Date().toISOString().split('T')[0]);
              setShowAddDateModal(true);
            }}>
              📅 ADD DATE
            </button>}
            <button className="btn-add-member" style={{backgroundColor: '#3b82f6'}} onClick={() => {
              setDateInput(meetingDates[0] || new Date().toISOString().split('T')[0]);
              setShowPrintModal(true);
            }}>
              🖨️ PRINT ATTENDANCE SHEET
            </button>
            {canEdit && <button className="btn-add-member" onClick={() => {
              setMemberToEdit(null);
              setIsModalOpen(true);
            }}>
              <span className="plus-icon">+</span> ADD MEMBER
            </button>}
          </div>
        </div>

        <div className="team-warning-banner">
          <span className="info-icon">ℹ️</span> TEAM MEMBERS ADDED HERE ARE AUTOMATICALLY AVAILABLE AS OWNERS IN THE ACTION TRACKING SYSTEM
        </div>

        {!loading && members.length === 0 && (
          <div className="team-empty-state">
            <div className="empty-icon-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="empty-icon">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <h3>NO TEAM MEMBERS YET</h3>
            {canEdit && <button className="btn-add-first" onClick={() => {
              setMemberToEdit(null);
              setIsModalOpen(true);
            }}>
              ADD FIRST MEMBER
            </button>}
          </div>
        )}

        {!loading && members.length > 0 && (
          <div className="team-list">
            <table className="team-table">
              <thead>
                <tr>
                  <th>NAME</th>
                  <th>ROLE</th>
                  <th>DISCIPLINE</th>
                  <th>COMPANY</th>
                  {meetingDates.map(date => (
                    <th key={date} style={{textAlign: 'center', whiteSpace: 'nowrap'}}>
                      <div style={{display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center'}}>
                        <span>{date}</span>
                        {canEdit && (
                          <span style={{display: 'inline-flex', gap: '4px', opacity: 0.85}}>
                            <button 
                              type="button"
                              onClick={() => {
                                setDateToEdit(date);
                                setEditDateInput(date);
                              }}
                              style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: '0 2px'}}
                              title={`Edit date ${date}`}
                            >
                              ✏️
                            </button>
                            <button 
                              type="button"
                              onClick={() => setDateToDelete(date)}
                              style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', padding: '0 2px'}}
                              title={`Delete date column ${date}`}
                            >
                              🗑️
                            </button>
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                  {canEdit && <th>ACTIONS</th>}
                </tr>
              </thead>
              <tbody>
                {members.map(member => (
                  <tr key={member._id}>
                    <td>
                      <div className="member-name">{member.fullName}</div>
                      <div className="member-email">{member.email}</div>
                    </td>
                    <td>
                      {canEdit ? (
                        <select 
                          value={member.role}
                          onChange={(e) => handleRoleChange(member._id, e.target.value)}
                          className="role-badge"
                          style={{ border: '1px solid #ccc', cursor: 'pointer', appearance: 'auto', background: 'transparent' }}
                        >
                          {[
                            'Study Leader',
                            'Scribe',
                            'Process Engineer',
                            'Safety Engineer',
                            'Instrument Engineer',
                            'Electrical Engineer',
                            'Mechanical Engineer',
                            'Operations Lead',
                            'Maintenance Lead',
                            'Environmental Engineer',
                            'Project Manager',
                            'Facilitator',
                            'Subject Matter Expert',
                            'Observer',
                            'Reviewer'
                          ].map(role => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="role-badge">{member.role}</span>
                      )}
                    </td>
                    <td>{member.discipline}</td>
                    <td>{member.company || '-'}</td>
                    {meetingDates.map(date => (
                      <td key={date} style={{textAlign: 'center'}}>
                        <input 
                          type="checkbox" 
                          checked={member.attendanceDates?.[date] || false} 
                          onChange={(e) => handleAttendanceChange(member._id, date, e.target.checked)}
                          disabled={!canEdit}
                          style={{width: '20px', height: '20px', cursor: canEdit ? 'pointer' : 'default'}}
                        />
                      </td>
                    ))}
                    {canEdit && (
                      <td style={{textAlign: 'center', whiteSpace: 'nowrap'}}>
                        <button 
                          onClick={() => setMemberToEdit(member)}
                          style={{
                            background: 'none', 
                            border: 'none', 
                            color: '#0284c7', 
                            cursor: 'pointer',
                            fontSize: '16px',
                            marginRight: '8px'
                          }}
                          title="Edit Member"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => setMemberToDelete(member)}
                          style={{
                            background: 'none', 
                            border: 'none', 
                            color: '#ef4444', 
                            cursor: 'pointer',
                            fontSize: '16px'
                          }}
                          title="Delete Member"
                        >
                          🗑️
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Date Modal */}
      {showAddDateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '400px'}}>
            <h2>Select Meeting Date</h2>
            <input 
              type="date" 
              value={dateInput} 
              onChange={(e) => setDateInput(e.target.value)}
              style={{width: '100%', padding: '10px', marginTop: '15px', border: '1px solid #ccc', borderRadius: '4px'}}
            />
            <div className="modal-actions" style={{marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
              <button className="btn-cancel" onClick={() => setShowAddDateModal(false)}>Cancel</button>
              <button className="btn-save" onClick={submitAddDate}>Add Date</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Date Modal */}
      {dateToEdit && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '400px'}}>
            <h2>Edit Meeting Date</h2>
            <p style={{marginTop: '10px', color: '#666', fontSize: '13px'}}>
              Adjust the meeting date for <strong>{dateToEdit}</strong>. Attendance records and MOM notes will be transferred to the new date.
            </p>
            <input 
              type="date" 
              value={editDateInput} 
              onChange={(e) => setEditDateInput(e.target.value)}
              style={{width: '100%', padding: '10px', marginTop: '15px', border: '1px solid #ccc', borderRadius: '4px'}}
            />
            <div className="modal-actions" style={{marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
              <button className="btn-cancel" onClick={() => setDateToEdit(null)}>Cancel</button>
              <button className="btn-save" onClick={submitEditDate}>Update Date</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Date Confirmation Modal */}
      {dateToDelete && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '400px'}}>
            <h2>Remove Meeting Date</h2>
            <p style={{marginTop: '10px', color: '#666', fontSize: '13px'}}>
              Are you sure you want to remove the meeting date column <strong>{dateToDelete}</strong>?
            </p>
            <div className="modal-actions" style={{marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
              <button className="btn-cancel" onClick={() => setDateToDelete(null)}>Cancel</button>
              <button 
                className="btn-save" 
                style={{backgroundColor: '#ef4444'}} 
                onClick={confirmDeleteDate}
              >
                Remove Date
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Attendance Sheet Modal */}
      {showPrintModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '400px'}}>
            <h2>Print Attendance Sheet</h2>
            <p style={{marginTop: '10px', color: '#666'}}>Select the meeting date you wish to print:</p>
            <input 
              type="date" 
              value={dateInput} 
              onChange={(e) => setDateInput(e.target.value)}
              style={{width: '100%', padding: '10px', marginTop: '15px', border: '1px solid #ccc', borderRadius: '4px'}}
            />
            <div className="modal-actions" style={{marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
              <button className="btn-cancel" onClick={() => setShowPrintModal(false)}>Cancel</button>
              <button className="btn-save" onClick={() => {
                setIsPrintingAttendance(dateInput);
                setShowPrintModal(false);
              }}>Print</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Member Modal */}
      {memberToDelete && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '400px'}}>
            <h2>Remove Team Member</h2>
            <p style={{marginTop: '10px', color: '#666'}}>
              Are you sure you want to remove <strong>{memberToDelete.fullName}</strong> from this study?
            </p>
            <textarea
              placeholder="Reason for removal (required)"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              style={{
                width: '100%', 
                padding: '10px', 
                marginTop: '15px', 
                border: '1px solid #ccc', 
                borderRadius: '4px',
                minHeight: '80px',
                fontFamily: 'inherit'
              }}
            />
            <div className="modal-actions" style={{marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
              <button className="btn-cancel" onClick={() => {
                setMemberToDelete(null);
                setDeleteReason('');
              }}>Cancel</button>
              <button 
                className="btn-save" 
                style={{backgroundColor: '#ef4444'}} 
                onClick={confirmDeleteMember}
                disabled={!deleteReason.trim()}
              >
                Remove Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Member Modal */}
      {(isModalOpen || memberToEdit) && (
        <AddMemberModal 
          studyId={study._id} 
          member={memberToEdit}
          onClose={() => {
            setIsModalOpen(false);
            setMemberToEdit(null);
          }} 
          onSuccess={memberToEdit ? handleMemberUpdated : handleMemberAdded} 
        />
      )}

      {isPrintingAttendance && (
        <AttendanceSheet 
          study={study} 
          members={members} 
          printDate={isPrintingAttendance}
          onClose={() => setIsPrintingAttendance(false)} 
        />
      )}
    </StudyLayout>
  );
};

export default TeamMembers;
