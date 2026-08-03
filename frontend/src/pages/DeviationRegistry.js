import React, { useState, useEffect } from 'react';
import StudyLayout from '../components/StudyLayout';
import ManageColumnsModal from '../components/ManageColumnsModal';
import AddDeviationModal from '../components/AddDeviationModal';
import './DeviationRegistry.css';

const DeviationRegistry = ({ study, onBack, onNavigate, theme, toggleTheme , canEdit}) => {
  const [deviations, setDeviations] = useState([]);
  const [columns, setColumns] = useState([]);
  const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchDeviations = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const colRes = await fetch(`http://localhost:5000/api/columns/${study._id}/deviations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (colRes.ok) {
        const colData = await colRes.json();
        setColumns(colData.columns || []);
      }

      const response = await fetch(`http://localhost:5000/api/deviations/${study._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDeviations(data);
      }
    } catch (error) {
      console.error('Failed to fetch deviations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeviations();
  }, [study._id]);



  const handleCellChange = (id, field, value, isCustom = false) => {
    setDeviations(prev => prev.map(dev => {
      if (dev._id === id) {
        if (isCustom) {
          const newData = { ...(dev.customData || {}) };
          newData[field] = value;
          return { ...dev, customData: newData };
        }
        return { ...dev, [field]: value };
      }
      return dev;
    }));
  };

  const handleBlur = async (id, field, value, isCustom = false) => {
    try {
      const token = localStorage.getItem('token');
      const item = deviations.find(x => x._id === id);
      if (!item) return;

      let payload = {};
      if (isCustom) {
        payload.customData = { ...(item.customData || {}) };
        payload.customData[field] = value;
      } else {
        payload[field] = value;
      }

      await fetch(`http://localhost:5000/api/deviations/${id}`, {
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

  const renderCustomCell = (dev, col) => {
    const value = (dev.customData && dev.customData[col.id]) || '';
    if (col.type === 'dropdown' && col.options) {
      return (
        <select disabled={!canEdit}  value={value} onChange={(e) => {
          handleCellChange(dev._id, col.id, e.target.value, true);
          handleBlur(dev._id, col.id, e.target.value, true);
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
        onChange={(e) => handleCellChange(dev._id, col.id, e.target.value, true)}
        onBlur={(e) => handleBlur(dev._id, col.id, e.target.value, true)}
      />
    );
  };

  const handleAddDeviationSuccess = (newDeviation) => {
    setDeviations(prev => [...prev, newDeviation]);
    setIsModalOpen(false);
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/deviations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        setDeviations(prev => prev.filter(dev => dev._id !== id));
        if (selectedRowId === id) setSelectedRowId(null);
      }
    } catch (error) {
      console.error('Failed to delete deviation:', error);
    }
  };

  const handleCopy = async () => {
    if (!selectedRowId) return;
    const devToCopy = deviations.find(d => d._id === selectedRowId);
    if (!devToCopy) return;

    try {
      const token = localStorage.getItem('token');
      const { _id, createdAt, updatedAt, order, ...copyData } = devToCopy;
      
      
      const colRes = await fetch(`http://localhost:5000/api/columns/${study._id}/deviations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (colRes.ok) {
        const colData = await colRes.json();
        setColumns(colData.columns || []);
      }

      const response = await fetch(`http://localhost:5000/api/deviations/${study._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(copyData)
      });
      
      if (response.ok) {
        const newDev = await response.json();
        setDeviations(prev => [...prev, newDev]);
      }
    } catch (error) {
      console.error('Failed to copy deviation:', error);
    }
  };

  const handleCut = async () => {
    if (!selectedRowId) return;
    await handleCopy();
    await handleDelete(selectedRowId);
  };

  const handleMove = async (direction) => {
    if (!selectedRowId) return;
    const index = deviations.findIndex(d => d._id === selectedRowId);
    if (index < 0) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === deviations.length - 1) return;

    const newDevs = [...deviations];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    const temp = newDevs[index];
    newDevs[index] = newDevs[swapIndex];
    newDevs[swapIndex] = temp;
    
    const updatedDevs = newDevs.map((dev, i) => ({ ...dev, order: i }));
    setDeviations(updatedDevs);

    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/deviations/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          deviations: updatedDevs.map(d => ({ id: d._id, order: d.order }))
        })
      });
    } catch (error) {
      console.error('Failed to reorder deviations:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const headers = ['GUIDEWORDS', 'PARAMETER', 'PROCESS FLOW / MATERIAL', 'EQUIPMENT', 'INSTRUMENT', 'DEVIATION'];
    const csvRows = [headers.join(',')];
    
    deviations.forEach(dev => {
      const row = [
        `"${dev.guidewords || ''}"`,
        `"${dev.parameter || ''}"`,
        `"${dev.processFlowMaterial || ''}"`,
        `"${dev.locationFrom || ''}"`,
        `"${dev.locationTo || ''}"`,
        `"${dev.deviationAuto || ''}"`
      ];
      csvRows.push(row.join(','));
    });
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'deviations_registry_export.csv');
    a.click();
  };

  if (!study) return null;

  return (
    <StudyLayout activeTab="deviations-registry" onBack={onBack} onNavigate={onNavigate} theme={theme} toggleTheme={toggleTheme}>
      <div className="deviations-container">
      {isManageColumnsOpen && (
        <ManageColumnsModal 
          studyId={study._id} 
          registryType="deviations" 
          onClose={() => setIsManageColumnsOpen(false)} 
          onSave={handleColumnsSaved} 
        />
      )}
        <div className="deviations-header">
          <div className="deviations-header-left">
            <h2>DEVIATIONS REGISTRY</h2>
          </div>
          {canEdit && (
            <button className="btn-manage-columns" onClick={() => setIsManageColumnsOpen(true)}>
              <span className="icon">◫</span> MANAGE COLUMNS
            </button>
          )}
        </div>

        <div className="nodes-toolbar">
          {canEdit && <button className="toolbar-btn" onClick={() => setIsModalOpen(true)} title="Add Deviation">
            <span className="icon-plus">⊕</span>
          </button>}
          <div className="toolbar-divider"></div>
          {canEdit && <button className="toolbar-btn" onClick={handleCopy} title="Copy Selected Row">
            <span className="icon">📄</span>
          </button>}
          {canEdit && <button className="toolbar-btn" onClick={handleCut} title="Cut Selected Row">
            <span className="icon">✂️</span>
          </button>}
          {canEdit && <button className="toolbar-btn icon-delete" onClick={() => selectedRowId && handleDelete(selectedRowId)} title="Delete Selected Row">
            <span className="icon">🗑️</span>
          </button>}
          <div className="toolbar-divider"></div>
          {canEdit && <button className="toolbar-btn" onClick={() => handleMove('up')} title="Move Up">
            <span className="icon">↑</span>
          </button>}
          {canEdit && <button className="toolbar-btn" onClick={() => handleMove('down')} title="Move Down">
            <span className="icon">↓</span>
          </button>}
          <div className="toolbar-divider"></div>
          <button className="toolbar-btn" onClick={handlePrint} title="Print">
            <span className="icon">🖨️</span>
          </button>
          <button className="toolbar-btn" onClick={handleExport} title="Export to CSV">
            <span className="icon">📥</span>
          </button>
        </div>

        <div className="deviations-table-wrapper">
          <table className="deviations-table">
            <thead>
              <tr>
                <th className="col-dev-num">#</th>
                <th className="col-dev-guidewords">GUIDEWORDS</th>
                <th className="col-dev-parameter">PARAMETER</th>
                <th className="col-dev-process">PROCESS FLOW / MATERIAL</th>
                <th className="col-dev-loc-from">EQUIPMENT</th>
                <th className="col-dev-loc-to">INSTRUMENT</th>
                <th className="col-dev-auto">DEVIATION</th>
                {columns.map(col => <th key={col.id} className="col-custom">{col.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {!loading && deviations.map((dev, index) => (
                <tr 
                  key={dev._id} 
                  className={selectedRowId === dev._id ? 'selected-row' : ''}
                  onClick={() => setSelectedRowId(dev._id)}
                >
                  <td className="col-dev-num">{index + 1}</td>
                  <td className="col-dev-guidewords">
                    <input disabled={!canEdit}  data-gramm="false" spellcheck="false" 
                      type="text" 
                      value={dev.guidewords} 
                      onChange={(e) => handleCellChange(dev._id, 'guidewords', e.target.value)}
                      onBlur={(e) => handleBlur(dev._id, 'guidewords', e.target.value)}
                    />
                  </td>
                  <td className="col-dev-parameter">
                    <input disabled={!canEdit}  data-gramm="false" spellcheck="false" 
                      type="text" 
                      value={dev.parameter} 
                      onChange={(e) => handleCellChange(dev._id, 'parameter', e.target.value)}
                      onBlur={(e) => handleBlur(dev._id, 'parameter', e.target.value)}
                    />
                  </td>
                  <td className="col-dev-process">
                    <input disabled={!canEdit}  data-gramm="false" spellcheck="false" 
                      type="text" 
                      value={dev.processFlowMaterial} 
                      onChange={(e) => handleCellChange(dev._id, 'processFlowMaterial', e.target.value)}
                      onBlur={(e) => handleBlur(dev._id, 'processFlowMaterial', e.target.value)}
                    />
                  </td>
                  <td className="col-dev-loc-from">
                    <input disabled={!canEdit}  data-gramm="false" spellcheck="false" 
                      type="text" 
                      value={dev.locationFrom} 
                      onChange={(e) => handleCellChange(dev._id, 'locationFrom', e.target.value)}
                      onBlur={(e) => handleBlur(dev._id, 'locationFrom', e.target.value)}
                    />
                  </td>
                  <td className="col-dev-loc-to">
                    <input disabled={!canEdit}  data-gramm="false" spellcheck="false" 
                      type="text" 
                      value={dev.locationTo} 
                      onChange={(e) => handleCellChange(dev._id, 'locationTo', e.target.value)}
                      onBlur={(e) => handleBlur(dev._id, 'locationTo', e.target.value)}
                    />
                  </td>
                  <td className="col-dev-auto">
                    <input disabled={!canEdit}  data-gramm="false" spellcheck="false" 
                      type="text" 
                      value={dev.deviationAuto || ''} 
                      onChange={(e) => handleCellChange(dev._id, 'deviationAuto', e.target.value)}
                      onBlur={(e) => handleBlur(dev._id, 'deviationAuto', e.target.value)}
                    />
                  </td>
                  {columns.map(col => (
                    <td key={col.id} className="col-custom">
                      {renderCustomCell(dev, col)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <AddDeviationModal 
          studyId={study._id} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={handleAddDeviationSuccess} 
        />
      )}
    </StudyLayout>
  );
};

export default DeviationRegistry;
