import React, { useEffect } from 'react';
import './AttendanceSheet.css';

const AttendanceSheet = ({ study, members, onClose }) => {
  
  // Pad members to minimum 14 rows as requested by screenshot
  const paddedMembers = [...members];
  while (paddedMembers.length < 14) {
    paddedMembers.push({ fullName: '', discipline: '' });
  }

  const handlePrint = () => {
    window.print();
  };

  // We don't automatically print on mount so they can see the layout first
  // But they can click the print button

  return (
    <div className="attendance-sheet-overlay">
      <div className="attendance-header-actions">
        <button className="btn-print-now" onClick={handlePrint}>🖨️ PRINT</button>
        <button className="btn-close-print" onClick={onClose}>✕ CLOSE</button>
      </div>

      <div className="attendance-sheet-print-container">
        <div className="attendance-sheet-logo">
          <img src="/logo.png" alt="Perpetual Solutions Logo" style={{maxHeight: '80px', objectFit: 'contain'}} onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'block';
          }} />
          <div style={{display: 'none'}}>
            <h1 style={{color: '#0ea5e9', margin: 0}}>Perpetual</h1>
            <h2 style={{color: '#333', margin: 0, fontSize: '18px'}}>Solutions</h2>
          </div>
        </div>

        <div className="attendance-sheet-title">
          Attendance Sheet
        </div>

        <div className="attendance-sheet-details">
          <div className="detail-row">
            <div className="detail-item" style={{flex: 2}}>
              <span>1. Name of the Organization:</span>
              <input type="text" className="attendance-input" defaultValue={study?.companyName || ''} />
            </div>
          </div>
          <div className="detail-row">
            <div className="detail-item" style={{flex: 2}}>
              <span>2. Name of the Client:</span>
              <input type="text" className="attendance-input" />
            </div>
          </div>
          <div className="detail-row">
            <div className="detail-item" style={{flex: 2}}>
              <span>3. Signature of the Client:</span>
              <input type="text" className="attendance-input" />
            </div>
          </div>
          <div className="detail-row">
            <div className="detail-item">
              <span>4. Date of Meeting:</span>
              <input type="text" className="attendance-input" />
            </div>
            <div className="detail-item">
              <span>Place of Meeting:</span>
              <input type="text" className="attendance-input" />
            </div>
          </div>
          <div className="detail-row">
            <div className="detail-item">
              <span>5. Meeting started at :</span>
              <input type="text" className="attendance-input" />
            </div>
            <div className="detail-item">
              <span>Meeting ended at:</span>
              <input type="text" className="attendance-input" />
            </div>
          </div>
        </div>

        <table className="attendance-table">
          <thead>
            <tr>
              <th style={{width: '50px'}}>Sr.<br/>No.</th>
              <th>Name of the Partner Attending the<br/>Meeting</th>
              <th>Department</th>
              <th>Signature</th>
            </tr>
          </thead>
          <tbody>
            {paddedMembers.map((member, index) => (
              <tr key={index}>
                <td>{index + 1}.</td>
                <td>{member.fullName || ''}</td>
                <td>{member.discipline || ''}</td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceSheet;
