import React, { useState, useEffect } from 'react';
import './PHAStartMenu.css';

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#00a896' }}>
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="16"></line>
    <line x1="8" y1="12" x2="16" y2="12"></line>
  </svg>
);

const FolderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#8898aa' }}>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
  </svg>
);

const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#5e72e4' }}>
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const FileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#c3cdd6' }}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

const PHAStartMenu = ({ onStudyCreated, onLogout, canEdit }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [recentStudies, setRecentStudies] = useState([]);
  const [formData, setFormData] = useState({
    studyName: '',
    studyCoordinator: '',
    contactInfo: '',
    facility: '',
    owner: '',
    plantUnit: '',
    phaType: 'HAZOP',
    studyStatus: 'Planned'
  });

  
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch('http://localhost:5000/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const user = await res.json();
        setCurrentUser(user);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchRecentStudies();
  }, []);

  const fetchRecentStudies = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/studies/recent', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setRecentStudies(data);
      } else if (response.status === 401) {
        if (onLogout) onLogout();
      }
    } catch (error) {
      console.error('Failed to fetch recent studies:', error);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateStudy = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/studies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const newStudy = await response.json();
        setIsModalOpen(false);
        if (onStudyCreated) {
          onStudyCreated(newStudy);
        }
      } else if (response.status === 401) {
        console.error('Unauthorized: Token expired or invalid');
        if (onLogout) onLogout();
      } else {
        console.error('Failed to create study');
      }
    } catch (error) {
      console.error('Error creating study:', error);
    }
  };

  return (
    <div className="pha-container">
      <div className="pha-header">
        <h1 className="pha-title">
          WELCOME <span className="pha-title-separator">—</span> START MENU
        </h1>
        <div className="pha-title-underline"></div>
      </div>

      <div className="pha-content">
        <div className="pha-actions">
          {canEdit && (
            <button className="pha-action-card" onClick={() => setIsModalOpen(true)}>
              <div className="pha-action-icon-wrapper create-icon">
                <PlusIcon />
              </div>
              <div className="pha-action-text">
                <h2>CREATE NEW UNIT</h2>
                <p>Start a fresh PHA study</p>
              </div>
            </button>
          )}

          <button className="pha-action-card">
            <div className="pha-action-icon-wrapper open-icon">
              <FolderIcon />
            </div>
            <div className="pha-action-text">
              <h2>OPEN LOCAL FILE</h2>
              <p>Load study from disk</p>
            </div>
          </button>
        </div>

        <div className="pha-recent-studies">
          <div className="pha-recent-header">
            <ClockIcon />
            <span>RECENT STUDIES</span>
          </div>
          
          {recentStudies.length === 0 ? (
            <div className="pha-recent-empty">
              <FileIcon />
              <p>NO STUDIES YET</p>
            </div>
          ) : (
            <div className="pha-recent-list">
              {recentStudies.map(study => (
                <div key={study._id} className="recent-study-item">
                  <div className="recent-study-info">
                    <h4>{study.studyName}</h4>
                    <p>{study.phaType} • {new Date(study.lastAccessed).toLocaleDateString()}</p>
                  </div>
                  <button className="open-study-btn" onClick={() => onStudyCreated(study)}>OPEN</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Create New Unit</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Study Name</label>
                <input data-gramm="false" spellcheck="false" type="text" name="studyName" value={formData.studyName} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>Study Coordinator</label>
                <input data-gramm="false" spellcheck="false" type="text" name="studyCoordinator" value={formData.studyCoordinator} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>Contact Info</label>
                <input data-gramm="false" spellcheck="false" type="text" name="contactInfo" value={formData.contactInfo} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>Facility</label>
                <input data-gramm="false" spellcheck="false" type="text" name="facility" value={formData.facility} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>Owner</label>
                <input data-gramm="false" spellcheck="false" type="text" name="owner" value={formData.owner} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>Plant / Unit</label>
                <input data-gramm="false" spellcheck="false" type="text" name="plantUnit" value={formData.plantUnit} onChange={handleInputChange} />
              </div>
              
              <div className="form-group">
                <label>PHA Type</label>
                <select name="phaType" value={formData.phaType} onChange={handleInputChange}>
                  <option value="HAZOP">HAZOP</option>
                  <option value="LOPA">LOPA</option>
                  <option value="What-If">What-If</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Study Status</label>
                <select name="studyStatus" value={formData.studyStatus} onChange={handleInputChange}>
                  <option value="Planned">Planned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setIsModalOpen(false)}>CANCEL</button>
              <button className="btn-create" onClick={handleCreateStudy}>CREATE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PHAStartMenu;
