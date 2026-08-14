import React, { useState } from 'react';
import './AddMemberModal.css';

const ROLES = [
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
];

const DISCIPLINES = [
  'Chemical Engineering',
  'Process Safety',
  'Instrumentation & Controls',
  'Electrical',
  'Mechanical',
  'Operations',
  'Maintenance',
  'Environmental',
  'Management',
  'IT & Digitalization',
  'Admin & HR',
  'External Consultant'
];

const AddMemberModal = ({ studyId, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    company: '',
    role: 'Study Leader',
    discipline: 'Process Safety'
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://api.perpetualsolutions.co.in/api/teams/${studyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        onSuccess(data);
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to add team member:', error);
      alert('Failed to add team member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="member-modal">
        <div className="member-modal-header">
          <div className="member-modal-title">
            <span className="icon">👥</span> ADD TEAM MEMBER
          </div>
          <button className="member-modal-close" onClick={onClose}>&times;</button>
        </div>

        <form className="member-modal-body" onSubmit={handleSubmit}>
          <div className="form-group-row">
            <label>FULL NAME</label>
            <input data-gramm="false" spellcheck="false" 
              type="text" 
              name="fullName" 
              value={formData.fullName} 
              onChange={handleChange} 
              required 
            />
          </div>
          <div className="form-group-row">
            <label>EMAIL</label>
            <input data-gramm="false" spellcheck="false" 
              type="email" 
              name="email" 
              value={formData.email} 
              onChange={handleChange} 
              required 
            />
          </div>
          <div className="form-group-row">
            <label>PHONE</label>
            <input data-gramm="false" spellcheck="false" 
              type="text" 
              name="phone" 
              value={formData.phone} 
              onChange={handleChange} 
            />
          </div>
          <div className="form-group-row">
            <label>COMPANY / ORGANISATION</label>
            <input data-gramm="false" spellcheck="false" 
              type="text" 
              name="company" 
              value={formData.company} 
              onChange={handleChange} 
            />
          </div>
          <div className="form-group-row">
            <label>ROLE</label>
            <select name="role" value={formData.role} onChange={handleChange}>
              {ROLES.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
          <div className="form-group-row">
            <label>DISCIPLINE</label>
            <select name="discipline" value={formData.discipline} onChange={handleChange}>
              {DISCIPLINES.map(disc => (
                <option key={disc} value={disc}>{disc}</option>
              ))}
            </select>
          </div>

          <div className="member-modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>CANCEL</button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? 'SAVING...' : 'SAVE MEMBER'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMemberModal;
