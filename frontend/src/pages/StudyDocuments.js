import React, { useState, useEffect, useRef } from 'react';
import StudyLayout from '../components/StudyLayout';
import ManageColumnsModal from '../components/ManageColumnsModal';
import AddDocumentModal from '../components/AddDocumentModal';
import './StudyDocuments.css';

const StudyDocuments = ({ study, onBack, onNavigate, theme, toggleTheme , canEdit}) => {
  const [documents, setDocuments] = useState([]);
  const [columns, setColumns] = useState([]);
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState(null);
  
  const fileInputRef = useRef(null);

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const colRes = await fetch(`http://localhost:5000/api/columns/${study._id}/documents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (colRes.ok) {
        const colData = await colRes.json();
        setColumns(colData.columns || []);
      }

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

  const handleCellChange = (id, field, value, isCustom = false) => {
    setDocuments(prev => prev.map(doc => {
      if (doc._id === id) {
        if (isCustom) {
          const newData = { ...(doc.customData || {}) };
          newData[field] = value;
          return { ...doc, customData: newData };
        }
        return { ...doc, [field]: value };
      }
      return doc;
    }));
  };

  const handleBlur = async (id, field, value, isCustom = false) => {
    try {
      const token = localStorage.getItem('token');
      const item = documents.find(x => x._id === id);
      if (!item) return;

      let payload = {};
      if (isCustom) {
        payload.customData = { ...(item.customData || {}) };
        payload.customData[field] = value;
      } else {
        payload[field] = value;
      }

      await fetch(`http://localhost:5000/api/documents/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error('Failed to save:', error);
    }
  };

  const handleColumnsSaved = (newCols) => {
    setColumns(newCols);
    setIsManageColumnsOpen(false);
  };

  const renderCustomCell = (doc, col) => {
    const value = (doc.customData && doc.customData[col.id]) || '';
    if (col.type === 'dropdown' && col.options) {
      return (
        <select disabled={!canEdit}  value={value} onChange={(e) => {
          handleCellChange(doc._id, col.id, e.target.value, true);
          handleBlur(doc._id, col.id, e.target.value, true);
        }} style={{ width: '100%', border: 'none', background: 'transparent' }}>
          <option value=""></option>
          {col.options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
        </select>
      );
    }
    return (
      <input disabled={!canEdit}  
        data-gramm="false" spellcheck="false"
        type="text" 
        value={value} 
        onChange={(e) => handleCellChange(doc._id, col.id, e.target.value, true)}
        onBlur={(e) => handleBlur(doc._id, col.id, e.target.value, true)}
      />
    );
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
      
      
      const colRes = await fetch(`http://localhost:5000/api/columns/${study._id}/documents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (colRes.ok) {
        const colData = await colRes.json();
        setColumns(colData.columns || []);
      }

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
      {isManageColumnsOpen && (
        <ManageColumnsModal 
          studyId={study._id} 
          registryType="documents" 
          onClose={() => setIsManageColumnsOpen(false)} 
          onSave={handleColumnsSaved} 
        />
      )}
        <div className="docs-header">
          <div className="docs-header-left">
            <h2>STUDY DOCUMENTS</h2>
          </div>
          <button className="btn-manage-columns" onClick={() => setIsManageColumnsOpen(true)}>
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
                {columns.map(col => <th key={col.id} className="col-custom">{col.label}</th>)}
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
                    <input disabled={!canEdit}  data-gramm="false" spellcheck="false" 
                      type="text" 
                      value={doc.drawingId} 
                      onChange={(e) => handleCellChange(doc._id, 'drawingId', e.target.value)}
                      onBlur={(e) => handleBlur(doc._id, 'drawingId', e.target.value)}
                    />
                  </td>
                  <td>
                    <input disabled={!canEdit}  data-gramm="false" spellcheck="false" 
                      type="text" 
                      value={doc.revision} 
                      onChange={(e) => handleCellChange(doc._id, 'revision', e.target.value)}
                      onBlur={(e) => handleBlur(doc._id, 'revision', e.target.value)}
                    />
                  </td>
                  <td>
                    <select disabled={!canEdit}  
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
                    <input disabled={!canEdit}  data-gramm="false" spellcheck="false" 
                      type="text" 
                      value={doc.description} 
                      onChange={(e) => handleCellChange(doc._id, 'description', e.target.value)}
                      onBlur={(e) => handleBlur(doc._id, 'description', e.target.value)}
                    />
                  </td>
                  <td>
                    <input disabled={!canEdit}  data-gramm="false" spellcheck="false" 
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
                    <input disabled={!canEdit}  data-gramm="false" spellcheck="false" 
                      type="file" 
                      id={`file-upload-${doc._id}`}
                      style={{ display: 'none' }}
                      onChange={(e) => handleFileUpload(e, doc._id)}
                    />
                  </td>
                  <td className="action-cell">
                    {canEdit && <button className="btn-delete-row" onClick={() => handleDelete(doc._id)}>
                      🗑️
                    </button>}
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
