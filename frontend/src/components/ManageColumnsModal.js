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
        let mappedCols = (data.columns || []).map(col => ({
          ...col,
          optionsString: (col.options || []).join(', ')
        }));

        if (registryType === 'lopa') {
          const systemCols = [
            { id: 'sys_total_ipl', label: 'Total IPL Credit', type: 'formula', isSystem: true, formulaString: '' },
            { id: 'sys_tolerance', label: 'Tolerance', type: 'formula', isSystem: true, formulaString: '' },
            { id: 'sys_rrf', label: 'RRF', type: 'formula', isSystem: true, formulaString: '' },
            { id: 'sys_req_sil', label: 'Required SIL', type: 'formula', isSystem: true, formulaString: '' },
          ];
          systemCols.forEach(sysCol => {
            if (!mappedCols.find(c => c.id === sysCol.id)) {
              mappedCols.unshift(sysCol);
            }
          });
        }
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

  const insertIntoFormula = (index, textToInsert) => {
    const current = columns[index].formulaString || '';
    // Append with a space for readability if needed, but direct append is fine
    const newFormula = current ? current + ' ' + textToInsert : textToInsert;
    updateColumn(index, 'formulaString', newFormula);
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
                      disabled={col.isSystem}
                      style={{ flex: 1, padding: '8px', border: '1px solid var(--divider)', borderRadius: '4px', opacity: col.isSystem ? 0.7 : 1 }}
                    />
                    
                    <select 
                      value={col.type || 'text'}
                      onChange={(e) => updateColumn(index, 'type', e.target.value)}
                      disabled={col.isSystem}
                      style={{ width: '150px', padding: '8px', border: '1px solid var(--divider)', borderRadius: '4px', opacity: col.isSystem ? 0.7 : 1 }}
                    >
                      <option value="text">Text Area</option>
                      <option value="dropdown">Custom Dropdown</option>
                      <option value="fetch">Fetch Data</option>
                      <option value="checkbox">Checkbox</option>
                      <option value="formula">Formula (Math)</option>
                    </select>

                    <button 
                      onClick={() => deleteColumn(index)}
                      disabled={col.isSystem}
                      style={{ background: col.isSystem ? 'var(--text-disabled)' : 'var(--error)', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: col.isSystem ? 'not-allowed' : 'pointer' }}
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

                  {col.type === 'formula' && (
                    <div style={{ marginTop: '10px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                        Formula Equation {col.isSystem && '(Optional: Leave blank to use default)'} (e.g. <code>[Freq of Initiating Event] * [Severity] / 100</code>)
                        {col.isSystem && col.id === 'sys_total_ipl' && <div>Hint: use <code>[ALL_IPL_CREDITS]</code> to multiply all sub-row IPLs together.</div>}
                      </label>
                      <input 
                        type="text" 
                        placeholder={col.isSystem ? "Leave blank for default behavior" : "Enter math formula referencing other column labels..."}
                        value={col.formulaString || ''}
                        onChange={(e) => updateColumn(index, 'formulaString', e.target.value)}
                        style={{ width: '100%', padding: '8px', border: '1px solid var(--divider)', borderRadius: '4px' }}
                      />
                      <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        <span style={{fontSize: '11px', color: 'var(--text-secondary)', width: '100%'}}>Quick Insert (Click to add):</span>
                        {/* Operators */}
                        {['+', '-', '*', '/', '(', ')', '10', '^'].map(op => (
                          <button 
                            key={op}
                            onClick={() => insertIntoFormula(index, op)}
                            style={{ background: 'var(--surface-hover)', border: '1px solid var(--divider)', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                          >
                            {op}
                          </button>
                        ))}
                        {/* Special Tags */}
                        <button 
                            onClick={() => insertIntoFormula(index, '[ALL_IPL_CREDITS]')}
                            style={{ background: 'rgba(14, 165, 233, 0.1)', color: 'var(--primary-main)', border: '1px solid rgba(14, 165, 233, 0.3)', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                          >
                            ALL IPL Credits
                        </button>
                        <button 
                            onClick={() => insertIntoFormula(index, '[ALL_REC_CREDITS]')}
                            style={{ background: 'rgba(14, 165, 233, 0.1)', color: 'var(--primary-main)', border: '1px solid rgba(14, 165, 233, 0.3)', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                          >
                            ALL Rec Credits
                        </button>
                        {/* Variables (all other columns) */}
                        {columns.filter(c => c.id !== col.id).map(c => (
                          <button 
                            key={c.id}
                            onClick={() => insertIntoFormula(index, `[${c.label}]`)}
                            style={{ background: 'var(--bg-paper)', border: '1px solid var(--divider)', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                          >
                            {c.label}
                          </button>
                        ))}
                        {registryType === 'lopa' && (
                          <>
                            <button onClick={() => insertIntoFormula(index, '[Severity]')} style={{ background: 'var(--bg-paper)', border: '1px solid var(--divider)', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Severity</button>
                            <button onClick={() => insertIntoFormula(index, '[Freq of Initiating Event]')} style={{ background: 'var(--bg-paper)', border: '1px solid var(--divider)', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Freq of Initiating Event</button>
                            <button onClick={() => insertIntoFormula(index, '[PFD]')} style={{ background: 'var(--bg-paper)', border: '1px solid var(--divider)', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>PFD</button>
                            <button onClick={() => insertIntoFormula(index, '[Time at Risk]')} style={{ background: 'var(--bg-paper)', border: '1px solid var(--divider)', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Time at Risk</button>
                            <button onClick={() => insertIntoFormula(index, '[Occupancy]')} style={{ background: 'var(--bg-paper)', border: '1px solid var(--divider)', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Occupancy</button>
                          </>
                        )}
                      </div>
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
