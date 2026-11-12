import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getApiUrl, safeFetchJson } from '../utils/apiConfig';
import WhyWhyTreeDiagram from './WhyWhyTreeDiagram';
import './InvestigationWorkspaceModal.css';

const API_URL = getApiUrl();

const STATUS_CHOICES = [
  { value: 'Exploring', label: '🔍 Exploring', activeClass: 'active-exploring' },
  { value: 'Validated', label: '✅ Validated', activeClass: 'active-validated' },
  { value: 'Disproven', label: '❌ Disproven', activeClass: 'active-disproven' },
  { value: 'Inconclusive', label: '❓ Inconclusive', activeClass: 'active-inconclusive' }
];

const ROOT_CAUSE_CHOICES = [
  { value: 'None', label: 'Normal Step', activeClass: 'active-normal' },
  { value: 'Primary Root Cause', label: '🎯 Primary Root Cause', activeClass: 'active-rc' },
  { value: 'Secondary Root Cause', label: '🔹 Secondary Cause', activeClass: 'active-rc' },
  { value: 'Contributing Factor', label: '🧩 Contributing Factor', activeClass: 'active-rc' }
];

const FALLBACK_CAUSAL_FACTORS = [
  {
    category: 'Change Management/MOC/PSSR',
    subcategories: [
      'Action items implementation less than adequate (LTA)',
      'Commissioning not authorized or LTA',
      'Informing/training personnel LTA',
      'MOC hazard analysis LTA',
      'No MOC conducted',
      'QA/QC design and construction LTA',
      'Temporary MOC past removal date',
      'Updating procedures/PSI LTA',
      'Other'
    ]
  },
  {
    category: 'Communication',
    subcategories: [
      'Ambiguous communication',
      'Language barrier',
      'Misunderstood instruction',
      'No communication',
      'Not timely',
      'Prework safety review LTA',
      'Shift turnover LTA',
      'Signs, warnings, or labels LTA',
      'Other'
    ]
  },
  {
    category: 'Design/Construction',
    subcategories: [
      'Codes and standards, specifications LTA',
      'Construction not consistent with design',
      'Engineering LTA',
      'Fabrication or installation LTA',
      'Wrong material(s) of construction',
      'Other'
    ]
  },
  {
    category: 'Equipment Reliability',
    subcategories: [
      'Maintenance methodology LTA',
      'Premature failure',
      'Preventive maintenance/testing frequency LTA',
      'Repair methodology LTA',
      'Testing methodology LTA',
      'Other'
    ]
  },
  {
    category: 'Fixed Equipment Inspection',
    subcategories: [
      'Corrective action not timely',
      'Frequency LTA',
      'Knowledge/experience of inspector LTA',
      'Location LTA',
      'No inspection',
      'QA/QC LTA',
      'Records LTA',
      'Technique LTA',
      'Other'
    ]
  },
  {
    category: 'Human Performance',
    subcategories: [
      'Ergonomics LTA',
      'Human machine interface LTA',
      'Physiologically related - fatigue, illness, impairment',
      'Time constraint / schedule pressure',
      'Work environment',
      'Workload - physical/mental',
      'Other'
    ]
  },
  {
    category: 'Operating Limits',
    subcategories: [
      'No operating limits established',
      'Not alarmed',
      'Not monitored',
      'Operating limits exceeded',
      'Operating limits not correct',
      'Other'
    ]
  },
  {
    category: 'Procedures',
    subcategories: [
      'Operating - No procedure available',
      'Operating - Procedure available but not followed',
      'Operating - Procedure followed incorrectly',
      'Operating - Procedure not accurate/clear',
      'Operating - Situation not covered',
      'Operating - Used wrong procedure',
      'Maintenance - Procedure LTA / not followed',
      'Contractor - Procedure LTA / not followed',
      'Other'
    ]
  },
  {
    category: 'Safe Work Practices',
    subcategories: [
      'Confined space practice LTA',
      'Energy control / LOTO practice LTA',
      'Hot work practice LTA',
      'Line breaking / equipment opening LTA',
      'Other'
    ]
  }
];

