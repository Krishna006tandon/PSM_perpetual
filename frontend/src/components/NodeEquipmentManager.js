import React, { useState, useEffect } from 'react';
import './NodeEquipmentManager.css';

const NodeEquipmentManager = ({ studyId, node, onClose, onSave }) => {
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (node && node.equipments && node.equipments.length > 0) {
      setEquipments(node.equipments);
      setLoading(false);
    } else {
      setEquipments([{
        tagNo: '',
        equipmentName: '',
        operationCondition: '',
        capacity: '',
        moc: '',
        designTemp: '',
        designPressure: ''
      }]);
      setLoading(false);
    }
  }, [node]);

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
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/nodes/${node._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ equipments, eqCount: equipments.length.toString() })
      });
      if (response.ok) {
        onSave();
        onClose();
      }
    } catch (error) {
      console.error('Failed to save equipments:', error);
    }
  };

  return (
    <div className="equipment-modal-overlay">
      <div className="equipment-modal">
        <div className="equipment-header">
          <div className="eq-header-left">
            <span className="eq-icon">⚙️</span>
            <div>
              <h3>NODE EQUIPMENT MANAGER</h3>
              <p>Node: {node?.description || 'Node 01'} • {equipments.length} Equipment Item(s) Registered</p>
            </div>
          </div>
          <div className="eq-header-right">
            <button className="btn-configure">◫ CONFIGURE COLUMNS</button>
            <button className="btn-close-modal" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="equipment-sub-header">
          <h4>EQUIPMENT REGISTRY — {node?.description || 'NODE 01'}</h4>
          <button className="btn-manage-cols">MANAGE COLUMNS</button>
        </div>

        <div className="equipment-toolbar">
          <button className="toolbar-btn" onClick={addRow} title="Add Equipment"><span className="icon-plus">⊕</span></button>
          <button className="toolbar-btn"><span className="icon">📄</span></button>
          <button className="toolbar-btn"><span className="icon">✂️</span></button>
          <button className="toolbar-btn icon-delete"><span className="icon">🗑️</span></button>
          <div className="toolbar-divider"></div>
          <button className="toolbar-btn"><span className="icon">↑</span></button>
          <button className="toolbar-btn"><span className="icon">↓</span></button>
          <div className="toolbar-divider"></div>
          <button className="toolbar-btn"><span className="icon">🖨️</span></button>
          <button className="toolbar-btn"><span className="icon">📥</span></button>
        </div>

        <div className="equipment-table-container">
          <table className="equipment-table">
            <thead>
              <tr>
                <th className="col-hash">#</th>
                <th>TAG NO.</th>
                <th>EQUIPMENT NAME</th>
                <th>OPERATION CONDITIO...</th>
                <th>CAPACITY</th>
                <th>MOC</th>
                <th>DESIGN TEMP</th>
                <th>DESIGN PRES...</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {!loading && equipments.map((eq, index) => (
                <tr key={index}>
                  <td className="col-hash">{index + 1}</td>
                  <td><input type="text" value={eq.tagNo || ''} onChange={(e) => handleCellChange(index, 'tagNo', e.target.value)} /></td>
                  <td><input type="text" value={eq.equipmentName || ''} onChange={(e) => handleCellChange(index, 'equipmentName', e.target.value)} /></td>
                  <td><input type="text" value={eq.operationCondition || ''} onChange={(e) => handleCellChange(index, 'operationCondition', e.target.value)} /></td>
                  <td><input type="text" value={eq.capacity || ''} onChange={(e) => handleCellChange(index, 'capacity', e.target.value)} /></td>
                  <td><input type="text" value={eq.moc || ''} onChange={(e) => handleCellChange(index, 'moc', e.target.value)} /></td>
                  <td><input type="text" value={eq.designTemp || ''} onChange={(e) => handleCellChange(index, 'designTemp', e.target.value)} /></td>
                  <td><input type="text" value={eq.designPressure || ''} onChange={(e) => handleCellChange(index, 'designPressure', e.target.value)} /></td>
                  <td>
                    <button className="btn-remove-row" onClick={() => removeRow(index)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="equipment-footer">
          <p>EQUIPMENT DETAILS SYNC AUTOMATICALLY TO PHA WORKSHEET HEADER</p>
          <button className="btn-close-sync" onClick={handleSave}>CLOSE & SYNC WORKSHEET</button>
        </div>
      </div>
    </div>
  );
};

export default NodeEquipmentManager;
