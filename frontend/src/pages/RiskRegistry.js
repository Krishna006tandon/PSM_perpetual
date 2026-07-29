import React, { useState, useEffect } from 'react';
import StudyLayout from '../components/StudyLayout';
import './RiskRegistry.css';

const RiskRegistry = ({ study, onBack, onNavigate, theme, toggleTheme }) => {
  const [criteria, setCriteria] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCriteria();
  }, [study._id]);

  const fetchCriteria = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/risk-criteria/${study._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setCriteria(await res.json());
      }
    } catch (err) {
      console.error('Error fetching risk criteria:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/risk-criteria/${study._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(criteria)
      });
      if (res.ok) {
        alert('Risk Criteria saved successfully');
      }
    } catch (err) {
      console.error('Error saving risk criteria:', err);
    }
  };

  const handleMatrixCellChange = (sLevel, lLevel, field, value) => {
    setCriteria(prev => {
      const newCells = prev.matrixCells.map(cell => {
        if (cell.severityLevel === sLevel && cell.likelihoodLevel === lLevel) {
          return { ...cell, [field]: value };
        }
        return cell;
      });
      return { ...prev, matrixCells: newCells };
    });
  };

  const handleConsequenceChange = (sLevel, category, value) => {
    setCriteria(prev => {
      const newSeverity = prev.severityLevels.map(s => {
        if (s.level === sLevel) {
          const newCons = { ...s.consequences };
          newCons[category] = value;
          return { ...s, consequences: newCons };
        }
        return s;
      });
      return { ...prev, severityLevels: newSeverity };
    });
  };

  const handleLikelihoodChange = (lLevel, field, value) => {
    setCriteria(prev => {
      const newLikelihood = prev.likelihoodLevels.map(l => {
        if (l.level === lLevel) {
          return { ...l, [field]: value };
        }
        return l;
      });
      return { ...prev, likelihoodLevels: newLikelihood };
    });
  };

  if (!study || loading || !criteria) return <StudyLayout activeTab="risk-criteria" onBack={onBack} onNavigate={onNavigate} theme={theme} toggleTheme={toggleTheme}><div style={{padding:'20px'}}>Loading...</div></StudyLayout>;

  return (
    <StudyLayout activeTab="risk-criteria" onBack={onBack} onNavigate={onNavigate} theme={theme} toggleTheme={toggleTheme}>
      <div className="risk-container">
        <div className="risk-header">
          <h2>RISK CRITERIA & MATRIX</h2>
          <button className="btn-primary" onClick={handleSave}>SAVE CRITERIA</button>
        </div>

        <div className="risk-content">
          
          <div className="risk-section">
            <h3>Consequence Categories (Severity Definitions)</h3>
            <div className="table-responsive">
              <table className="criteria-table">
                <thead>
                  <tr>
                    <th>Severity Level</th>
                    <th>Name</th>
                    {criteria.consequenceCategories.map(cat => (
                      <th key={cat}>{cat}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {criteria.severityLevels.map(s => (
                    <tr key={s.level}>
                      <td className="level-col">{s.level}</td>
                      <td>
                        <input data-gramm="false" spellcheck="false" className="w-full" value={s.name} onChange={e => {
                          const newSev = [...criteria.severityLevels];
                          newSev.find(x => x.level === s.level).name = e.target.value;
                          setCriteria({...criteria, severityLevels: newSev});
                        }} />
                      </td>
                      {criteria.consequenceCategories.map(cat => (
                        <td key={cat}>
                          <textarea data-gramm="false" spellcheck="false" 
                            className="w-full"
                            rows="2"
                            value={(s.consequences && s.consequences[cat]) || ''} 
                            onChange={e => handleConsequenceChange(s.level, cat, e.target.value)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="risk-section">
            <h3>Likelihood Definitions</h3>
            <div className="table-responsive">
              <table className="criteria-table">
                <thead>
                  <tr>
                    <th>Likelihood Level</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Frequency</th>
                  </tr>
                </thead>
                <tbody>
                  {criteria.likelihoodLevels.map(l => (
                    <tr key={l.level}>
                      <td className="level-col">{l.level}</td>
                      <td>
                        <input data-gramm="false" spellcheck="false" className="w-full" value={l.name} onChange={e => handleLikelihoodChange(l.level, 'name', e.target.value)} />
                      </td>
                      <td>
                        <textarea data-gramm="false" spellcheck="false" className="w-full" rows="2" value={l.description} onChange={e => handleLikelihoodChange(l.level, 'description', e.target.value)} />
                      </td>
                      <td>
                        <input data-gramm="false" spellcheck="false" className="w-full" value={l.frequency} onChange={e => handleLikelihoodChange(l.level, 'frequency', e.target.value)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="risk-section">
            <h3>Risk Categories (Colors)</h3>
            <div className="category-cards">
              {criteria.riskCategories.map((cat, i) => (
                <div key={i} className="category-card" style={{borderLeft: `5px solid ${cat.color}`}}>
                  <input data-gramm="false" spellcheck="false" 
                    value={cat.name} 
                    onChange={e => {
                      const newCats = [...criteria.riskCategories];
                      newCats[i].name = e.target.value;
                      setCriteria({...criteria, riskCategories: newCats});
                    }}
                  />
                  <input data-gramm="false" spellcheck="false" 
                    type="color" 
                    value={cat.color} 
                    onChange={e => {
                      const newCats = [...criteria.riskCategories];
                      newCats[i].color = e.target.value;
                      setCriteria({...criteria, riskCategories: newCats});
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="risk-section matrix-wrapper">
            <h3>Risk Matrix (Severity x Likelihood)</h3>
            <table className="risk-matrix-table">
              <thead>
                <tr>
                  <th colSpan="2" rowSpan="2"></th>
                  <th colSpan="5">SEVERITY</th>
                </tr>
                <tr>
                  {criteria.severityLevels.map(s => (
                    <th key={s.level}>{s.name} ({s.level})</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {criteria.likelihoodLevels.map((l, i) => (
                  <tr key={l.level}>
                    {i === 0 && <th rowSpan="5" className="likelihood-header">LIKELIHOOD</th>}
                    <th>{l.name} ({l.level})</th>
                    {criteria.severityLevels.map(s => {
                      const cell = criteria.matrixCells.find(c => c.severityLevel === s.level && c.likelihoodLevel === l.level) || {};
                      const categoryData = criteria.riskCategories.find(c => c.name === cell.category);
                      const bgColor = categoryData ? categoryData.color : '#ffffff';
                      
                      return (
                        <td key={s.level} style={{ backgroundColor: bgColor }}>
                          <div className="matrix-cell">
                            <input data-gramm="false" spellcheck="false" 
                              type="number" 
                              value={cell.score || ''} 
                              onChange={e => handleMatrixCellChange(s.level, l.level, 'score', parseInt(e.target.value) || 0)}
                              className="cell-score"
                            />
                            <select 
                              value={cell.category || ''} 
                              onChange={e => handleMatrixCellChange(s.level, l.level, 'category', e.target.value)}
                              className="cell-category"
                            >
                              {criteria.riskCategories.map(cat => (
                                <option key={cat.name} value={cat.name}>{cat.name}</option>
                              ))}
                            </select>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </StudyLayout>
  );
};

export default RiskRegistry;
