import React, { useState, useEffect } from 'react';
import StudyLayout from '../components/StudyLayout';
import './NodeRegistry.css'; // Reuse table styles

const EquipmentRegistry = ({ study, onBack, onNavigate, theme, toggleTheme }) => {
  const [nodes, setNodes] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNodes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/nodes/${study._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNodes(data);
        if (data.length > 0) {
          setSelectedNodeId(data[0]._id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch nodes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes();
  }, [study._id]);

  useEffect(() => {
    const node = nodes.find(n => n._id === selectedNodeId);
    if (node && node.equipments && node.equipments.length > 0) {
      setEquipments(node.equipments);
    } else if (node) {
      setEquipments([{
        tagNo: '',
        equipmentName: '',
        operationCondition: '',
        capacity: '',
        moc: '',
        designTemp: '',
        designPressure: ''
      }]);
    } else {
      setEquipments([]);
    }
  }, [selectedNodeId, nodes]);

  const handleCellChange = (index, field, value) => {
    const newEq = [...equipments];
    newEq[index][field] = value;
    setEquipments(newEq);
  };

  const addRow = () => {
    setEquipments([...equipments, {
      tagNo: '',
      equipmentName: '',
      operationCondition: '',
      capacity: '',
      moc: '',
      designTemp: '',
      designPressure: ''
    }]);
  };

  const removeRow = (index) => {
    if (equipments.length > 1) {
      const newEq = [...equipments];
      newEq.splice(index, 1);
      setEquipments(newEq);
    }
  };

  const handleSave = async () => {
    if (!selectedNodeId) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/nodes/${selectedNodeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ equipments, eqCount: equipments.length.toString() })
      });
      if (response.ok) {
        // Silently update the nodes array to reflect new data
        const updatedNode = await response.json();
        setNodes(prev => prev.map(n => n._id === selectedNodeId ? updatedNode : n));
      }
    } catch (error) {
      console.error('Failed to save equipments:', error);
    }
  };

  if (!study) return null;

  return (
    <StudyLayout activeTab="equipment-details" onBack={onBack} onNavigate={onNavigate} theme={theme} toggleTheme={toggleTheme}>
      <div className="nodes-container">
        <div className="nodes-header">
          <div className="nodes-header-left">
            <h2>EQUIPMENT REGISTRY</h2>
          </div>
        </div>

        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <strong style={{ color: 'var(--text-primary)' }}>SELECT NODE:</strong>
          <select 
            value={selectedNodeId} 
            onChange={(e) => setSelectedNodeId(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', minWidth: '300px' }}
          >
            {nodes.map(node => (
              <option key={node._id} value={node._id}>
                {node.description || `Node ${node._id}`}
              </option>
            ))}
          </select>
        </div>

        <div className="nodes-toolbar">
          <button className="toolbar-btn" onClick={addRow} title="Add Equipment"><span className="icon-plus">⊕</span></button>
        </div>

        <div className="nodes-table-wrapper" style={{ marginTop: '0' }}>
          <table className="nodes-table">
            <thead>
              <tr>
                <th className="col-num">#</th>
                <th>TAG NO.</th>
                <th>EQUIPMENT NAME</th>
                <th>OPERATION CONDITION</th>
                <th>CAPACITY</th>
                <th>MOC</th>
                <th>DESIGN TEMP</th>
                <th>DESIGN PRESSURE</th>
              </tr>
            </thead>
            <tbody>
              {!loading && equipments.map((eq, index) => (
                <tr key={index}>
                  <td className="col-num">{index + 1}</td>
                  <td><input data-gramm="false" spellcheck="false" type="text" value={eq.tagNo || ''} onChange={(e) => handleCellChange(index, 'tagNo', e.target.value)} onBlur={handleSave} /></td>
                  <td><input data-gramm="false" spellcheck="false" type="text" value={eq.equipmentName || ''} onChange={(e) => handleCellChange(index, 'equipmentName', e.target.value)} onBlur={handleSave} /></td>
                  <td><input data-gramm="false" spellcheck="false" type="text" value={eq.operationCondition || ''} onChange={(e) => handleCellChange(index, 'operationCondition', e.target.value)} onBlur={handleSave} /></td>
                  <td><input data-gramm="false" spellcheck="false" type="text" value={eq.capacity || ''} onChange={(e) => handleCellChange(index, 'capacity', e.target.value)} onBlur={handleSave} /></td>
                  <td><input data-gramm="false" spellcheck="false" type="text" value={eq.moc || ''} onChange={(e) => handleCellChange(index, 'moc', e.target.value)} onBlur={handleSave} /></td>
                  <td><input data-gramm="false" spellcheck="false" type="text" value={eq.designTemp || ''} onChange={(e) => handleCellChange(index, 'designTemp', e.target.value)} onBlur={handleSave} /></td>
                  <td><input data-gramm="false" spellcheck="false" type="text" value={eq.designPressure || ''} onChange={(e) => handleCellChange(index, 'designPressure', e.target.value)} onBlur={handleSave} /></td>
                </tr>
              ))}
              {equipments.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                    No equipment added yet. Click + to add.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </StudyLayout>
  );
};

export default EquipmentRegistry;
