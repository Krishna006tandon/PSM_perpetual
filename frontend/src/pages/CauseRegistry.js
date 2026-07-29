import React, { useState, useEffect } from 'react';
import StudyLayout from '../components/StudyLayout';
import AddCauseModal from '../components/AddCauseModal';
import './CauseRegistry.css';

const CauseRegistry = ({ study, onBack, onNavigate, theme, toggleTheme }) => {
  const [causes, setCauses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchCauses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/causes/${study._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCauses(data);
      }
    } catch (error) {
      console.error('Failed to fetch causes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCauses();
  }, [study._id]);

  const handleCellChange = (id, field, value) => {
    setCauses(prev => prev.map(cause => {
      if (cause._id === id) {
        return { ...cause, [field]: value };
      }
      return cause;
    }));
  };

  const handleBlur = async (id, field, value) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/causes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ [field]: value })
      });
    } catch (error) {
      console.error('Failed to save cause:', error);
    }
  };

  const handleAddCauseSuccess = (newCause) => {
    setCauses(prev => [...prev, newCause]);
    setIsModalOpen(false);
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/causes/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        setCauses(prev => prev.filter(c => c._id !== id));
        if (selectedRowId === id) setSelectedRowId(null);
      }
    } catch (error) {
      console.error('Failed to delete cause:', error);
    }
  };

  const handleCopy = async () => {
    if (!selectedRowId) return;
    const causeToCopy = causes.find(c => c._id === selectedRowId);
    if (!causeToCopy) return;

    try {
      const token = localStorage.getItem('token');
      const { _id, createdAt, updatedAt, order, ...copyData } = causeToCopy;
      
      const response = await fetch(`http://localhost:5000/api/causes/${study._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(copyData)
      });
      
      if (response.ok) {
        const newCause = await response.json();
        setCauses(prev => [...prev, newCause]);
      }
    } catch (error) {
      console.error('Failed to copy cause:', error);
    }
  };

  const handleCut = async () => {
    if (!selectedRowId) return;
    await handleCopy();
    await handleDelete(selectedRowId);
  };

  const handleMove = async (direction) => {
    if (!selectedRowId) return;
    const index = causes.findIndex(c => c._id === selectedRowId);
    if (index < 0) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === causes.length - 1) return;

    const newCauses = [...causes];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    const temp = newCauses[index];
    newCauses[index] = newCauses[swapIndex];
    newCauses[swapIndex] = temp;
    
    const updatedCauses = newCauses.map((cause, i) => ({ ...cause, order: i }));
    setCauses(updatedCauses);

    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/causes/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          causes: updatedCauses.map(c => ({ id: c._id, order: c.order }))
        })
      });
    } catch (error) {
      console.error('Failed to reorder causes:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const headers = ['CAUSE DESCRIPTION', 'CATEGORY / TYPE', 'SOURCE / REFERENCE', 'COMMENTS'];
    const csvRows = [headers.join(',')];
    
    causes.forEach(cause => {
      const row = [
        `"${cause.description || ''}"`,
        `"${cause.categoryType || ''}"`,
        `"${cause.sourceReference || ''}"`,
        `"${cause.comments || ''}"`
      ];
      csvRows.push(row.join(','));
    });
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'causes_registry_export.csv');
    a.click();
  };

  if (!study) return null;

  return (
    <StudyLayout activeTab="causes-registry" onBack={onBack} onNavigate={onNavigate} theme={theme} toggleTheme={toggleTheme}>
      <div className="causes-container">
        <div className="causes-header">
          <div className="causes-header-left">
            <h2>CAUSES REGISTRY</h2>
          </div>
          <button className="btn-manage-columns">
            <span className="icon">◫</span> MANAGE COLUMNS
          </button>
        </div>

        <div className="nodes-toolbar">
          <button className="toolbar-btn" onClick={() => setIsModalOpen(true)} title="Add Row">
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

        <div className="causes-table-wrapper">
          <table className="causes-table">
            <thead>
              <tr>
                <th className="col-cause-num">#</th>
                <th className="col-cause-desc">CAUSE DESCRIPTION</th>
                <th className="col-cause-cat">CATEGORY / TYPE</th>
                <th className="col-cause-source">SOURCE / REFERENCE</th>
                <th className="col-cause-comments">COMMENTS</th>
              </tr>
            </thead>
            <tbody>
              {!loading && causes.map((cause, index) => (
                <tr 
                  key={cause._id} 
                  className={selectedRowId === cause._id ? 'selected-row' : ''}
                  onClick={() => setSelectedRowId(cause._id)}
                >
                  <td className="col-cause-num">{index + 1}</td>
                  <td className="col-cause-desc">
                    <input data-gramm="false" spellcheck="false" 
                      type="text" 
                      value={cause.description} 
                      onChange={(e) => handleCellChange(cause._id, 'description', e.target.value)}
                      onBlur={(e) => handleBlur(cause._id, 'description', e.target.value)}
                    />
                  </td>
                  <td className="col-cause-cat">
                    <input data-gramm="false" spellcheck="false" 
                      type="text" 
                      value={cause.categoryType} 
                      onChange={(e) => handleCellChange(cause._id, 'categoryType', e.target.value)}
                      onBlur={(e) => handleBlur(cause._id, 'categoryType', e.target.value)}
                    />
                  </td>
                  <td className="col-cause-source">
                    <input data-gramm="false" spellcheck="false" 
                      type="text" 
                      value={cause.sourceReference} 
                      onChange={(e) => handleCellChange(cause._id, 'sourceReference', e.target.value)}
                      onBlur={(e) => handleBlur(cause._id, 'sourceReference', e.target.value)}
                    />
                  </td>
                  <td className="col-cause-comments">
                    <input data-gramm="false" spellcheck="false" 
                      type="text" 
                      value={cause.comments} 
                      onChange={(e) => handleCellChange(cause._id, 'comments', e.target.value)}
                      onBlur={(e) => handleBlur(cause._id, 'comments', e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <AddCauseModal 
          studyId={study._id} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={handleAddCauseSuccess} 
        />
      )}
    </StudyLayout>
  );
};

export default CauseRegistry;
