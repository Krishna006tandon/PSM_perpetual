import React, { useState, useEffect } from 'react';
import StudyLayout from '../components/StudyLayout';
import AddMemberModal from '../components/AddMemberModal';
import './TeamMembers.css';

const TeamMembers = ({ study, onBack, onNavigate, theme, toggleTheme , canEdit}) => {
  const [members, setMembers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/teams/${study._id}`, {
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
  }, [study._id]);

  const handleMemberAdded = (newMember) => {
    setMembers([newMember, ...members]);
    setIsModalOpen(false);
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
          {canEdit && <button className="btn-add-member" onClick={() => setIsModalOpen(true)}>
            <span className="plus-icon">+</span> ADD MEMBER
          </button>}
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
            {canEdit && <button className="btn-add-first" onClick={() => setIsModalOpen(true)}>
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
                </tr>
              </thead>
              <tbody>
                {members.map(member => (
                  <tr key={member._id}>
                    <td>
                      <div className="member-name">{member.fullName}</div>
                      <div className="member-email">{member.email}</div>
                    </td>
                    <td><span className="role-badge">{member.role}</span></td>
                    <td>{member.discipline}</td>
                    <td>{member.company || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <AddMemberModal 
          studyId={study._id} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={handleMemberAdded} 
        />
      )}
    </StudyLayout>
  );
};

export default TeamMembers;
