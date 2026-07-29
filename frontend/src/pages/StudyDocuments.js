import React, { useState, useEffect, useRef } from 'react';
import StudyLayout from '../components/StudyLayout';
import AddDocumentModal from '../components/AddDocumentModal';
import './StudyDocuments.css';

const StudyDocuments = ({ study, onBack, onNavigate, theme, toggleTheme }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState(null);
  
  const fileInputRef = useRef(null);

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/documents/${study._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [study._id]);

  const handleDocumentAdded = (newDoc) => {
    setDocuments([...documents, newDoc]);
    setIsModalOpen(false);
  };

  const handleCellChange = (id, field, value) => {
    setDocuments(docs => docs.map(doc => 
      doc._id === id ? { ...doc, [field]: value } : doc
    ));
  };

  const handleBlur = async (id, field, value) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/documents/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ [field]: value })
      });
    } catch (error) {
      console.error('Failed to save document:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/documents/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        setDocuments(docs => docs.filter(doc => doc._id !== id));
        if (selectedRowId === id) setSelectedRowId(null);
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const handleCopy = async () => {
    if (!selectedRowId) return;
    const docToCopy = documents.find(d => d._id === selectedRowId);
    if (!docToCopy) return;

    try {
      const token = localStorage.getItem('token');
      const { _id, createdAt, updatedAt, order, ...copyData } = docToCopy;
      
      const response = await fetch(`http://localhost:5000/api/documents/${study._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(copyData)
      });
      
      if (response.ok) {
        const newDoc = await response.json();
        setDocuments(prevDocs => [...prevDocs, newDoc]);
      }
    } catch (error) {
      console.error('Failed to copy document:', error);
    }
  };

  const handleCut = async () => {
    if (!selectedRowId) return;
    await handleCopy();
    await handleDelete(selectedRowId);
  };

  const handleMove = async (direction) => {
    if (!selectedRowId) return;
    const index = documents.findIndex(d => d._id === selectedRowId);
    if (index < 0) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === documents.length - 1) return;

    const newDocs = [...documents];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap local elements
    const temp = newDocs[index];
    newDocs[index] = newDocs[swapIndex];
    newDocs[swapIndex] = temp;
    
    // Re-assign orders based on new array position
    const updatedDocs = newDocs.map((doc, i) => ({ ...doc, order: i }));
    setDocuments(updatedDocs);

    // Sync with backend
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/documents/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          documents: updatedDocs.map(d => ({ id: d._id, order: d.order }))
        })
      });
    } catch (error) {
      console.error('Failed to reorder documents:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const headers = ['DRAWING ID', 'REV.', 'DOCUMENT TYPE', 'DESCRIPTION', 'HYPERLINK'];
    const csvRows = [headers.join(',')];
    
    documents.forEach(doc => {
      const row = [
        `"${doc.drawingId || ''}"`,
        `"${doc.revision || ''}"`,
        `"${doc.documentType || ''}"`,
        `"${doc.description || ''}"`,
        `"${doc.hyperlink || ''}"`
      ];
      csvRows.push(row.join(','));
    });
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'documents_export.csv');
    a.click();
  };

  const handleFileUpload = async (e, id) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('attachment', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/documents/${id}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (response.ok) {
        const updatedDoc = await response.json();
        setDocuments(docs => docs.map(d => d._id === id ? updatedDoc : d));
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
    }
  };

  if (!study) return null;

  return (
    <StudyLayout activeTab="documents" onBack={onBack} onNavigate={onNavigate} theme={theme} toggleTheme={toggleTheme}>
      <div className="docs-container">
        <div className="docs-header">
          <div className="docs-header-left">
            <h2>STUDY DOCUMENTS</h2>
          </div>
          <button className="btn-manage-columns">
            <span className="icon">◫</span> MANAGE COLUMNS
          </button>
        </div>

        <div className="docs-toolbar">
          <button className="toolbar-btn" onClick={() => setIsModalOpen(true)} title="Add Document">
            <span className="icon-plus">⊕</span>
          </button>
          <div className="toolbar-divider"></div>
          <button className="toolbar-btn" onClick={handleCopy} title="Copy Selected Row">
            <span className="icon">📄</span>
          </button>
          <button className="toolbar-btn" onClick={handleCut} title="Cut Selected Row">
            <span className="icon">✂️</span>
          </button>
          <button className="toolbar-btn icon-delete" onClick={() => selectedRowId && handleDelete(selectedRowId)} title="Delete Selected Row">
            <span className="icon">🗑️</span>
          </button>
          <div className="toolbar-divider"></div>
          <button className="toolbar-btn" onClick={() => handleMove('up')} title="Move Up">
            <span className="icon">↑</span>
          </button>
          <button className="toolbar-btn" onClick={() => handleMove('down')} title="Move Down">
            <span className="icon">↓</span>
          </button>
          <div className="toolbar-divider"></div>
          <button className="toolbar-btn" onClick={handlePrint} title="Print">
            <span className="icon">🖨️</span>
          </button>
          <button className="toolbar-btn" onClick={handleExport} title="Export to CSV">
            <span className="icon">📥</span>
          </button>
        </div>

        <div className="docs-table-wrapper">
          <table className="docs-table">
            <thead>
              <tr>
                <th className="col-num">#</th>
                <th className="col-drawing">DRAWING ID</th>
                <th className="col-rev">REV.</th>
                <th className="col-type">DOCUMENT TYPE</th>
                <th className="col-desc">DESCRIPTION</th>
                <th className="col-link">HYPERLINK / URI</th>
                <th className="col-attach">ATTACHMENT</th>
                <th className="col-action"></th>
              </tr>
            </thead>
            <tbody>
              {!loading && documents.map((doc, index) => (
                <tr 
                  key={doc._id} 
                  className={selectedRowId === doc._id ? 'selected-row' : ''}
                  onClick={() => setSelectedRowId(doc._id)}
                >
                  <td className="col-num">{index + 1}</td>
                  <td>
                    <input data-gramm="false" spellcheck="false" 
                      type="text" 
                      value={doc.drawingId} 
                      onChange={(e) => handleCellChange(doc._id, 'drawingId', e.target.value)}
                      onBlur={(e) => handleBlur(doc._id, 'drawingId', e.target.value)}
                    />
                  </td>
                  <td>
                    <input data-gramm="false" spellcheck="false" 
                      type="text" 
                      value={doc.revision} 
                      onChange={(e) => handleCellChange(doc._id, 'revision', e.target.value)}
                      onBlur={(e) => handleBlur(doc._id, 'revision', e.target.value)}
                    />
                  </td>
                  <td>
                    <select 
                      value={doc.documentType} 
                      onChange={(e) => {
                        handleCellChange(doc._id, 'documentType', e.target.value);
                        handleBlur(doc._id, 'documentType', e.target.value);
                      }}
                      style={{width: '100%', height: '100%', border: 'none', padding: '8px', fontSize: '12px', background: 'transparent'}}
                    >
                      <option value="P&ID">P&ID</option>
                      <option value="PFD">PFD</option>
                      <option value="Layout">Layout</option>
                      <option value="Datasheet">Datasheet</option>
                      <option value="Cause & Effect">Cause & Effect</option>
                      <option value="Other">Other</option>
                    </select>
                  </td>
                  <td>
                    <input data-gramm="false" spellcheck="false" 
                      type="text" 
                      value={doc.description} 
                      onChange={(e) => handleCellChange(doc._id, 'description', e.target.value)}
                      onBlur={(e) => handleBlur(doc._id, 'description', e.target.value)}
                    />
                  </td>
                  <td>
                    <input data-gramm="false" spellcheck="false" 
                      type="text" 
                      placeholder="https://..."
                      value={doc.hyperlink} 
                      onChange={(e) => handleCellChange(doc._id, 'hyperlink', e.target.value)}
                      onBlur={(e) => handleBlur(doc._id, 'hyperlink', e.target.value)}
                    />
                  </td>
                  <td className="attachment-cell" onClick={() => {
                    const input = document.getElementById(`file-upload-${doc._id}`);
                    if(input) input.click();
                  }} style={{ cursor: 'pointer' }}>
                    <span className="attach-icon">📄</span> 
                    <span className="attach-text" style={{ color: doc.originalFileName ? '#004d80' : '#94a3b8', fontWeight: doc.originalFileName ? 'bold' : 'normal' }}>
                      {doc.originalFileName || 'No file'}
                    </span>
                    <input data-gramm="false" spellcheck="false" 
                      type="file" 
                      id={`file-upload-${doc._id}`}
                      style={{ display: 'none' }}
                      onChange={(e) => handleFileUpload(e, doc._id)}
                    />
                  </td>
                  <td className="action-cell">
                    <button className="btn-delete-row" onClick={() => handleDelete(doc._id)}>
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <AddDocumentModal 
          studyId={study._id} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={handleDocumentAdded} 
        />
      )}
    </StudyLayout>
  );
};

export default StudyDocuments;
