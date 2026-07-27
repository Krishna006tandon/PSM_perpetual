import React, { useState, useEffect } from 'react';
import './AddNodeModal.css'; // Reuse modal styling

const ManageColumnsModal = ({ studyId, registryType, onClose, onSave }) => {
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchColumns();
  }, [studyId, registryType]);

  const fetchColumns = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/columns/${studyId}/${registryType}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Initialize options as comma-separated string for editing
        const mappedCols = (data.columns || []).map(col => ({
          ...col,
          optionsString: (col.options || []).join(', ')
        }));
        setColumns(mappedCols);
      }
    } catch (err) {
      console.error('Error fetching columns:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // Process optionsString back into options array
      const processedCols = columns.map(col => {
        const { optionsString, ...rest } = col;
        if (rest.type === 'dropdown') {
          rest.options = (optionsString || '').split(',').map(s => s.trim()).filter(Boolean);
        }
        return rest;
      });

      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/columns/${studyId}/${registryType}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ columns: processedCols })
      });
      if (res.ok) {
        const data = await res.json();
        onSave(data.columns);
      }
    } catch (err) {
      console.error('Error saving columns:', err);
    }
  };

  const addColumn = () => {
    const newId = 'col_' + Date.now().toString(36);
    setColumns([...columns, { 
      id: newId, 
      label: 'New Column', 
      type: 'text', 
      optionsString: '', 
      dataSource: 'team' 
    }]);
  };

  const updateColumn = (index, field, value) => {
    const newCols = [...columns];
    newCols[index][field] = value;
    setColumns(newCols);
  };

  const deleteColumn = (index) => {
    const newCols = [...columns];
    newCols.splice(index, 1);
    setColumns(newCols);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '800px', width: '90%' }}>
        <div className="modal-header">
          <h3>Manage Custom Columns</h3>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {loading ? <p>Loading...</p> : (
            <>
              {columns.length === 0 && <p style={{color: 'var(--text-secondary)'}}>No custom columns defined.</p>}
              
              {columns.map((col, index) => (
                <div key={col.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', padding: '12px', border: '1px solid var(--divider)', borderRadius: '6px', backgroundColor: 'var(--bg-default)' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      value={col.label} 
                      onChange={(e) => updateColumn(index, 'label', e.target.value)} 
                      placeholder="Column Label"
                      style={{ flex: 1, padding: '8px', border: '1px solid var(--divider)', borderRadius: '4px' }}
                    />
                    
                    <select 
                      value={col.type || 'text'}
                      onChange={(e) => updateColumn(index, 'type', e.target.value)}
                      style={{ width: '150px', padding: '8px', border: '1px solid var(--divider)', borderRadius: '4px' }}
                    >
                      <option value="text">Text Area</option>
                      <option value="dropdown">Custom Dropdown</option>
                      <option value="fetch">Fetch Data</option>
                    </select>

                    <button 
                      onClick={() => deleteColumn(index)}
                      style={{ background: 'var(--error)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </div>

                  {/* Conditional inputs based on type */}
                  {col.type === 'dropdown' && (
                    <div style={{ marginTop: '4px' }}>
                      <input 
                        type="text"
                        value={col.optionsString || ''}
                        onChange={(e) => updateColumn(index, 'optionsString', e.target.value)}
                        placeholder="Options (comma separated, e.g. High, Medium, Low)"
                        style={{ width: '100%', padding: '8px', border: '1px solid var(--divider)', borderRadius: '4px', boxSizing: 'border-box' }}
                      />
                    </div>
                  )}

                  {col.type === 'fetch' && (
                    <div style={{ marginTop: '4px' }}>
                      <select 
                        value={col.dataSource || 'team'}
                        onChange={(e) => updateColumn(index, 'dataSource', e.target.value)}
                        style={{ width: '100%', padding: '8px', border: '1px solid var(--divider)', borderRadius: '4px', boxSizing: 'border-box' }}
                      >
                        <option value="team">Team Members</option>
                        <option value="nodes">Nodes</option>
                        <option value="deviations">Deviations</option>
                        <option value="causes">Causes</option>
                        <option value="documents">Study Documents</option>
                        <option value="studies">All Studies</option>
                        <option value="scenarios_consequences">Scenarios (Consequences)</option>
                        <option value="scenarios_safeguards">Scenarios (Safeguards)</option>
                        <option value="scenarios_recommendations">Scenarios (Recommendations)</option>
                      </select>
                    </div>
                  )}
                </div>
              ))}
              
              <button 
                onClick={addColumn}
                style={{ marginTop: '10px', background: 'var(--primary-main)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
              >
                + Add Column
              </button>
            </>
          )}
        </div>
        
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-submit" onClick={handleSave}>Save Changes</button>
        </div>
      </div>
    </div>
  );
};

export default ManageColumnsModal;