const getTierPillStyle = (cat) => {
  switch (cat) {
    case 'Tier 1 PSE':
    case 'Tier 1':
      return { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' };
    case 'Tier 2 PSE':
    case 'Tier 2':
      return { background: '#ffedd5', color: '#9a3412', border: '1px solid #fdba74' };
    case 'Tier 3 Indicator':
    case 'Tier 3':
      return { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' };
    case 'Tier 4 Indicator':
    case 'Tier 4':
      return { background: '#ede9fe', color: '#5b21b6', border: '1px solid #c4b5fd' };
    case 'Pending Classification':
      return { background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047' };
    default:
      return { background: '#e0f2fe', color: '#075985', border: '1px solid #7dd3fc' };
  }
};

export default function InvestigationWorkspaceModal({
  isOpen,
  onClose,
  incident,
  currentUser,
  onInvestigationUpdated
}) {
  const [nodes, setNodes] = useState([]);
  const [causalFactors, setCausalFactors] = useState(FALLBACK_CAUSAL_FACTORS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [bannerSuccess, setBannerSuccess] = useState(null);

  const [activeView, setActiveView] = useState('tree'); // 'tree' | 'matrix'
  const [treeFilter, setTreeFilter] = useState('all'); // 'all' | 'root' | 'exploring' | 'disproven'
  const [collapsedNodeIds, setCollapsedNodeIds] = useState({});

  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [quickAddParentId, setQuickAddParentId] = useState(null);
  const [quickAddText, setQuickAddText] = useState('');
  const [keepChaining, setKeepChaining] = useState(true);

  // Collapsible inspector sections for progressive disclosure
  const [showTaxonomyBox, setShowTaxonomyBox] = useState(false);
  const [showNotesEvidence, setShowNotesEvidence] = useState(false);

  // Inspector edit form state
  const [editForm, setEditForm] = useState({
    statement: '',
    status: 'Exploring',
    rootCauseType: 'None',
    api754Category: '',
    api754Subcategory: '',
    notes: ''
  });

  // Evidence mini-form
  const [evTitle, setEvTitle] = useState('');
  const [evUrl, setEvUrl] = useState('');

  const [addingEvidence, setAddingEvidence] = useState(false);

  const authHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }, []);

  const loadWorkspaceData = useCallback(async () => {
    if (!incident?._id) return;
    setLoading(true);
    setError(null);
    try {
      const [treeRes, taxRes] = await Promise.all([
        safeFetchJson(`${API_URL}/api/incidents/${incident._id}/why-nodes`, {
          headers: authHeaders()
        }),
        safeFetchJson(`${API_URL}/api/incidents/taxonomy`, {
          headers: authHeaders()
        }).catch(() => null)
      ]);

      const fetchedNodes = Array.isArray(treeRes?.nodes) ? treeRes.nodes : [];
      setNodes(fetchedNodes);

      if (taxRes?.causalFactors && Array.isArray(taxRes.causalFactors)) {
        setCausalFactors(taxRes.causalFactors);
      }

      // If only Problem Anchor exists, automatically open Why 1 quick-add box right away!
      if (fetchedNodes.length === 1) {
        setQuickAddParentId(fetchedNodes[0]._id);
      }

      setSelectedNodeId((prev) => {
        if (prev && fetchedNodes.some((n) => n._id === prev)) return prev;
        return fetchedNodes[fetchedNodes.length - 1]?._id || fetchedNodes[0]?._id || null;
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [incident?._id, authHeaders]);

  useEffect(() => {
    if (isOpen && incident?._id) {
      setBannerSuccess(null);
      setQuickAddText('');
      setQuickAddParentId(null);
      loadWorkspaceData();
    }
  }, [isOpen, incident?._id, loadWorkspaceData]);

  const selectedNode = useMemo(
    () => nodes.find((n) => n._id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  // Sync inspector fields when selected node changes
  useEffect(() => {
    if (selectedNode) {
      const isRC = selectedNode.rootCauseType && selectedNode.rootCauseType !== 'None';
      setEditForm({
        statement: selectedNode.statement || '',
        status: selectedNode.status || 'Exploring',
        rootCauseType: selectedNode.rootCauseType || 'None',
        api754Category: selectedNode.api754Category || '',
        api754Subcategory: selectedNode.api754Subcategory || '',
        notes: selectedNode.notes || ''
      });
      // Auto-expand taxonomy if already tagged or marked Root Cause; otherwise keep compact
      setShowTaxonomyBox(Boolean(isRC || selectedNode.api754Category));
      setShowNotesEvidence(Boolean(selectedNode.notes || (selectedNode.evidence && selectedNode.evidence.length > 0)));
    }
  }, [selectedNode]);

  const nodeMap = useMemo(() => {
    const map = new Map();
    nodes.forEach((n) => map.set(String(n._id), n));
    return map;
  }, [nodes]);

  const childrenMap = useMemo(() => {
    const map = new Map();
    nodes.forEach((n) => {
      const pKey = n.parentId ? String(n.parentId) : 'ROOT';
      if (!map.has(pKey)) map.set(pKey, []);
      map.get(pKey).push(n);
    });
    return map;
  }, [nodes]);

  const rootAnchors = useMemo(() => childrenMap.get('ROOT') || [], [childrenMap]);

  const summary = useMemo(() => {
    const taggedCats = new Set();
    let maxDepth = 0;
    let validatedCount = 0;
    let rootCausesCount = 0;

    nodes.forEach((n) => {
      if ((n.whyLevel || 0) > maxDepth) maxDepth = n.whyLevel || 0;
      if (n.status === 'Validated') validatedCount++;
      if (n.isRootCause || (n.rootCauseType && n.rootCauseType !== 'None')) rootCausesCount++;
      if (n.api754Category) taggedCats.add(n.api754Category);
    });

    return {
      totalNodes: nodes.length,
      maxDepth,
      validatedCount,
      rootCausesCount,
      taggedCategoriesCount: taggedCats.size
    };
  }, [nodes]);

  const currentSubcategories = useMemo(() => {
    const match = causalFactors.find((c) => c.category === editForm.api754Category);
    return match ? match.subcategories : [];
  }, [causalFactors, editForm.api754Category]);

  const getWhyChain = useCallback(
    (node) => {
      const chain = [];
      let curr = node;
      let guard = 0;
      while (curr && guard < 25) {
        chain.unshift(curr);
        curr = curr.parentId ? nodeMap.get(String(curr.parentId)) : null;
        guard++;
      }
      return chain;
    },
    [nodeMap]
  );

  const rootCauseNodes = useMemo(
    () => nodes.filter((n) => n.isRootCause || (n.rootCauseType && n.rootCauseType !== 'None')),
    [nodes]
  );

  const disprovenNodes = useMemo(
    () => nodes.filter((n) => n.status === 'Disproven'),
    [nodes]
  );

  const causalBreakdown = useMemo(() => {
    const counts = {};
    nodes.forEach((n) => {
      if (n.api754Category) {
        counts[n.api754Category] = (counts[n.api754Category] || 0) + 1;
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [nodes]);

  if (!isOpen || !incident) return null;

  const flashSuccess = (msg) => {
    setBannerSuccess(msg);
    setTimeout(() => setBannerSuccess(null), 2600);
  };

  const handleToggleCollapse = (e, nodeId) => {
    e.stopPropagation();
    setCollapsedNodeIds((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  const handleQuickAddChild = async (e, parentNode) => {
    e.preventDefault();
    if (!quickAddText.trim()) return;

    setSaving(true);
    setError(null);
    try {
      const created = await safeFetchJson(`${API_URL}/api/incidents/${incident._id}/why-nodes`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          parentId: parentNode._id,
          statement: quickAddText.trim(),
          status: 'Exploring',
          createdBy: currentUser?.name || incident.cft?.leader?.name || 'CFT Investigator'
        })
      });

      setNodes((prev) => [...prev, created]);
      setSelectedNodeId(created._id);
      setQuickAddText('');
      setCollapsedNodeIds((prev) => ({ ...prev, [parentNode._id]: false }));
      // If "Keep chaining" is active and depth < 7, move prompt directly to next Why!
      if (keepChaining && created.whyLevel < 7) {
        setQuickAddParentId(created._id);
      } else {
        setQuickAddParentId(null);
      }
      flashSuccess(`Why ${created.whyLevel} added.`);
      if (onInvestigationUpdated) onInvestigationUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Instant 1-click partial update (used for Status pills & Root Cause pills)
  const patchSelectedNode = async (patchPayload, successMsg) => {
    if (!selectedNode) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await safeFetchJson(
        `${API_URL}/api/incidents/${incident._id}/why-nodes/${selectedNode._id}`,
        {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify({
            ...patchPayload,
            updatedBy: currentUser?.name || incident.cft?.leader?.name || 'CFT Investigator'
          })
        }
      );

      setNodes((prev) => prev.map((n) => (n._id === updated._id ? updated : n)));
      flashSuccess(successMsg);
      if (onInvestigationUpdated) onInvestigationUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatus = (statusVal) => {
    setEditForm((prev) => ({ ...prev, status: statusVal }));
    patchSelectedNode({ status: statusVal }, `Marked as ${statusVal}`);
  };

  const handleQuickRootCause = (rcType) => {
    const isRC = rcType !== 'None';
    setEditForm((prev) => ({ ...prev, rootCauseType: rcType }));
    if (isRC) {
      setShowTaxonomyBox(true);
      setQuickAddParentId(null); // Typically root cause terminates the chain
    }
    patchSelectedNode(
      { rootCauseType: rcType, isRootCause: isRC },
      isRC ? `Marked as ${rcType}` : 'Cleared root cause designation'
    );
  };

  const handleSaveSelectedNode = async (e) => {
    e.preventDefault();
    if (!selectedNode) return;
    if (!editForm.statement.trim()) {
      setError('Cause / Why statement cannot be empty.');
      return;
    }

    const isRootCause = editForm.rootCauseType !== 'None';
    await patchSelectedNode(
      {
        statement: editForm.statement.trim(),
        status: editForm.status,
        isRootCause,
        rootCauseType: editForm.rootCauseType,
        api754Category: editForm.api754Category,
        api754Subcategory: editForm.api754Subcategory,
        notes: editForm.notes
      },
      'Node details saved.'
    );
  };

  const handleDeleteNodeBranch = async () => {
    if (!selectedNode || !selectedNode.parentId) return;
    const childCount = (childrenMap.get(String(selectedNode._id)) || []).length;
    const confirmMsg =
      childCount > 0
        ? `Delete "Why ${selectedNode.whyLevel}" and all nested child steps below it?`
        : `Delete "Why ${selectedNode.whyLevel}"?`;

    if (!window.confirm(confirmMsg)) return;

    setSaving(true);
    setError(null);
    try {
      const res = await safeFetchJson(
        `${API_URL}/api/incidents/${incident._id}/why-nodes/${selectedNode._id}`,
        {
          method: 'DELETE',
          headers: authHeaders()
        }
      );

      const deletedSet = new Set(res.deletedIds || [selectedNode._id]);
      const remaining = nodes.filter((n) => !deletedSet.has(String(n._id)));
      setNodes(remaining);
      setSelectedNodeId(selectedNode.parentId || remaining[0]?._id || null);
      flashSuccess('Step removed.');
      if (onInvestigationUpdated) onInvestigationUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddEvidence = async () => {
    if (!selectedNode || !evTitle.trim()) return;
    setAddingEvidence(true);
    setError(null);
    try {
      const updated = await safeFetchJson(
        `${API_URL}/api/incidents/${incident._id}/why-nodes/${selectedNode._id}/evidence`,
        {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            title: evTitle.trim(),
            fileUrl: evUrl.trim(),

            addedBy: currentUser?.name || 'CFT Investigator'
          })
        }
      );
      setNodes((prev) => prev.map((n) => (n._id === updated._id ? updated : n)));
      setEvTitle('');
      setEvUrl('');

      flashSuccess('Evidence linked.');
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingEvidence(false);
    }
  };

  const handleRemoveEvidence = async (evidenceId) => {
    if (!selectedNode) return;
    try {
      const updated = await safeFetchJson(
        `${API_URL}/api/incidents/${incident._id}/why-nodes/${selectedNode._id}/evidence/${evidenceId}`,
        {
          method: 'DELETE',
          headers: authHeaders()
        }
      );
      setNodes((prev) => prev.map((n) => (n._id === updated._id ? updated : n)));
    } catch (err) {
      setError(err.message);
    }
  };

  const matchesFilter = (node) => {
    if (treeFilter === 'all') return true;
    if (treeFilter === 'root') return node.isRootCause || (node.rootCauseType && node.rootCauseType !== 'None');
    if (treeFilter === 'exploring') return node.status === 'Exploring';
    if (treeFilter === 'disproven') return node.status === 'Disproven';
    return true;
  };

  const renderQuickAddForm = (parentNode) => {
    const nextLevel = (parentNode.whyLevel || 0) + 1;
    return (
      <form className="rca-inline-add-box" onSubmit={(e) => handleQuickAddChild(e, parentNode)}>
        <div className="rca-inline-add-title">
          <span>
            ↓ {parentNode.whyLevel === 0 ? 'Why did the incident happen? (Why 1)' : `Why did "${parentNode.statement.slice(0, 50)}${parentNode.statement.length > 50 ? '...' : ''}" happen? (Why ${nextLevel})`}
          </span>
          <label style={{ fontSize: '0.73rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#475569' }}>
            <input
              type="checkbox"
              checked={keepChaining}
              onChange={(e) => setKeepChaining(e.target.checked)}
            />
            Auto-advance to next Why
          </label>
        </div>

        <div className="rca-quick-bar-row">
          <input
            type="text"
            className="rca-quick-input"
            placeholder={`Type Why ${nextLevel} and press Enter...`}
            value={quickAddText}
            onChange={(e) => setQuickAddText(e.target.value)}
            autoFocus
            required
          />
          <button type="submit" className="rca-btn-save" disabled={saving || !quickAddText.trim()}>
            {saving ? 'Adding...' : `+ Add Why ${nextLevel}`}
          </button>
          <button
            type="button"
            className="rca-btn-secondary"
            onClick={() => setQuickAddParentId(null)}
          >
            Done
          </button>
        </div>
      </form>
    );
  };

  // Adaptive Flow Renderer: Linear chains flow straight down; forks cleanly split into labeled Cause Paths
  const renderNodeBranch = (node) => {
    const children = childrenMap.get(String(node._id)) || [];
    const isCollapsed = Boolean(collapsedNodeIds[node._id]);
    const isAnchor = !node.parentId || node.whyLevel === 0;
    const isRC = node.isRootCause || (node.rootCauseType && node.rootCauseType !== 'None');
    const isSelected = selectedNodeId === node._id;
    const dimmed = !matchesFilter(node);
    const parentNode = node.parentId ? nodeMap.get(String(node.parentId)) : null;

    return (
      <div key={node._id}>
        <div
          className={[
            'rca-node-card',
            isSelected ? 'selected' : '',
            isAnchor ? 'anchor' : '',
            isRC ? 'root-cause' : '',
            node.status === 'Disproven' ? 'disproven' : ''
          ]
            .filter(Boolean)
            .join(' ')}
          style={dimmed ? { opacity: 0.38 } : undefined}
          onClick={() => setSelectedNodeId(node._id)}
        >
          <div className="rca-node-top">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span className={`rca-level-badge ${isAnchor ? 'anchor' : ''}`}>
                {isAnchor ? 'Problem Anchor' : `Why ${node.whyLevel}`}
              </span>
              <span className={`rca-status-badge rca-status-${(node.status || 'Exploring').toLowerCase()}`}>
                {node.status || 'Exploring'}
              </span>
              {isRC && <span className="rca-rc-badge">🎯 {node.rootCauseType}</span>}
            </div>

            {children.length > 1 && (
              <button
                type="button"
                className="rca-mini-btn"
                onClick={(e) => handleToggleCollapse(e, node._id)}
              >
                {isCollapsed ? `▶ Show ${children.length} Causes` : `▼ Collapse (${children.length})`}
              </button>
            )}
          </div>

          <div className="rca-node-statement">{node.statement}</div>

          <div className="rca-node-footer">
            <div className="rca-node-tags">
              {node.api754Category && (
                <span className="rca-taxonomy-chip">
                  🏷️ {node.api754Category}
                  {node.api754Subcategory ? ` → ${node.api754Subcategory}` : ''}
                </span>
              )}
              {node.evidence && node.evidence.length > 0 && (
                <span className="rca-evidence-chip">📎 {node.evidence.length} Evidence</span>
              )}
            </div>

            <div className="rca-node-actions">
              {parentNode && (
                <button
                  type="button"
                  className="rca-mini-btn branch"
                  title="Add another parallel cause at this same Why level"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNodeId(parentNode._id);
                    setQuickAddParentId(parentNode._id);
                    setQuickAddText('');
                  }}
                >
                  ⑂ + Parallel Cause
                </button>
              )}

              {!isRC && (
                <button
                  type="button"
                  className="rca-mini-btn add-why"
                  title={`Ask why this happened (add Why ${node.whyLevel + 1})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNodeId(node._id);
                    setQuickAddParentId(quickAddParentId === node._id ? null : node._id);
                    setQuickAddText('');
                  }}
                >
                  ↓ {children.length > 0 ? `+ Branch Cause` : `Ask Why ${node.whyLevel + 1}`}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Inline Quick-Add under this node */}
        {quickAddParentId === node._id && renderQuickAddForm(node)}

        {/* Children rendering: Linear straight-down for 1 child, cleanly labeled fork for 2+ children */}
        {!isCollapsed && children.length === 1 && (
          <div>
            <div className="rca-flow-connector">
              <span className="rca-flow-arrow-pill">↓ WHY?</span>
            </div>
            {renderNodeBranch(children[0])}
          </div>
        )}

        {!isCollapsed && children.length > 1 && (
          <div className="rca-fork-group">
            <div className="rca-fork-header">
              <span>⑂ {children.length} Parallel Causes under {isAnchor ? 'Incident' : `Why ${node.whyLevel}`}</span>
            </div>
            {children.map((child, idx) => (
              <div key={child._id} className="rca-branch-lane">
                <span className="rca-branch-lane-label">Cause Path {idx + 1}</span>
                {renderNodeBranch(child)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const classificationCat =
    incident.api754Classification?.category || incident.api754Classification?.tier || 'Near Miss';

  const isRootAnchorSelected = selectedNode && (!selectedNode.parentId || selectedNode.whyLevel === 0);

  return (
    <div className="rca-modal-backdrop">
      <div className="rca-modal-shell">
        {/* Header */}
        <div className="rca-header">
          <div>
            <div className="rca-header-badges">
              <span className="rca-stage-pill">Stage 3A – 5-Why Investigation</span>
              <span className="rca-inc-badge">{incident.incidentNumber}</span>
              <span className="rca-tier-pill" style={getTierPillStyle(classificationCat)}>
                {classificationCat}
              </span>
              <span className="rca-metric-chip">Status: {incident.status}</span>
            </div>
            <h2 className="rca-title">{incident.title}</h2>
            <div className="rca-subtitle">
              <span>📍 Zone: <strong>{incident.plantZone}</strong></span>
              <span>
                👥 CFT Lead:{' '}
                <strong>{incident.cft?.leader?.name || 'Not assigned yet'}</strong>
              </span>
            </div>
          </div>

          <button type="button" className="rca-close-btn" onClick={onClose} title="Close Workspace">
            ✕
          </button>
        </div>

        {/* Toolbar & Live Metrics */}
        <div className="rca-toolbar">
          <div className="rca-tabs">
            <button
              type="button"
              className={`rca-tab-btn ${activeView === 'tree' ? 'active' : ''}`}
              onClick={() => setActiveView('tree')}
            >
              🔗 5-Why Chain & Tree
            </button>
            <button
              type="button"
              className={`rca-tab-btn ${activeView === 'diagram' ? 'active' : ''}`}
              onClick={() => setActiveView('diagram')}
            >
              🗺️ Visual Tree Diagram
            </button>
            <button
              type="button"
              className={`rca-tab-btn ${activeView === 'matrix' ? 'active' : ''}`}
              onClick={() => setActiveView('matrix')}
            >
              📊 Root Causes Matrix ({summary.rootCausesCount})
            </button>
          </div>

          <div className="rca-metrics-strip">
            <span className="rca-metric-chip">Steps: {summary.totalNodes}</span>
            <span className="rca-metric-chip">Depth: Why {summary.maxDepth}</span>
            <span className="rca-metric-chip validated">✓ Validated: {summary.validatedCount}</span>
            <span className="rca-metric-chip root">🎯 Root Causes: {summary.rootCausesCount}</span>
            {activeView !== 'diagram' && nodes.length > 0 && (
              <button
                type="button"
                className="rca-mini-btn add-why"
                onClick={() => setActiveView('diagram')}
                title="Generate & export visual Why-Why tree diagram"
              >
                🗺️ Generate Diagram
              </button>
            )}
          </div>
        </div>

        {/* Alerts */}
        {incident.triage?.status === 'Pending' && (
          <div className="rca-banner warning">
            <span>
              ⚠️ Triage / CFT Mandate is still <strong>Pending</strong> — you can still draft your 5-Why causes here anytime.
            </span>
          </div>
        )}
        {error && (
          <div className="rca-banner error">
            <span>⚠️ {error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: '800', color: 'inherit' }}
            >
              ✕
            </button>
          </div>
        )}
        {bannerSuccess && (
          <div className="rca-banner success">
            <span>✅ {bannerSuccess}</span>
          </div>
        )}

        {/* Body */}
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading 5-Why Investigation Chain...
          </div>
        ) : activeView === 'tree' ? (
          <div className="rca-workspace-body">
            {/* Left Pane: Linear-First Flow Canvas */}
            <div className="rca-tree-pane">
              <div className="rca-tree-controls">
                <div className="rca-filter-pills">
                  {[
                    { id: 'all', label: `All (${nodes.length})` },
                    { id: 'root', label: `🎯 Root Causes (${rootCauseNodes.length})` },
                    { id: 'exploring', label: '🔍 Exploring' },
                    { id: 'disproven', label: `❌ Disproven (${disprovenNodes.length})` }
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={`rca-filter-pill ${treeFilter === f.id ? 'active' : ''}`}
                      onClick={() => setTreeFilter(f.id)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {Object.values(collapsedNodeIds).some(Boolean) && (
                  <button
                    type="button"
                    className="rca-btn-secondary"
                    onClick={() => setCollapsedNodeIds({})}
                  >
                    Expand All
                  </button>
                )}
              </div>

              {rootAnchors.map((anchor) => renderNodeBranch(anchor))}

              {nodes.length === 1 && quickAddParentId !== rootAnchors[0]?._id && (
                <div className="rca-starter-box">
                  <div style={{ fontWeight: '800', fontSize: '0.88rem', marginBottom: '6px' }}>
                    Start Your 5-Why Investigation
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '10px' }}>
                    Click <strong>Ask Why 1</strong> on the Problem Anchor above to trace the root cause step-by-step.
                  </div>
                  <button
                    type="button"
                    className="rca-btn-save"
                    onClick={() => {
                      if (rootAnchors[0]) {
                        setQuickAddParentId(rootAnchors[0]._id);
                        setQuickAddText('');
                      }
                    }}
                  >
                    + Add Why 1 Now
                  </button>
                </div>
              )}
            </div>

            {/* Right Pane: Simplified 1-Click Node Editor */}
            <div className="rca-inspector-pane">
              {!selectedNode ? (
                <div style={{ color: 'var(--text-secondary)', padding: '30px', textAlign: 'center' }}>
                  Click any step on the left to edit, validate, or mark as a Root Cause.
                </div>
              ) : (
                <form onSubmit={handleSaveSelectedNode} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="rca-inspector-header">
                    <div>
                      <h3>
                        {isRootAnchorSelected
                          ? 'Problem Anchor (Incident Event)'
                          : `Why Level ${selectedNode.whyLevel}`}
                      </h3>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                        {getWhyChain(selectedNode)
                          .map((c) => (c.whyLevel === 0 ? 'Anchor' : `Why ${c.whyLevel}`))
                          .join(' → ')}
                      </div>
                    </div>

                    {!isRootAnchorSelected && (
                      <button
                        type="button"
                        className="rca-mini-btn add-why"
                        onClick={() => {
                          setQuickAddParentId(selectedNode._id);
                          setQuickAddText('');
                        }}
                      >
                        ↓ Add Why {selectedNode.whyLevel + 1}
                      </button>
                    )}
                  </div>

                  {/* Step 1: Cause Statement */}
                  <div className="rca-field-group">
                    <label className="rca-field-label">Cause Statement *</label>
                    <textarea
                      rows={2}
                      className="rca-textarea"
                      value={editForm.statement}
                      onChange={(e) => setEditForm({ ...editForm, statement: e.target.value })}
                      required
                    />
                  </div>

                  {/* Step 2: 1-Click Validation Pills */}
                  <div className="rca-field-group">
                    <label className="rca-field-label">1. Validation Status (1-Click Save)</label>
                    <div className="rca-pill-selector">
                      {STATUS_CHOICES.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={saving}
                          className={`rca-choice-pill ${editForm.status === opt.value ? opt.activeClass : ''}`}
                          onClick={() => handleQuickStatus(opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 3: 1-Click Root Cause Pills */}
                  {!isRootAnchorSelected && (
                    <div className="rca-field-group">
                      <label className="rca-field-label">2. Is this a Root Cause? (1-Click Save)</label>
                      <div className="rca-pill-selector">
                        {ROOT_CAUSE_CHOICES.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            disabled={saving}
                            className={`rca-choice-pill ${editForm.rootCauseType === opt.value ? opt.activeClass : ''}`}
                            onClick={() => handleQuickRootCause(opt.value)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 4: Progressive Accordion for API RP 754 Causal Factor */}
                  <div className="rca-accordion-box">
                    <button
                      type="button"
                      className="rca-accordion-trigger"
                      onClick={() => setShowTaxonomyBox((v) => !v)}
                    >
                      <span>
                        🏷️ API RP 754 Causal Factor{' '}
                        {editForm.api754Category ? `(${editForm.api754Category})` : '(Optional)'}
                      </span>
                      <span>{showTaxonomyBox ? '▲' : '▼'}</span>
                    </button>

                    {showTaxonomyBox && (
                      <div className="rca-accordion-body">
                        <div className="rca-field-group">
                          <label className="rca-field-label">Causal Category (Sec 10.4.4)</label>
                          <select
                            className="rca-select"
                            value={editForm.api754Category}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                api754Category: e.target.value,
                                api754Subcategory: ''
                              })
                            }
                          >
                            <option value="">-- Not Tagged --</option>
                            {causalFactors.map((cf) => (
                              <option key={cf.category} value={cf.category}>
                                {cf.category}
                              </option>
                            ))}
                          </select>
                        </div>

                        {editForm.api754Category && (
                          <div className="rca-field-group">
                            <label className="rca-field-label">Subcategory</label>
                            <select
                              className="rca-select"
                              value={editForm.api754Subcategory}
                              onChange={(e) =>
                                setEditForm({ ...editForm, api754Subcategory: e.target.value })
                              }
                            >
                              <option value="">-- Select Subcategory --</option>
                              {currentSubcategories.map((sub) => (
                                <option key={sub} value={sub}>
                                  {sub}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Step 5: Progressive Accordion for Notes & Evidence */}
                  <div className="rca-accordion-box">
                    <button
                      type="button"
                      className="rca-accordion-trigger"
                      onClick={() => setShowNotesEvidence((v) => !v)}
                    >
                      <span>
                        📝 Notes & Evidence ({selectedNode.evidence?.length || 0})
                      </span>
                      <span>{showNotesEvidence ? '▲' : '▼'}</span>
                    </button>

                    {showNotesEvidence && (
                      <div className="rca-accordion-body">
                        <div className="rca-field-group">
                          <label className="rca-field-label">Verification Notes / Rationale</label>
                          <textarea
                            rows={2}
                            className="rca-textarea"
                            placeholder="Field findings, DCS logs, interview notes..."
                            value={editForm.notes}
                            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                          />
                        </div>

                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
                          <div className="rca-field-label" style={{ marginBottom: '6px' }}>
                            Attach Evidence Reference
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <input
                              type="text"
                              className="rca-input"
                              placeholder="Title (e.g., Valve Inspection Photo / Log)"
                              value={evTitle}
                              onChange={(e) => setEvTitle(e.target.value)}
                            />
                            <div className="rca-two-col">
                              <input
                                type="text"
                                className="rca-input"
                                placeholder="Link / Ref ID (optional)"
                                value={evUrl}
                                onChange={(e) => setEvUrl(e.target.value)}
                              />
                              <button
                                type="button"
                                className="rca-btn-secondary"
                                disabled={addingEvidence || !evTitle.trim()}
                                onClick={handleAddEvidence}
                              >
                                {addingEvidence ? 'Linking...' : '+ Add Evidence'}
                              </button>
                            </div>
                          </div>

                          {selectedNode.evidence && selectedNode.evidence.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                              {selectedNode.evidence.map((ev) => (
                                <div key={ev._id} className="rca-evidence-item">
                                  <div>
                                    <div style={{ fontWeight: '700' }}>{ev.title}</div>
                                    {ev.fileUrl && (
                                      <div style={{ fontSize: '0.73rem', color: '#2563eb', wordBreak: 'break-all' }}>
                                        {ev.fileUrl}
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveEvidence(ev._id)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', fontWeight: '700' }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Save & Delete Footer */}
                  <div className="rca-inspector-footer">
                    {!isRootAnchorSelected ? (
                      <button
                        type="button"
                        className="rca-btn-danger"
                        onClick={handleDeleteNodeBranch}
                        disabled={saving}
                      >
                        🗑️ Delete Step
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Anchor step cannot be deleted
                      </span>
                    )}

                    <button type="submit" className="rca-btn-save" disabled={saving}>
                      {saving ? 'Saving...' : '💾 Save Text & Tags'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        ) : activeView === 'diagram' ? (
          <WhyWhyTreeDiagram
            incident={incident}
            nodes={nodes}
            onSelectNodeAndEdit={(nodeId) => {
              setSelectedNodeId(nodeId);
              setActiveView('tree');
            }}
          />
        ) : (
          /* View 2: Root Causes Matrix */
          <div className="rca-matrix-pane">
            <div className="rca-matrix-grid">
              <div className="rca-matrix-card">
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.92rem', fontWeight: '800' }}>
                  🎯 Root Cause Summary
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.84rem' }}>
                  <div style={{ padding: '8px 10px', background: '#fef2f2', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#991b1b', fontWeight: '700' }}>Primary Root Causes</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#dc2626' }}>
                      {rootCauseNodes.filter((n) => n.rootCauseType === 'Primary Root Cause').length}
                    </div>
                  </div>
                  <div style={{ padding: '8px 10px', background: '#fff7ed', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#9a3412', fontWeight: '700' }}>Secondary / Contributing</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#ea580c' }}>
                      {
                        rootCauseNodes.filter(
                          (n) =>
                            n.rootCauseType === 'Secondary Root Cause' ||
                            n.rootCauseType === 'Contributing Factor'
                        ).length
                      }
                    </div>
                  </div>
                </div>
              </div>

              <div className="rca-matrix-card">
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.92rem', fontWeight: '800' }}>
                  🏷️ API RP 754 Causal Categories
                </h4>
                {causalBreakdown.length === 0 ? (
                  <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                    Mark a terminal step as Root Cause to tag its API RP 754 category.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {causalBreakdown.map(([cat, count]) => (
                      <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                        <span style={{ fontWeight: '600' }}>{cat}</span>
                        <span className="rca-taxonomy-chip">{count} step(s)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', fontWeight: '800' }}>
              Identified Root Causes & Causal Chains
            </h4>
            {rootCauseNodes.length === 0 ? (
              <div className="rca-matrix-card" style={{ textAlign: 'center', color: '#64748b' }}>
                No root causes marked yet. Click any step in the 5-Why Chain tab and pick{' '}
                <strong>🎯 Primary Root Cause</strong> in 1 click.
              </div>
            ) : (
              <table className="rca-matrix-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Root Cause & Why Chain</th>
                    <th>Status</th>
                    <th>API RP 754 Causal Factor</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rootCauseNodes.map((rc) => {
                    const chain = getWhyChain(rc);
                    return (
                      <tr key={rc._id}>
                        <td>
                          <span className="rca-rc-badge">{rc.rootCauseType}</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: '700', marginBottom: '4px' }}>{rc.statement}</div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            {chain
                              .map((c) => `${c.whyLevel === 0 ? 'Anchor' : `W${c.whyLevel}`}: ${c.statement.slice(0, 35)}${c.statement.length > 35 ? '...' : ''}`)
                              .join(' → ')}
                          </div>
                        </td>
                        <td>
                          <span className={`rca-status-badge rca-status-${(rc.status || 'Exploring').toLowerCase()}`}>
                            {rc.status}
                          </span>
                        </td>
                        <td>
                          {rc.api754Category ? (
                            <span className="rca-taxonomy-chip">
                              {rc.api754Category}
                              {rc.api754Subcategory ? ` → ${rc.api754Subcategory}` : ''}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Untagged</span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="rca-mini-btn add-why"
                            onClick={() => {
                              setSelectedNodeId(rc._id);
                              setActiveView('tree');
                            }}
                          >
                            Edit Step
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
