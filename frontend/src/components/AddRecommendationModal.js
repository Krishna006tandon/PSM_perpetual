import React, { useState } from 'react';
import './AddNodeModal.css';

const AddRecommendationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  existingRecommendations = [], 
  nextRecNo = 'R1' 
}) => {
  const [tab, setTab] = useState('new'); // 'new' | 'copy'
  const [newText, setNewText] = useState('');
  const [selectedExistingIdx, setSelectedExistingIdx] = useState(0);
  const [isEditingCopy, setIsEditingCopy] = useState(false);
  const [copyEditedText, setCopyEditedText] = useState('');

  if (!isOpen) return null;

  const currentExisting = existingRecommendations[selectedExistingIdx] || null;

  const handleSelectExisting = (idx) => {
    setSelectedExistingIdx(idx);
    setIsEditingCopy(false);
    if (existingRecommendations[idx]) {
      setCopyEditedText(existingRecommendations[idx].text || '');
    }
  };

  const handleAddNew = (e) => {
    e.preventDefault();
    if (!newText.trim()) {
      alert('Please enter recommendation text.');
      return;
    }
    onConfirm({
      text: newText.trim(),
      recommendationNo: nextRecNo,
      isExactCopy: false
    });
    onClose();
  };

  const handleUseExactCopy = () => {
    if (!currentExisting) return;
    onConfirm({
      text: currentExisting.text,
      recommendationNo: currentExisting.recommendationNo || nextRecNo,
      isExactCopy: true
    });
    onClose();
  };

  const handleCopyAndEdit = (e) => {
    e.preventDefault();
    if (!copyEditedText.trim()) {
      alert('Please enter recommendation text.');
      return;
    }
    onConfirm({
      text: copyEditedText.trim(),
      recommendationNo: nextRecNo, // Assigns new recommendation number!
      isExactCopy: false
    });
    onClose();
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 10000
    }}>
      <div className="modal-container" style={{
        backgroundColor: '#ffffff', borderRadius: '10px', width: '90%',
        maxWidth: '650px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          backgroundColor: '#0f172a', color: '#ffffff'
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', letterSpacing: '0.5px' }}>
            ADD RECOMMENDATION
          </h3>
          <button 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
          >
            &times;
          </button>
        </div>

        {/* Tab Selector */}
        <div style={{
          display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc'
        }}>
          <button
            type="button"
            onClick={() => setTab('new')}
            style={{
              flex: 1, padding: '12px 16px', border: 'none', background: tab === 'new' ? '#ffffff' : 'transparent',
              fontWeight: tab === 'new' ? '700' : '500',
              color: tab === 'new' ? '#0284c7' : '#64748b',
              borderBottom: tab === 'new' ? '2px solid #0284c7' : 'none',
              cursor: 'pointer', fontSize: '13px'
            }}
          >
            ➕ Add New Recommendation
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('copy');
              if (existingRecommendations.length > 0 && !copyEditedText) {
                setCopyEditedText(existingRecommendations[0].text || '');
              }
            }}
            style={{
              flex: 1, padding: '12px 16px', border: 'none', background: tab === 'copy' ? '#ffffff' : 'transparent',
              fontWeight: tab === 'copy' ? '700' : '500',
              color: tab === 'copy' ? '#0284c7' : '#64748b',
              borderBottom: tab === 'copy' ? '2px solid #0284c7' : 'none',
              cursor: 'pointer', fontSize: '13px'
            }}
          >
            📋 Copy Existing ({existingRecommendations.length})
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px' }}>
          {tab === 'new' && (
            <form onSubmit={handleAddNew}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>
                    RECOMMENDATION STATEMENT
                  </label>
                  <span style={{
                    fontSize: '11px', fontWeight: '700', backgroundColor: '#e0f2fe',
                    color: '#0369a1', padding: '2px 8px', borderRadius: '12px'
                  }}>
                    Assigned: {nextRecNo}
                  </span>
                </div>
                <textarea
                  autoFocus
                  rows={4}
                  spellCheck={true}
                  style={{
                    width: '100%', padding: '10px', borderRadius: '6px',
                    border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box',
                    fontFamily: 'inherit', resize: 'vertical'
                  }}
                  placeholder="Enter clear, actionable recommendation..."
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1',
                    background: '#ffffff', color: '#475569', cursor: 'pointer', fontSize: '12px', fontWeight: '600'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px', borderRadius: '6px', border: 'none',
                    background: '#0284c7', color: '#ffffff', cursor: 'pointer', fontSize: '12px', fontWeight: '700'
                  }}
                >
                  Add as {nextRecNo}
                </button>
              </div>
            </form>
          )}

          {tab === 'copy' && (
            <div>
              {existingRecommendations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b' }}>
                  No existing recommendations found in this study yet. Please add a new one.
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                      SELECT EXISTING RECOMMENDATION TO REUSE:
                    </label>
                    <select
                      style={{
                        width: '100%', padding: '9px 12px', borderRadius: '6px',
                        border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff'
                      }}
                      value={selectedExistingIdx}
                      onChange={(e) => handleSelectExisting(parseInt(e.target.value))}
                    >
                      {existingRecommendations.map((rec, i) => (
                        <option key={i} value={i}>
                          [{rec.recommendationNo || `R${i+1}`}] {rec.text.length > 70 ? rec.text.substring(0, 70) + '...' : rec.text} {rec.nodeName ? `(${rec.nodeName})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {currentExisting && (
                    <div style={{
                      backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
                      borderRadius: '6px', padding: '14px', marginBottom: '16px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#0369a1' }}>
                          Selected: {currentExisting.recommendationNo || `R${selectedExistingIdx+1}`}
                        </span>
                        {currentExisting.nodeName && (
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            {currentExisting.nodeName}
                          </span>
                        )}
                      </div>

                      {!isEditingCopy ? (
                        <div style={{
                          fontSize: '13px', color: '#1e293b', whiteSpace: 'pre-wrap',
                          lineHeight: '1.5', minHeight: '48px'
                        }}>
                          {currentExisting.text}
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11px', color: '#d97706', fontWeight: '600' }}>
                              Editing recommendation - will assign NEW number: {nextRecNo}
                            </span>
                          </div>
                          <textarea
                            rows={4}
                            spellCheck={true}
                            style={{
                              width: '100%', padding: '10px', borderRadius: '6px',
                              border: '1px solid #f59e0b', fontSize: '13px', boxSizing: 'border-box',
                              fontFamily: 'inherit', resize: 'vertical'
                            }}
                            value={copyEditedText}
                            onChange={(e) => setCopyEditedText(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Options */}
                  <div style={{
                    display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', flexWrap: 'wrap'
                  }}>
                    <button
                      type="button"
                      onClick={onClose}
                      style={{
                        padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e1',
                        background: '#ffffff', color: '#475569', cursor: 'pointer', fontSize: '12px', fontWeight: '600'
                      }}
                    >
                      Cancel
                    </button>

                    {!isEditingCopy ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsEditingCopy(true)}
                          style={{
                            padding: '8px 16px', borderRadius: '6px', border: '1px solid #0284c7',
                            background: '#f0f9ff', color: '#0284c7', cursor: 'pointer', fontSize: '12px', fontWeight: '700'
                          }}
                        >
                          ✏️ Copy & Edit (New {nextRecNo})
                        </button>
                        <button
                          type="button"
                          onClick={handleUseExactCopy}
                          style={{
                            padding: '8px 18px', borderRadius: '6px', border: 'none',
                            background: '#10b981', color: '#ffffff', cursor: 'pointer', fontSize: '12px', fontWeight: '700'
                          }}
                        >
                          ✅ Use As-Is (Keep {currentExisting?.recommendationNo || nextRecNo})
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsEditingCopy(false)}
                          style={{
                            padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e1',
                            background: '#f8fafc', color: '#64748b', cursor: 'pointer', fontSize: '12px'
                          }}
                        >
                          Cancel Edit
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyAndEdit}
                          style={{
                            padding: '8px 18px', borderRadius: '6px', border: 'none',
                            background: '#0284c7', color: '#ffffff', cursor: 'pointer', fontSize: '12px', fontWeight: '700'
                          }}
                        >
                          Save as New ({nextRecNo})
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddRecommendationModal;
