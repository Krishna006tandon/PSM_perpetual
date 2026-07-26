import React, { useState, useEffect } from 'react';
import StudyLayout from '../components/StudyLayout';
import AddDeviationModal from '../components/AddDeviationModal';
import './DeviationRegistry.css';

const DeviationRegistry = ({ study, onBack, onNavigate, theme, toggleTheme }) => {
  const [deviations, setDeviations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchDeviations = async () => {
    try {
      const token = localStorage.getItem('token');
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

  const computeDeviationAuto = (dev) => {
    return `${dev.guidewords || ''} ${dev.parameter || ''} of ${dev.processFlowMaterial || ''} from ${dev.locationFrom || ''} to ${dev.locationTo || ''}`.trim();
  };

  const handleCellChange = (id, field, value) => {
    setDeviations(prev => prev.map(dev => {
      if (dev._id === id) {
        const updatedDev = { ...dev, [field]: value };
        // Auto-compute the deviation text on the fly
        updatedDev.deviationAuto = computeDeviationAuto(updatedDev);
        return updatedDev;
      }
      return dev;
    }));
  };

  const handleBlur = async (id, field, value) => {
    try {
      // Find the currently updated deviation state to get the new computed auto text
      const currentDev = deviations.find(d => d._id === id);
      const computedAuto = currentDev ? currentDev.deviationAuto : '';

      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/deviations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          [field]: value,
          deviationAuto: computedAuto // Save the computed value to DB
        })
      });
    } catch (error) {
      console.error('Failed to save deviation:', error);
    }
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
    const headers = ['GUIDEWORDS', 'PARAMETER', 'PROCESS FLOW / MATERIAL', 'EQUIPMENT', 'INSTRUMENT', 'DEVIATION (AUTO)'];
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
        <div className="deviations-header">
          <div className="deviations-header-left">
            <h2>DEVIATIONS REGISTRY</h2>
          </div>
          <button className="btn-manage-columns">
            <span className="icon">◫</span> MANAGE COLUMNS
          </button>
        </div>

        <div className="nodes-toolbar">
          <button className="toolbar-btn" onClick={() => setIsModalOpen(true)} title="Add Deviation">
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
                <th className="col-dev-auto">DEVIATION (AUTO)</th>
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
                    <input 
                      type="text" 
                      value={dev.guidewords} 
                      onChange={(e) => handleCellChange(dev._id, 'guidewords', e.target.value)}
                      onBlur={(e) => handleBlur(dev._id, 'guidewords', e.target.value)}
                    />
                  </td>
                  <td className="col-dev-parameter">
                    <input 
                      type="text" 
                      value={dev.parameter} 
                      onChange={(e) => handleCellChange(dev._id, 'parameter', e.target.value)}
                      onBlur={(e) => handleBlur(dev._id, 'parameter', e.target.value)}
                    />
                  </td>
                  <td className="col-dev-process">
                    <input 
                      type="text" 
                      value={dev.processFlowMaterial} 
                      onChange={(e) => handleCellChange(dev._id, 'processFlowMaterial', e.target.value)}
                      onBlur={(e) => handleBlur(dev._id, 'processFlowMaterial', e.target.value)}
                    />
                  </td>
                  <td className="col-dev-loc-from">
                    <input 
                      type="text" 
                      value={dev.locationFrom} 
                      onChange={(e) => handleCellChange(dev._id, 'locationFrom', e.target.value)}
                      onBlur={(e) => handleBlur(dev._id, 'locationFrom', e.target.value)}
                    />
                  </td>
                  <td className="col-dev-loc-to">
                    <input 
                      type="text" 
                      value={dev.locationTo} 
                      onChange={(e) => handleCellChange(dev._id, 'locationTo', e.target.value)}
                      onBlur={(e) => handleBlur(dev._id, 'locationTo', e.target.value)}
                    />
                  </td>
                  <td className="col-dev-auto">
                    <div className="auto-text">{dev.deviationAuto}</div>
                  </td>
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
