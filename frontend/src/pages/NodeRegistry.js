import React, { useState, useEffect } from 'react';
import StudyLayout from '../components/StudyLayout';
import AddNodeModal from '../components/AddNodeModal';
import './NodeRegistry.css';

const NodeRegistry = ({ study, onBack, onNavigate, theme, toggleTheme }) => {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchNodes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/nodes/${study._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setNodes(data);
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

  const handleCellChange = (id, field, value) => {
    setNodes(prevNodes => prevNodes.map(node => 
      node._id === id ? { ...node, [field]: value } : node
    ));
  };

  const handleBlur = async (id, field, value) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/nodes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ [field]: value })
      });
    } catch (error) {
      console.error('Failed to save node:', error);
    }
  };

  const handleAddNodeSuccess = (newNode) => {
    setNodes(prev => [...prev, newNode]);
    setIsModalOpen(false);
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/nodes/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        setNodes(prevNodes => prevNodes.filter(node => node._id !== id));
        if (selectedRowId === id) setSelectedRowId(null);
      }
    } catch (error) {
      console.error('Failed to delete node:', error);
    }
  };

  const handleCopy = async () => {
    if (!selectedRowId) return;
    const nodeToCopy = nodes.find(n => n._id === selectedRowId);
    if (!nodeToCopy) return;

    try {
      const token = localStorage.getItem('token');
      const { _id, createdAt, updatedAt, order, ...copyData } = nodeToCopy;
      
      const response = await fetch(`http://localhost:5000/api/nodes/${study._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(copyData)
      });
      
      if (response.ok) {
        const newNode = await response.json();
        setNodes(prev => [...prev, newNode]);
      }
    } catch (error) {
      console.error('Failed to copy node:', error);
    }
  };

  const handleCut = async () => {
    if (!selectedRowId) return;
    await handleCopy();
    await handleDelete(selectedRowId);
  };

  const handleMove = async (direction) => {
    if (!selectedRowId) return;
    const index = nodes.findIndex(n => n._id === selectedRowId);
    if (index < 0) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === nodes.length - 1) return;

    const newNodes = [...nodes];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    const temp = newNodes[index];
    newNodes[index] = newNodes[swapIndex];
    newNodes[swapIndex] = temp;
    
    const updatedNodes = newNodes.map((node, i) => ({ ...node, order: i }));
    setNodes(updatedNodes);

    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/nodes/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          nodes: updatedNodes.map(n => ({ id: n._id, order: n.order }))
        })
      });
    } catch (error) {
      console.error('Failed to reorder nodes:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const headers = ['DESCRIPTION', 'INTENTION', 'BOUNDARY', 'EQ. COUNT'];
    const csvRows = [headers.join(',')];
    
    nodes.forEach(node => {
      const row = [
        `"${node.description || ''}"`,
        `"${node.intention || ''}"`,
        `"${node.boundary || ''}"`,
        `"${node.eqCount || ''}"`
      ];
      csvRows.push(row.join(','));
    });
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'nodes_registry_export.csv');
    a.click();
  };

  if (!study) return null;

  return (
    <StudyLayout activeTab="nodes-registry" onBack={onBack} onNavigate={onNavigate} theme={theme} toggleTheme={toggleTheme}>
      <div className="nodes-container">
        <div className="nodes-header">
          <div className="nodes-header-left">
            <h2>NODES REGISTRY</h2>
          </div>
          <button className="btn-manage-columns">
            <span className="icon">◫</span> MANAGE COLUMNS
          </button>
        </div>

        <div className="nodes-toolbar">
          <button className="toolbar-btn" onClick={() => setIsModalOpen(true)} title="Add Node">
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

        <div className="nodes-table-wrapper">
          <table className="nodes-table">
            <thead>
              <tr>
                <th className="col-num">#</th>
                <th className="col-description">DESCRIPTION</th>
                <th className="col-intention">INTENTION</th>
                <th className="col-boundary">BOUNDARY</th>
                <th className="col-eq-count">EQ. COUNT</th>
              </tr>
            </thead>
            <tbody>
              {!loading && nodes.map((node, index) => (
                <tr 
                  key={node._id} 
                  className={selectedRowId === node._id ? 'selected-row' : ''}
                  onClick={() => setSelectedRowId(node._id)}
                >
                  <td className="col-num">{index + 1}</td>
                  <td>
                    <input 
                      type="text" 
                      value={node.description} 
                      onChange={(e) => handleCellChange(node._id, 'description', e.target.value)}
                      onBlur={(e) => handleBlur(node._id, 'description', e.target.value)}
                    />
                  </td>
                  <td>
                    <input 
                      type="text" 
                      value={node.intention} 
                      onChange={(e) => handleCellChange(node._id, 'intention', e.target.value)}
                      onBlur={(e) => handleBlur(node._id, 'intention', e.target.value)}
                    />
                  </td>
                  <td>
                    <input 
                      type="text" 
                      value={node.boundary} 
                      onChange={(e) => handleCellChange(node._id, 'boundary', e.target.value)}
                      onBlur={(e) => handleBlur(node._id, 'boundary', e.target.value)}
                    />
                  </td>
                  <td className="col-eq-count">
                    <input 
                      type="text" 
                      value={node.eqCount} 
                      onChange={(e) => handleCellChange(node._id, 'eqCount', e.target.value)}
                      onBlur={(e) => handleBlur(node._id, 'eqCount', e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <AddNodeModal 
          studyId={study._id} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={handleAddNodeSuccess} 
        />
      )}
    </StudyLayout>
  );
};

export default NodeRegistry;
