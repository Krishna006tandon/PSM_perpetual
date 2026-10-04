import React, { useState, useEffect, useRef } from 'react';
import StudyLayout from '../components/StudyLayout';
import cytoscape from 'cytoscape';
import * as XLSX from 'xlsx';
import './BowTieAnalysis.css';

const API_BASE = (process.env.REACT_APP_API_URL || 'https://api.perpetualsolutions.co.in').replace(/\/$/, '') + '/api';

const BowTieAnalysis = ({ study, onBack, onNavigate, theme, toggleTheme, canEdit }) => {
  const [bowties, setBowties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBowtie, setSelectedBowtie] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [viewMode, setViewMode] = useState('hub'); // 'hub', 'graph', 'cause-barriers', 'consequence-barriers', 'rm-recommendations'
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // New BowTie Modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [studyScenarios, setStudyScenarios] = useState([]);
  const [newBowtieData, setNewBowtieData] = useState({
    eventName: '',
    section: '',
    hazardDescription: '',
    riskRating: 6,
    scenarioId: ''
  });

  // Selected Node in Cytoscape for Drawer
  const [selectedNodeData, setSelectedNodeData] = useState(null);

  // Barrier form state for Add/Edit
  const [barrierForm, setBarrierForm] = useState({
    event_name: '',
    barrier_type: 'cause',
    threat_or_consequence_name: '',
    pb: [''],
    pb_tag_no: [''],
    barrier_owner: [''],
    escalation_factor: '',
    escalation_control: '',
    escalation_control_owner: '',
    available_new: 'Available',
    type: 'Engg',
    c: 3,
    p: 2,
    r: 6,
    recommendation: '',
    c_rec: 2,
    p_rec: 1,
    r_rec: 2
  });
  const [isBarrierModalOpen, setIsBarrierModalOpen] = useState(false);
  const [editingBarrierId, setEditingBarrierId] = useState(null);

  // Recommendations table state
  const [recommendationsList, setRecommendationsList] = useState([]);

  // Cytoscape ref
  const cyRef = useRef(null);
  const cyInstance = useRef(null);

  // Fetch all bowties for this study
  const fetchBowties = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/bowtie/study/${study._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBowties(data);
      }
    } catch (err) {
      console.error('Error fetching bowties:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch scenarios for prefilling
  const fetchScenarios = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/scenarios/${study._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStudyScenarios(data);
      }
    } catch (err) {
      console.error('Error fetching study scenarios:', err);
    }
  };

  useEffect(() => {
    if (study?._id) {
      fetchBowties();
      fetchScenarios();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [study?._id]);

  // Fetch specific bowtie detail
  const loadBowtieDetail = async (id, targetView = 'graph') => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/bowtie/detail/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const { bowtie, graphData } = await res.json();
        setSelectedBowtie(bowtie);
        setGraphData(graphData);
        setViewMode(targetView);

        // Prep recommendations
        const recs = (bowtie.barriers || [])
          .filter(b => b.recommendation && b.recommendation.trim() !== '')
          .map(b => ({
            barrierId: b._id,
            barrier_type: b.barrier_type,
            event_name: b.event_name || bowtie.eventName,
            recommendation: b.recommendation,
            action_by: b.action_by || '',
            target_completion: b.target_completion ? b.target_completion.split('T')[0] : '',
            status: b.status || 'Open',
            remark: b.remark || ''
          }));
        setRecommendationsList(recs);
      }
    } catch (err) {
      console.error('Error loading bowtie detail:', err);
    }
  };

  // Cytoscape initialization and layout rendering
  useEffect(() => {
    if (viewMode === 'graph' && graphData && cyRef.current) {
      // Clean up previous instance
      if (cyInstance.current) {
        cyInstance.current.destroy();
      }

      const design = graphData;
      const RIGHT_X = 120;
      const GAP_Y = 190;
      const START_Y = 140;
      const EF_Y_DELTA = 90;

      let maxCauseBarr = 0;
      (design.causes || []).forEach(c => {
        if (c.barriers && c.barriers.length > maxCauseBarr) maxCauseBarr = c.barriers.length;
      });

      let maxConsBarr = 0;
      (design.consequences || []).forEach(c => {
        if (c.barriers && c.barriers.length > maxConsBarr) maxConsBarr = c.barriers.length;
      });

      const causeWidth = 260 + (maxCauseBarr * 175);
      const consWidth = 260 + (maxConsBarr * 175);

      const CENTER_X = RIGHT_X + causeWidth;
      const LEFT_X = CENTER_X + consWidth;

      const elements = [];
      const maxNodes = Math.max((design.causes || []).length, (design.consequences || []).length, 1);
      const centerY = START_Y + ((maxNodes - 1) * GAP_Y) / 2;

      // 1. Central Event Node
      elements.push({
        data: {
          id: "center",
          label: design.title || "Top Event",
          type: "event",
          raw: { title: design.title, section: design.section }
        },
        position: { x: CENTER_X, y: centerY }
      });

      // 2. Consequences (Right side)
      (design.consequences || []).forEach((c, i) => {
        const y = START_Y + i * GAP_Y;
        const cid = `cons-${i}`;
        elements.push({
          data: { id: cid, label: c.name, type: "consequence", raw: c },
          position: { x: LEFT_X, y: y }
        });

        let prevId = "center";
        const numBarr = (c.barriers || []).length;
        const startX = CENTER_X + 130;
        const endX = LEFT_X - 130;

        (c.barriers || []).forEach((b, j) => {
          const bid = `cons-${i}-bar-${j}`;
          const bx = startX + ((endX - startX) * (j + 1)) / (numBarr + 1);

          elements.push({
            data: {
              id: bid,
              label: b.description,
              type: "barrier",
              severity: b.severity,
              raw: b
            },
            position: { x: bx, y: y }
          });

          elements.push({
            data: { id: `e-${prevId}-${bid}`, source: prevId, target: bid, type: "mainEdge" }
          });
          prevId = bid;

          if (b.escalation_factor && b.escalation_factor.trim() !== '') {
            const efid = `ef-${bid}`;
            elements.push({
              data: {
                id: efid,
                label: b.escalation_factor,
                type: "escalation",
                raw: { ...b, label: b.escalation_factor }
              },
              position: { x: bx, y: y + EF_Y_DELTA }
            });
            elements.push({
              data: { id: `e-${bid}-${efid}`, source: bid, target: efid, type: "efEdge" }
            });
          }
        });

        elements.push({
          data: { id: `e-${prevId}-${cid}`, source: prevId, target: cid, type: "mainEdge" }
        });
      });

      // 3. Causes (Left side)
      (design.causes || []).forEach((c, i) => {
        const y = START_Y + i * GAP_Y;
        const cid = `cause-${i}`;

        elements.push({
          data: { id: cid, label: c.name, type: "cause", raw: c },
          position: { x: RIGHT_X, y: y }
        });

        let prevId = cid;
        const numBarr = (c.barriers || []).length;
        const startX = RIGHT_X + 130;
        const endX = CENTER_X - 130;

        (c.barriers || []).forEach((b, j) => {
          const bid = `cause-${i}-bar-${j}`;
          const bx = startX + ((endX - startX) * (j + 1)) / (numBarr + 1);

          elements.push({
            data: {
              id: bid,
              label: b.description,
              type: "barrier",
              severity: b.severity,
              raw: b
            },
            position: { x: bx, y: y }
          });

          elements.push({
            data: { id: `e-${prevId}-${bid}`, source: prevId, target: bid, type: "mainEdge" }
          });
          prevId = bid;

          if (b.escalation_factor && b.escalation_factor.trim() !== '') {
            const efid = `ef-${bid}`;
            elements.push({
              data: {
                id: efid,
                label: b.escalation_factor,
                type: "escalation",
                raw: { ...b, label: b.escalation_factor }
              },
              position: { x: bx, y: y + EF_Y_DELTA }
            });
            elements.push({
              data: { id: `e-${bid}-${efid}`, source: bid, target: efid, type: "efEdge" }
            });
          }
        });

        elements.push({
          data: { id: `e-${prevId}-center`, source: prevId, target: "center", type: "mainEdge" }
        });
      });

      // Initialize Cytoscape
      const cy = cytoscape({
        container: cyRef.current,
        elements: elements,
        layout: { name: 'preset' },
        style: [
          {
            selector: 'node',
            style: {
              'font-family': 'Inter, system-ui, sans-serif',
              'text-halign': 'center',
              'text-valign': 'center',
              'font-weight': '600',
              'transition-property': 'background-color, transform, border-color',
              'transition-duration': '0.2s',
              'cursor': 'pointer'
            }
          },
          {
            selector: 'node:selected',
            style: {
              'border-width': 4,
              'border-color': '#0f172a'
            }
          },
          {
            selector: 'node[type="event"]',
            style: {
              label: 'data(label)',
              shape: 'ellipse',
              width: 175,
              height: 175,
              'background-fill': 'linear-gradient',
              'background-gradient-stop-colors': '#ef4444 #b91c1c',
              'background-gradient-direction': 'to-bottom-right',
              color: '#ffffff',
              'border-width': 4,
              'border-color': '#fca5a5',
              'font-size': 17,
              'font-weight': '700',
              'text-wrap': 'wrap',
              'text-max-width': 135
            }
          },
          {
            selector: 'node[type="cause"]',
            style: {
              label: 'data(label)',
              shape: 'round-rectangle',
              'background-fill': 'linear-gradient',
              'background-gradient-stop-colors': '#3b82f6 #1d4ed8',
              'background-gradient-direction': 'to-bottom-right',
              color: '#ffffff',
              'border-width': 2,
              'border-color': '#bfdbfe',
              width: 185,
              height: 70,
              'font-size': 14,
              'text-wrap': 'wrap',
              'text-max-width': 155
            }
          },
          {
            selector: 'node[type="consequence"]',
            style: {
              label: 'data(label)',
              shape: 'round-rectangle',
              'background-fill': 'linear-gradient',
              'background-gradient-stop-colors': '#8b5cf6 #6d28d9',
              'background-gradient-direction': 'to-bottom-right',
              color: '#ffffff',
              'border-width': 2,
              'border-color': '#ddd6fe',
              width: 185,
              height: 70,
              'font-size': 14,
              'text-wrap': 'wrap',
              'text-max-width': 155
            }
          },
          {
            selector: 'node[type="barrier"]',
            style: {
              label: 'data(label)',
              shape: 'round-rectangle',
              'background-color': '#ffffff',
              color: '#0f172a',
              width: 155,
              height: 70,
              'font-size': 13,
              'text-wrap': 'wrap',
              'text-max-width': 135,
              'border-width': 3,
              'border-color': '#94a3b8'
            }
          },
          {
            selector: 'node[type="barrier"][severity="crit"]',
            style: { 'border-color': '#ef4444' }
          },
          {
            selector: 'node[type="barrier"][severity="high"]',
            style: { 'border-color': '#f97316' }
          },
          {
            selector: 'node[type="barrier"][severity="med"]',
            style: { 'border-color': '#f59e0b' }
          },
          {
            selector: 'node[type="barrier"][severity="low"]',
            style: { 'border-color': '#10b981' }
          },
          {
            selector: 'node[type="escalation"]',
            style: {
              label: 'data(label)',
              shape: 'round-rectangle',
              'background-fill': 'linear-gradient',
              'background-gradient-stop-colors': '#f59e0b #b45309',
              'background-gradient-direction': 'to-bottom-right',
              color: '#ffffff',
              width: 150,
              height: 60,
              'font-size': 12,
              'text-wrap': 'wrap',
              'text-max-width': 130,
              'border-width': 2,
              'border-color': '#fde68a'
            }
          },
          {
            selector: 'edge[type="mainEdge"]',
            style: {
              'curve-style': 'taxi',
              'taxi-direction': 'horizontal',
              width: 4,
              'line-color': '#94a3b8',
              'target-arrow-color': '#64748b',
              'target-arrow-shape': 'triangle',
              'arrow-scale': 1.4
            }
          },
          {
            selector: 'edge[type="efEdge"]',
            style: {
              'curve-style': 'taxi',
              'taxi-direction': 'vertical',
              width: 3,
              'line-color': '#cbd5e1',
              'target-arrow-shape': 'triangle',
              'target-arrow-color': '#94a3b8',
              'line-style': 'dashed',
              'line-dash-pattern': [6, 4],
              'arrow-scale': 1.2
            }
          }
        ]
      });

      // Fit with nice padding
      cy.ready(() => {
        cy.fit(cy.elements(), 50);
      });

      // Tap on node to show drawer details
      cy.on('tap', 'node', (evt) => {
        const node = evt.target;
        setSelectedNodeData({
          id: node.id(),
          type: node.data('type'),
          label: node.data('label'),
          severity: node.data('severity'),
          raw: node.data('raw')
        });
      });

      // Tap on background to close drawer
      cy.on('tap', (evt) => {
        if (evt.target === cy) {
          setSelectedNodeData(null);
        }
      });

      cyInstance.current = cy;
    }
  }, [viewMode, graphData]);

  // Snapshot / Export PNG
  const handleSnapshot = () => {
    if (!cyInstance.current) return;
    const pngUri = cyInstance.current.png({ full: true, scale: 2, bg: '#f8fafc' });
    const link = document.createElement('a');
    link.href = pngUri;
    link.download = `bowtie-${(selectedBowtie?.eventName || 'analysis').replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Zoom Controls
  const handleZoomIn = () => {
    if (!cyInstance.current) return;
    cyInstance.current.zoom(cyInstance.current.zoom() * 1.25);
  };

  const handleZoomOut = () => {
    if (!cyInstance.current) return;
    cyInstance.current.zoom(cyInstance.current.zoom() * 0.8);
  };

  const handleFit = () => {
    if (!cyInstance.current) return;
    cyInstance.current.fit(cyInstance.current.elements(), 50);
  };

  // Excel Export matching exact schemas from project_perpectual
  const handleExportExcel = (targetBowtie = selectedBowtie) => {
    if (!targetBowtie) return;

    const wb = XLSX.utils.book_new();

    // 1. Plant Detail
    const plantRows = [
      ['Field', 'Value'],
      ['Study Title', study.title || 'PHA Study'],
      ['Plant Name', study.plant || ''],
      ['Study Type', study.studyType || 'HAZOP / PHA'],
      ['Company Code', study.companyCode || ''],
      ['Scope', study.scope || ''],
      ['Objective', study.objective || '']
    ];
    const plantWs = XLSX.utils.aoa_to_sheet(plantRows);
    XLSX.utils.book_append_sheet(wb, plantWs, 'Plant Detail');

    // 2. Scenario Selection
    const scenarioRows = [
      ['Sr. No', 'Section', 'Top Scenario', 'Risk Rating'],
      [1, targetBowtie.section || 'General', targetBowtie.eventName, targetBowtie.riskRating || 0]
    ];
    const scenarioWs = XLSX.utils.aoa_to_sheet(scenarioRows);
    XLSX.utils.book_append_sheet(wb, scenarioWs, 'Scenario Selection');

    // 3. Event Page
    const eventRows = [
      ['Event Name', 'Section', 'Hazard Description'],
      [targetBowtie.eventName, targetBowtie.section || '', targetBowtie.hazardDescription || '']
    ];
    const eventWs = XLSX.utils.aoa_to_sheet(eventRows);
    XLSX.utils.book_append_sheet(wb, eventWs, 'Event Page');

    // 4. Cause Barrier
    const causeRows = [
      [
        'Event Name', 'Threat/Cause', 'PB', 'PB Tag No', 'Barrier Owner',
        'Escalation Factor', 'Escalation Control', 'Escalation Control Owner',
        'Available/New', 'Type', 'C', 'P', 'R',
        'Recommendation', 'C (Rec)', 'P (Rec)', 'R (Rec)'
      ]
    ];
    (targetBowtie.barriers || [])
      .filter(b => b.barrier_type === 'cause')
      .forEach(b => {
        causeRows.push([
          b.event_name || targetBowtie.eventName,
          b.threat_or_consequence_name || '',
          (b.pb || []).join(', '),
          (b.pb_tag_no || []).join(', '),
          (b.barrier_owner || []).join(', '),
          b.escalation_factor || '',
          b.escalation_control || '',
          b.escalation_control_owner || '',
          b.available_new || 'Available',
          b.type || 'Engg',
          b.c || 0,
          b.p || 0,
          b.r || 0,
          b.recommendation || '',
          b.c_rec || 0,
          b.p_rec || 0,
          b.r_rec || 0
        ]);
      });
    const causeWs = XLSX.utils.aoa_to_sheet(causeRows);
    XLSX.utils.book_append_sheet(wb, causeWs, 'Cause Barrier');

    // 5. Consequence Barrier
    const consRows = [
      [
        'Event Name', 'Consequence', 'PB', 'PB Tag No', 'Barrier Owner',
        'Escalation Factor', 'Escalation Control', 'Escalation Control Owner',
        'Available/New', 'Type', 'C', 'P', 'R',
        'Recommendation', 'C (Rec)', 'P (Rec)', 'R (Rec)'
      ]
    ];
    (targetBowtie.barriers || [])
      .filter(b => b.barrier_type === 'consequence')
      .forEach(b => {
        consRows.push([
          b.event_name || targetBowtie.eventName,
          b.threat_or_consequence_name || '',
          (b.pb || []).join(', '),
          (b.pb_tag_no || []).join(', '),
          (b.barrier_owner || []).join(', '),
          b.escalation_factor || '',
          b.escalation_control || '',
          b.escalation_control_owner || '',
          b.available_new || 'Available',
          b.type || 'Engg',
          b.c || 0,
          b.p || 0,
          b.r || 0,
          b.recommendation || '',
          b.c_rec || 0,
          b.p_rec || 0,
          b.r_rec || 0
        ]);
      });
    const consWs = XLSX.utils.aoa_to_sheet(consRows);
    XLSX.utils.book_append_sheet(wb, consWs, 'Consequence Barrier');

    // 6. RM Recommendation
    const rmRows = [
      ['Type', 'Event Name', 'Recommendation', 'Action by', 'Target completion', 'Status', 'Remark']
    ];
    (targetBowtie.barriers || [])
      .filter(b => b.recommendation && b.recommendation.trim() !== '')
      .forEach(b => {
        rmRows.push([
          b.barrier_type === 'cause' ? 'Cause Barrier' : 'Consequence Barrier',
          b.event_name || targetBowtie.eventName,
          b.recommendation,
          b.action_by || '',
          b.target_completion ? b.target_completion.split('T')[0] : '',
          b.status || 'Open',
          b.remark || ''
        ]);
      });
    const rmWs = XLSX.utils.aoa_to_sheet(rmRows);
    XLSX.utils.book_append_sheet(wb, rmWs, 'RM Recommendation');

    XLSX.writeFile(wb, `bowtie-${(targetBowtie.eventName || 'analysis').replace(/\s+/g, '_')}.xlsx`);
  };

  // Create new BowTie
  const handleCreateBowtie = async (e) => {
    e.preventDefault();
    if (!newBowtieData.eventName.trim()) {
      alert('Please enter an Event Name');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/bowtie/study/${study._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newBowtieData)
      });

      if (res.ok) {
        const created = await res.json();
        setIsNewModalOpen(false);
        setNewBowtieData({
          eventName: '',
          section: '',
          hazardDescription: '',
          riskRating: 6,
          scenarioId: ''
        });
        await fetchBowties();
        loadBowtieDetail(created._id, 'graph');
      } else {
        const err = await res.json();
        alert(`Error creating BowTie: ${err.message}`);
      }
    } catch (err) {
      console.error('Error creating bowtie:', err);
      alert('Failed to create BowTie.');
    }
  };

  // Handle Scenario prefill selection
  const handleScenarioSelect = (scenarioId) => {
    if (!scenarioId) {
      setNewBowtieData(prev => ({ ...prev, scenarioId: '' }));
      return;
    }
    const sc = studyScenarios.find(s => s._id === scenarioId);
    if (sc) {
      const devName = sc.deviationId?.deviationAuto || 'Deviation Event';
      const causeText = sc.causeId?.description || '';
      setNewBowtieData({
        eventName: `${devName}${causeText ? ' - ' + causeText : ''}`,
        section: sc.nodeId?.nodeNumber ? `Node ${sc.nodeId.nodeNumber}` : '',
        hazardDescription: sc.consequencesImmediate || sc.consequencesUltimate || '',
        riskRating: Number(sc.inherentRiskRR) || 6,
        scenarioId: sc._id
      });
    }
  };

  // Open Barrier Form Modal (Add or Edit)
  const openBarrierModal = (type = 'cause', barrierToEdit = null) => {
    if (barrierToEdit) {
      setEditingBarrierId(barrierToEdit._id);
      setBarrierForm({
        event_name: barrierToEdit.event_name || selectedBowtie.eventName,
        barrier_type: barrierToEdit.barrier_type,
        threat_or_consequence_name: barrierToEdit.threat_or_consequence_name || '',
        pb: barrierToEdit.pb?.length ? [...barrierToEdit.pb] : [''],
        pb_tag_no: barrierToEdit.pb_tag_no?.length ? [...barrierToEdit.pb_tag_no] : [''],
        barrier_owner: barrierToEdit.barrier_owner?.length ? [...barrierToEdit.barrier_owner] : [''],
        escalation_factor: barrierToEdit.escalation_factor || '',
        escalation_control: barrierToEdit.escalation_control || '',
        escalation_control_owner: barrierToEdit.escalation_control_owner || '',
        available_new: barrierToEdit.available_new || 'Available',
        type: barrierToEdit.type || 'Engg',
        c: barrierToEdit.c || 3,
        p: barrierToEdit.p || 2,
        r: barrierToEdit.r || 6,
        recommendation: barrierToEdit.recommendation || '',
        c_rec: barrierToEdit.c_rec || 2,
        p_rec: barrierToEdit.p_rec || 1,
        r_rec: barrierToEdit.r_rec || 2
      });
    } else {
      setEditingBarrierId(null);
      setBarrierForm({
        event_name: selectedBowtie.eventName,
        barrier_type: type,
        threat_or_consequence_name: '',
        pb: [''],
        pb_tag_no: [''],
        barrier_owner: [''],
        escalation_factor: '',
        escalation_control: '',
        escalation_control_owner: '',
        available_new: 'Available',
        type: 'Engg',
        c: 3,
        p: 2,
        r: 6,
        recommendation: '',
        c_rec: 2,
        p_rec: 1,
        r_rec: 2
      });
    }
    setIsBarrierModalOpen(true);
  };

  // Dynamic PB rows in barrier modal
  const addPbRow = () => {
    setBarrierForm(prev => ({
      ...prev,
      pb: [...prev.pb, ''],
      pb_tag_no: [...prev.pb_tag_no, ''],
      barrier_owner: [...prev.barrier_owner, '']
    }));
  };

  const removePbRow = (index) => {
    setBarrierForm(prev => ({
      ...prev,
      pb: prev.pb.filter((_, i) => i !== index),
      pb_tag_no: prev.pb_tag_no.filter((_, i) => i !== index),
      barrier_owner: prev.barrier_owner.filter((_, i) => i !== index)
    }));
  };

  const updatePbField = (index, field, value) => {
    setBarrierForm(prev => {
      const arr = [...prev[field]];
      arr[index] = value;
      return { ...prev, [field]: arr };
    });
  };

  // Save barrier (Add or Edit)
  const handleSaveBarrier = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...barrierForm,
        r: Number(barrierForm.c) * Number(barrierForm.p),
        r_rec: Number(barrierForm.c_rec) * Number(barrierForm.p_rec)
      };

      const url = editingBarrierId
        ? `${API_BASE}/bowtie/detail/${selectedBowtie._id}/barrier/${editingBarrierId}`
        : `${API_BASE}/bowtie/detail/${selectedBowtie._id}/barrier`;

      const method = editingBarrierId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsBarrierModalOpen(false);
        await loadBowtieDetail(selectedBowtie._id, viewMode);
      } else {
        const err = await res.json();
        alert(`Error saving barrier: ${err.message}`);
      }
    } catch (err) {
      console.error('Error saving barrier:', err);
      alert('Failed to save barrier.');
    }
  };

  // Delete a barrier
  const handleDeleteBarrier = async (barrierId) => {
    if (!window.confirm('Are you sure you want to delete this barrier?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/bowtie/detail/${selectedBowtie._id}/barrier/${barrierId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await loadBowtieDetail(selectedBowtie._id, viewMode);
      }
    } catch (err) {
      console.error('Error deleting barrier:', err);
    }
  };

  // Delete entire BowTie
  const handleDeleteBowtie = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this entire BowTie analysis?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/bowtie/detail/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        if (selectedBowtie?._id === id) {
          setSelectedBowtie(null);
          setViewMode('hub');
        }
        await fetchBowties();
      }
    } catch (err) {
      console.error('Error deleting bowtie:', err);
    }
  };

  // Save RM Recommendations updates
  const handleSaveRecommendations = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/bowtie/detail/${selectedBowtie._id}/rm-recommendations`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ updates: recommendationsList })
      });
      if (res.ok) {
        alert('Recommendations updated successfully!');
        await loadBowtieDetail(selectedBowtie._id, 'rm-recommendations');
      }
    } catch (err) {
      console.error('Error updating recommendations:', err);
      alert('Failed to update recommendations.');
    }
  };

  // Filtered bowties for Hub
  const filteredBowties = bowties.filter(b => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (b.eventName && b.eventName.toLowerCase().includes(q)) ||
      (b.section && b.section.toLowerCase().includes(q)) ||
      (b.hazardDescription && b.hazardDescription.toLowerCase().includes(q))
    );
  });

  // Calculate quick stats across all study bowties
  const stats = {
    totalBowties: bowties.length,
    totalThreats: bowties.reduce((acc, b) => acc + (b.barriers || []).filter(item => item.barrier_type === 'cause').length, 0),
    totalMitigations: bowties.reduce((acc, b) => acc + (b.barriers || []).filter(item => item.barrier_type === 'consequence').length, 0),
    totalBarriers: bowties.reduce((acc, b) => acc + (b.barriers || []).length, 0),
    highRiskCount: bowties.reduce((acc, b) => acc + (b.barriers || []).filter(item => item.r >= 10).length, 0)
  };

  return (
    <StudyLayout 
      activeTab="bowtie" 
      onBack={onBack} 
      onNavigate={onNavigate} 
      theme={theme} 
      toggleTheme={toggleTheme}
    >
      <div className="bowtie-container">
        
        {/* Top Header */}
        <div className="bowtie-header">
          <div className="bowtie-header-left">
            <h2>
              <span>🎀</span> BowTie Analysis
            </h2>
            <span className="bowtie-badge">HAZARD VISUALIZATION</span>
            {selectedBowtie && viewMode !== 'hub' && (
              <span style={{ fontSize: '14px', color: '#64748b' }}>
                &gt; <strong style={{ color: '#0f172a' }}>{selectedBowtie.eventName}</strong>
              </span>
            )}
          </div>
          <div className="bowtie-header-right">
            {viewMode !== 'hub' && (
              <button 
                className="btn-bowtie-secondary" 
                onClick={() => setViewMode('hub')}
              >
                &larr; All BowTies
              </button>
            )}
            <button 
              className="btn-bowtie-primary" 
              onClick={() => setIsNewModalOpen(true)}
            >
              + New BowTie
            </button>
          </div>
        </div>

        {/* ---------------- HUB VIEW (DEFAULT) ---------------- */}
        {viewMode === 'hub' && (
          <div>
            {/* Quick Stats Grid */}
            <div className="bowtie-stats-grid">
              <div className="bowtie-stat-card">
                <div className="bowtie-stat-icon blue">🎀</div>
                <div className="bowtie-stat-info">
                  <div className="num">{stats.totalBowties}</div>
                  <div className="label">Total BowTies</div>
                </div>
              </div>

              <div className="bowtie-stat-card">
                <div className="bowtie-stat-icon red">⚡</div>
                <div className="bowtie-stat-info">
                  <div className="num">{stats.totalThreats}</div>
                  <div className="label">Cause Barriers</div>
                </div>
              </div>

              <div className="bowtie-stat-card">
                <div className="bowtie-stat-icon purple">🛡️</div>
                <div className="bowtie-stat-info">
                  <div className="num">{stats.totalMitigations}</div>
                  <div className="label">Mitigative Barriers</div>
                </div>
              </div>

              <div className="bowtie-stat-card">
                <div className="bowtie-stat-icon amber">⚠️</div>
                <div className="bowtie-stat-info">
                  <div className="num">{stats.highRiskCount}</div>
                  <div className="label">High Risk Barriers</div>
                </div>
              </div>
            </div>

            {/* Hub Search & Action Bar */}
            <div className="bowtie-hub-toolbar">
              <input 
                type="text" 
                className="bowtie-search-input"
                placeholder="Search BowTie by event or section..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                {bowties.length > 0 && (
                  <button 
                    className="btn-bowtie-secondary"
                    onClick={() => handleExportExcel(bowties[0])}
                  >
                    📊 Export Full Excel Report
                  </button>
                )}
              </div>
            </div>

            {/* BowTies Table */}
            <div className="bowtie-table-card">
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  Loading BowTie analyses...
                </div>
              ) : filteredBowties.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '14px' }}>🎀</div>
                  <h3 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>No BowTie Analyses Found</h3>
                  <p style={{ margin: '0 0 20px 0', color: '#64748b' }}>
                    Create your first BowTie diagram or generate one automatically from a PHA Scenario.
                  </p>
                  <button 
                    className="btn-bowtie-primary" 
                    style={{ margin: '0 auto' }}
                    onClick={() => setIsNewModalOpen(true)}
                  >
                    + Create BowTie
                  </button>
                </div>
              ) : (
                <table className="bowtie-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>#</th>
                      <th>Top Event / Scenario</th>
                      <th>Section / Node</th>
                      <th>Threats</th>
                      <th>Barriers</th>
                      <th>Consequences</th>
                      <th>Created</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBowties.map((bt, index) => {
                      const causesCount = (bt.barriers || []).filter(b => b.barrier_type === 'cause').length;
                      const consCount = (bt.barriers || []).filter(b => b.barrier_type === 'consequence').length;
                      const totalBarriers = (bt.barriers || []).length;

                      return (
                        <tr key={bt._id}>
                          <td>{index + 1}</td>
                          <td>
                            <div className="bowtie-event-title">{bt.eventName}</div>
                            {bt.hazardDescription && (
                              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                {bt.hazardDescription.slice(0, 70)}...
                              </div>
                            )}
                          </td>
                          <td>
                            <span style={{ fontWeight: 500 }}>
                              {bt.section || (bt.nodeId ? `Node ${bt.nodeId.nodeNumber}` : 'General')}
                            </span>
                          </td>
                          <td>
                            <span className="bowtie-count-chip threat">{causesCount} Threats</span>
                          </td>
                          <td>
                            <span className="bowtie-count-chip barrier">{totalBarriers} Barriers</span>
                          </td>
                          <td>
                            <span className="bowtie-count-chip cons">{consCount} Consequences</span>
                          </td>
                          <td style={{ color: '#64748b', fontSize: '13px' }}>
                            {bt.createdAt ? new Date(bt.createdAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td>
                            <div className="bowtie-actions-cell" style={{ justifyContent: 'flex-end' }}>
                              <button 
                                className="btn-icon-action primary"
                                title="View BowTie Visual Graph"
                                onClick={() => loadBowtieDetail(bt._id, 'graph')}
                              >
                                📈 View Graph
                              </button>
                              <button 
                                className="btn-icon-action"
                                title="Manage Barriers"
                                onClick={() => loadBowtieDetail(bt._id, 'cause-barriers')}
                              >
                                🛡️ Barriers
                              </button>
                              <button 
                                className="btn-icon-action"
                                title="Export Excel"
                                onClick={() => handleExportExcel(bt)}
                              >
                                📥 Excel
                              </button>
                              <button 
                                className="btn-icon-action danger"
                                title="Delete BowTie"
                                onClick={(e) => handleDeleteBowtie(bt._id, e)}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ---------------- GRAPH VIEW ---------------- */}
        {viewMode === 'graph' && selectedBowtie && (
          <div className="bowtie-graph-wrapper">
            {/* Graph Navigation & Controls Bar */}
            <div className="bowtie-graph-toolbar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div className="bowtie-graph-nav-tabs">
                  <button 
                    className={`bowtie-nav-tab ${viewMode === 'graph' ? 'active' : ''}`}
                    onClick={() => setViewMode('graph')}
                  >
                    📈 Visual Graph
                  </button>
                  <button 
                    className={`bowtie-nav-tab ${viewMode === 'cause-barriers' ? 'active' : ''}`}
                    onClick={() => setViewMode('cause-barriers')}
                  >
                    ⚡ Cause Barriers
                  </button>
                  <button 
                    className={`bowtie-nav-tab ${viewMode === 'consequence-barriers' ? 'active' : ''}`}
                    onClick={() => setViewMode('consequence-barriers')}
                  >
                    🛡️ Consequence Barriers
                  </button>
                  <button 
                    className={`bowtie-nav-tab ${viewMode === 'rm-recommendations' ? 'active' : ''}`}
                    onClick={() => setViewMode('rm-recommendations')}
                  >
                    📋 RM Recommendations
                  </button>
                </div>
              </div>

              <div className="bowtie-graph-controls">
                <button 
                  className="btn-bowtie-secondary" 
                  title="Zoom In" 
                  onClick={handleZoomIn}
                >
                  ➕
                </button>
                <button 
                  className="btn-bowtie-secondary" 
                  title="Zoom Out" 
                  onClick={handleZoomOut}
                >
                  ➖
                </button>
                <button 
                  className="btn-bowtie-secondary" 
                  title="Fit to Screen" 
                  onClick={handleFit}
                >
                  ⊡ Fit
                </button>
                <button 
                  className="btn-bowtie-success" 
                  onClick={handleSnapshot}
                  title="Save high-resolution PNG snapshot"
                >
                  📸 Snapshot
                </button>
                <button 
                  className="btn-bowtie-primary" 
                  onClick={() => handleExportExcel(selectedBowtie)}
                  title="Download complete multi-sheet Excel report"
                >
                  📊 Export Excel
                </button>
              </div>
            </div>

            {/* Cytoscape Canvas Container */}
            <div id="cy-container" ref={cyRef}></div>

            {/* Graph Legend */}
            <div className="bowtie-legend">
              <div className="bowtie-legend-title">Legend</div>
              <div className="bowtie-legend-item">
                <div className="bowtie-legend-dot event"></div>
                <span>Top Event</span>
              </div>
              <div className="bowtie-legend-item">
                <div className="bowtie-legend-dot threat"></div>
                <span>Threat / Cause</span>
              </div>
              <div className="bowtie-legend-item">
                <div className="bowtie-legend-dot barrier"></div>
                <span>Preventive / Mitigative Barrier</span>
              </div>
              <div className="bowtie-legend-item">
                <div className="bowtie-legend-dot escalation"></div>
                <span>Escalation Factor</span>
              </div>
              <div className="bowtie-legend-item">
                <div className="bowtie-legend-dot cons"></div>
                <span>Consequence</span>
              </div>
            </div>

            {/* Node Detail Side Drawer */}
            {selectedNodeData && (
              <div className="bowtie-detail-drawer">
                <div className="bowtie-drawer-header">
                  <div>
                    <span className="bowtie-badge" style={{ marginBottom: '6px', display: 'inline-block' }}>
                      {selectedNodeData.type.toUpperCase()}
                    </span>
                    <h3>{selectedNodeData.label}</h3>
                  </div>
                  <button 
                    className="bowtie-close-btn"
                    onClick={() => setSelectedNodeData(null)}
                  >
                    &times;
                  </button>
                </div>

                {selectedNodeData.raw?.tagNo && (
                  <div className="bowtie-drawer-field">
                    <div className="label">Tag Number</div>
                    <div className="val">{selectedNodeData.raw.tagNo}</div>
                  </div>
                )}

                {selectedNodeData.raw?.owner && (
                  <div className="bowtie-drawer-field">
                    <div className="label">Barrier Owner</div>
                    <div className="val">{selectedNodeData.raw.owner}</div>
                  </div>
                )}

                {selectedNodeData.raw?.escalation_factor && (
                  <div className="bowtie-drawer-field">
                    <div className="label">Escalation Factor</div>
                    <div className="val">{selectedNodeData.raw.escalation_factor}</div>
                  </div>
                )}

                {selectedNodeData.raw?.escalation_control && (
                  <div className="bowtie-drawer-field">
                    <div className="label">Escalation Control</div>
                    <div className="val">{selectedNodeData.raw.escalation_control}</div>
                  </div>
                )}

                {selectedNodeData.raw?.r !== undefined && (
                  <div className="bowtie-drawer-field">
                    <div className="label">Initial Risk Rating (C × P = R)</div>
                    <div className="val">
                      C: {selectedNodeData.raw.c} | P: {selectedNodeData.raw.p} | <strong>R: {selectedNodeData.raw.r}</strong>
                    </div>
                  </div>
                )}

                {selectedNodeData.raw?.recommendation && (
                  <div className="bowtie-drawer-field">
                    <div className="label">Recommendation</div>
                    <div className="val">{selectedNodeData.raw.recommendation}</div>
                  </div>
                )}

                {selectedNodeData.raw?.r_rec !== undefined && (
                  <div className="bowtie-drawer-field">
                    <div className="label">Residual Risk Rating (C × P = R)</div>
                    <div className="val">
                      C: {selectedNodeData.raw.c_rec} | P: {selectedNodeData.raw.p_rec} | <strong>R: {selectedNodeData.raw.r_rec}</strong>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ---------------- CAUSE BARRIER MANAGEMENT ---------------- */}
        {viewMode === 'cause-barriers' && selectedBowtie && (
          <div className="bowtie-barrier-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div className="bowtie-graph-nav-tabs">
                <button className="bowtie-nav-tab" onClick={() => setViewMode('graph')}>📈 Visual Graph</button>
                <button className="bowtie-nav-tab active">⚡ Cause Barriers</button>
                <button className="bowtie-nav-tab" onClick={() => setViewMode('consequence-barriers')}>🛡️ Consequence Barriers</button>
                <button className="bowtie-nav-tab" onClick={() => setViewMode('rm-recommendations')}>📋 RM Recommendations</button>
              </div>
              <button className="btn-bowtie-primary" onClick={() => openBarrierModal('cause')}>
                + Add Cause Barrier
              </button>
            </div>

            <div className="bowtie-table-card" style={{ margin: 0 }}>
              <table className="bowtie-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Threat / Cause</th>
                    <th>Preventive Barrier (PB)</th>
                    <th>PB Tag No</th>
                    <th>Owner</th>
                    <th>C</th>
                    <th>P</th>
                    <th>R</th>
                    <th>Recommendation</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedBowtie.barriers || []).filter(b => b.barrier_type === 'cause').length === 0 ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        No cause barriers added yet. Click "+ Add Cause Barrier" to add one.
                      </td>
                    </tr>
                  ) : (
                    (selectedBowtie.barriers || []).filter(b => b.barrier_type === 'cause').map((b, idx) => (
                      <tr key={b._id}>
                        <td>{idx + 1}</td>
                        <td style={{ fontWeight: 600, color: '#1d4ed8' }}>{b.threat_or_consequence_name || 'Threat'}</td>
                        <td>{(b.pb || []).join(', ') || 'N/A'}</td>
                        <td>{(b.pb_tag_no || []).join(', ') || '-'}</td>
                        <td>{(b.barrier_owner || []).join(', ') || '-'}</td>
                        <td>{b.c}</td>
                        <td>{b.p}</td>
                        <td><span className="bowtie-count-chip barrier">{b.r}</span></td>
                        <td>{b.recommendation || '-'}</td>
                        <td>
                          <div className="bowtie-actions-cell" style={{ justifyContent: 'flex-end' }}>
                            <button className="btn-icon-action" onClick={() => openBarrierModal('cause', b)}>
                              ✏️ Edit
                            </button>
                            <button className="btn-icon-action danger" onClick={() => handleDeleteBarrier(b._id)}>
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---------------- CONSEQUENCE BARRIER MANAGEMENT ---------------- */}
        {viewMode === 'consequence-barriers' && selectedBowtie && (
          <div className="bowtie-barrier-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div className="bowtie-graph-nav-tabs">
                <button className="bowtie-nav-tab" onClick={() => setViewMode('graph')}>📈 Visual Graph</button>
                <button className="bowtie-nav-tab" onClick={() => setViewMode('cause-barriers')}>⚡ Cause Barriers</button>
                <button className="bowtie-nav-tab active">🛡️ Consequence Barriers</button>
                <button className="bowtie-nav-tab" onClick={() => setViewMode('rm-recommendations')}>📋 RM Recommendations</button>
              </div>
              <button className="btn-bowtie-primary" onClick={() => openBarrierModal('consequence')}>
                + Add Consequence Barrier
              </button>
            </div>

            <div className="bowtie-table-card" style={{ margin: 0 }}>
              <table className="bowtie-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Consequence</th>
                    <th>Mitigative Barrier (PB)</th>
                    <th>PB Tag No</th>
                    <th>Owner</th>
                    <th>C</th>
                    <th>P</th>
                    <th>R</th>
                    <th>Recommendation</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedBowtie.barriers || []).filter(b => b.barrier_type === 'consequence').length === 0 ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        No consequence barriers added yet. Click "+ Add Consequence Barrier" to add one.
                      </td>
                    </tr>
                  ) : (
                    (selectedBowtie.barriers || []).filter(b => b.barrier_type === 'consequence').map((b, idx) => (
                      <tr key={b._id}>
                        <td>{idx + 1}</td>
                        <td style={{ fontWeight: 600, color: '#7c3aed' }}>{b.threat_or_consequence_name || 'Consequence'}</td>
                        <td>{(b.pb || []).join(', ') || 'N/A'}</td>
                        <td>{(b.pb_tag_no || []).join(', ') || '-'}</td>
                        <td>{(b.barrier_owner || []).join(', ') || '-'}</td>
                        <td>{b.c}</td>
                        <td>{b.p}</td>
                        <td><span className="bowtie-count-chip barrier">{b.r}</span></td>
                        <td>{b.recommendation || '-'}</td>
                        <td>
                          <div className="bowtie-actions-cell" style={{ justifyContent: 'flex-end' }}>
                            <button className="btn-icon-action" onClick={() => openBarrierModal('consequence', b)}>
                              ✏️ Edit
                            </button>
                            <button className="btn-icon-action danger" onClick={() => handleDeleteBarrier(b._id)}>
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---------------- RM RECOMMENDATIONS VIEW ---------------- */}
        {viewMode === 'rm-recommendations' && selectedBowtie && (
          <div className="bowtie-barrier-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div className="bowtie-graph-nav-tabs">
                <button className="bowtie-nav-tab" onClick={() => setViewMode('graph')}>📈 Visual Graph</button>
                <button className="bowtie-nav-tab" onClick={() => setViewMode('cause-barriers')}>⚡ Cause Barriers</button>
                <button className="bowtie-nav-tab" onClick={() => setViewMode('consequence-barriers')}>🛡️ Consequence Barriers</button>
                <button className="bowtie-nav-tab active">📋 RM Recommendations</button>
              </div>
              <button className="btn-bowtie-success" onClick={handleSaveRecommendations}>
                💾 Save Recommendations
              </button>
            </div>

            <div className="bowtie-table-card" style={{ margin: 0 }}>
              <table className="bowtie-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Event Name</th>
                    <th>Recommendation</th>
                    <th>Action By</th>
                    <th>Target Date</th>
                    <th>Status</th>
                    <th>Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {recommendationsList.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        No recommendations recorded for this BowTie yet. Add recommendations in the Cause or Consequence barrier forms.
                      </td>
                    </tr>
                  ) : (
                    recommendationsList.map((rec, idx) => (
                      <tr key={idx}>
                        <td>
                          <span className={`bowtie-count-chip ${rec.barrier_type === 'cause' ? 'threat' : 'cons'}`}>
                            {rec.barrier_type === 'cause' ? 'Cause Barrier' : 'Consequence Barrier'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{rec.event_name}</td>
                        <td style={{ maxWidth: '280px' }}>{rec.recommendation}</td>
                        <td>
                          <input 
                            type="text" 
                            className="form-input-styled" 
                            style={{ margin: 0, padding: '6px 10px' }}
                            value={rec.action_by}
                            onChange={(e) => {
                              const val = e.target.value;
                              setRecommendationsList(prev => {
                                const arr = [...prev];
                                arr[idx].action_by = val;
                                return arr;
                              });
                            }}
                          />
                        </td>
                        <td>
                          <input 
                            type="date" 
                            className="form-input-styled" 
                            style={{ margin: 0, padding: '6px 10px' }}
                            value={rec.target_completion}
                            onChange={(e) => {
                              const val = e.target.value;
                              setRecommendationsList(prev => {
                                const arr = [...prev];
                                arr[idx].target_completion = val;
                                return arr;
                              });
                            }}
                          />
                        </td>
                        <td>
                          <select 
                            className="form-select-styled"
                            style={{ margin: 0, padding: '6px 10px' }}
                            value={rec.status}
                            onChange={(e) => {
                              const val = e.target.value;
                              setRecommendationsList(prev => {
                                const arr = [...prev];
                                arr[idx].status = val;
                                return arr;
                              });
                            }}
                          >
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Closed">Closed</option>
                          </select>
                        </td>
                        <td>
                          <input 
                            type="text" 
                            className="form-input-styled" 
                            style={{ margin: 0, padding: '6px 10px' }}
                            value={rec.remark}
                            placeholder="Add remark..."
                            onChange={(e) => {
                              const val = e.target.value;
                              setRecommendationsList(prev => {
                                const arr = [...prev];
                                arr[idx].remark = val;
                                return arr;
                              });
                            }}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---------------- NEW BOWTIE MODAL ---------------- */}
        {isNewModalOpen && (
          <div className="bowtie-modal-overlay" onClick={() => setIsNewModalOpen(false)}>
            <div className="bowtie-modal-content" onClick={(e) => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 16px 0', color: '#1e3a8a', fontSize: '20px' }}>
                Create New BowTie Analysis
              </h3>

              {/* Prefill from PHA Scenario Option */}
              {studyScenarios.length > 0 && (
                <div style={{ marginBottom: '18px', padding: '12px 14px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                  <label className="form-label-styled" style={{ color: '#1d4ed8' }}>
                    🔗 Auto-populate from Study Scenario (Optional)
                  </label>
                  <select 
                    className="form-select-styled" 
                    style={{ marginBottom: 0 }}
                    value={newBowtieData.scenarioId}
                    onChange={(e) => handleScenarioSelect(e.target.value)}
                  >
                    <option value="">-- Select a PHA Scenario or enter manually below --</option>
                    {studyScenarios.map(sc => (
                      <option key={sc._id} value={sc._id}>
                        {sc.deviationId?.deviationAuto || 'Deviation'} | Cause: {sc.causeId?.description?.slice(0, 40) || 'N/A'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <form onSubmit={handleCreateBowtie}>
                <label className="form-label-styled">Top Event Name *</label>
                <input 
                  type="text" 
                  className="form-input-styled" 
                  placeholder="e.g. Loss of Containment / Reactor Overpressure"
                  value={newBowtieData.eventName}
                  onChange={(e) => setNewBowtieData(prev => ({ ...prev, eventName: e.target.value }))}
                  required 
                />

                <div className="form-row-2">
                  <div>
                    <label className="form-label-styled">Section / Unit</label>
                    <input 
                      type="text" 
                      className="form-input-styled" 
                      placeholder="e.g. Section 1, Reactor Area"
                      value={newBowtieData.section}
                      onChange={(e) => setNewBowtieData(prev => ({ ...prev, section: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="form-label-styled">Initial Risk Rating</label>
                    <input 
                      type="number" 
                      className="form-input-styled" 
                      value={newBowtieData.riskRating}
                      onChange={(e) => setNewBowtieData(prev => ({ ...prev, riskRating: e.target.value }))}
                    />
                  </div>
                </div>

                <label className="form-label-styled">Hazard Description</label>
                <textarea 
                  className="form-textarea-styled" 
                  rows="3"
                  placeholder="Describe the major hazard scenario..."
                  value={newBowtieData.hazardDescription}
                  onChange={(e) => setNewBowtieData(prev => ({ ...prev, hazardDescription: e.target.value }))}
                ></textarea>

                <div className="bowtie-modal-footer">
                  <button 
                    type="button" 
                    className="btn-bowtie-secondary" 
                    onClick={() => setIsNewModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn-bowtie-primary"
                  >
                    Create & View Graph
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ---------------- BARRIER ADD/EDIT MODAL ---------------- */}
        {isBarrierModalOpen && (
          <div className="bowtie-modal-overlay" onClick={() => setIsBarrierModalOpen(false)}>
            <div className="bowtie-modal-content" style={{ width: '700px' }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 16px 0', color: '#ea580c', fontSize: '20px' }}>
                {editingBarrierId ? 'Edit Barrier' : `Add ${barrierForm.barrier_type === 'cause' ? 'Cause' : 'Consequence'} Barrier`}
              </h3>

              <form onSubmit={handleSaveBarrier}>
                <div className="form-row-2">
                  <div>
                    <label className="form-label-styled">Barrier Type</label>
                    <select 
                      className="form-select-styled"
                      value={barrierForm.barrier_type}
                      onChange={(e) => setBarrierForm(prev => ({ ...prev, barrier_type: e.target.value }))}
                    >
                      <option value="cause">Cause Barrier (Threat)</option>
                      <option value="consequence">Consequence Barrier (Mitigation)</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label-styled">
                      {barrierForm.barrier_type === 'cause' ? 'Threat / Cause Name' : 'Consequence Name'}
                    </label>
                    <input 
                      type="text" 
                      className="form-input-styled" 
                      placeholder={barrierForm.barrier_type === 'cause' ? "e.g. Pump Failure, Corrosion" : "e.g. Environmental Release, Toxic Cloud"}
                      value={barrierForm.threat_or_consequence_name}
                      onChange={(e) => setBarrierForm(prev => ({ ...prev, threat_or_consequence_name: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Dynamic PB Sub-table */}
                <div className="barrier-subtable-box">
                  <div className="barrier-subtable-header">
                    <span>🛡️ Barrier Elements</span>
                    <button type="button" className="btn-add-pb-row" onClick={addPbRow}>
                      + Add Row
                    </button>
                  </div>
                  <table className="barrier-subtable">
                    <thead>
                      <tr>
                        <th>Preventive / Mitigative Barrier (PB)</th>
                        <th>PB Tag No</th>
                        <th>Barrier Owner</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {barrierForm.pb.map((_, i) => (
                        <tr key={i}>
                          <td>
                            <input 
                              type="text" 
                              className="form-input-styled" 
                              style={{ margin: 0, padding: '6px 8px' }}
                              placeholder="Barrier Name..."
                              value={barrierForm.pb[i] || ''}
                              onChange={(e) => updatePbField(i, 'pb', e.target.value)}
                            />
                          </td>
                          <td>
                            <input 
                              type="text" 
                              className="form-input-styled" 
                              style={{ margin: 0, padding: '6px 8px' }}
                              placeholder="Tag No"
                              value={barrierForm.pb_tag_no[i] || ''}
                              onChange={(e) => updatePbField(i, 'pb_tag_no', e.target.value)}
                            />
                          </td>
                          <td>
                            <input 
                              type="text" 
                              className="form-input-styled" 
                              style={{ margin: 0, padding: '6px 8px' }}
                              placeholder="Owner"
                              value={barrierForm.barrier_owner[i] || ''}
                              onChange={(e) => updatePbField(i, 'barrier_owner', e.target.value)}
                            />
                          </td>
                          <td>
                            {barrierForm.pb.length > 1 && (
                              <button 
                                type="button" 
                                className="btn-icon-action danger"
                                onClick={() => removePbRow(i)}
                              >
                                ✕
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Escalation Control Fields */}
                <div className="form-row-2">
                  <div>
                    <label className="form-label-styled">Escalation Factor</label>
                    <input 
                      type="text" 
                      className="form-input-styled" 
                      placeholder="e.g. Power Outage, Operator Error"
                      value={barrierForm.escalation_factor}
                      onChange={(e) => setBarrierForm(prev => ({ ...prev, escalation_factor: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="form-label-styled">Escalation Control</label>
                    <input 
                      type="text" 
                      className="form-input-styled" 
                      placeholder="e.g. UPS System, Interlocks"
                      value={barrierForm.escalation_control}
                      onChange={(e) => setBarrierForm(prev => ({ ...prev, escalation_control: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div>
                    <label className="form-label-styled">Available / New</label>
                    <select 
                      className="form-select-styled"
                      value={barrierForm.available_new}
                      onChange={(e) => setBarrierForm(prev => ({ ...prev, available_new: e.target.value }))}
                    >
                      <option value="Available">Available</option>
                      <option value="New">New</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label-styled">Type</label>
                    <select 
                      className="form-select-styled"
                      value={barrierForm.type}
                      onChange={(e) => setBarrierForm(prev => ({ ...prev, type: e.target.value }))}
                    >
                      <option value="Engg">Engineering (Engg)</option>
                      <option value="Adm">Administrative (Adm)</option>
                    </select>
                  </div>
                </div>

                {/* Risk Ratings */}
                <div className="form-row-3">
                  <div>
                    <label className="form-label-styled">C (Consequence)</label>
                    <input 
                      type="number" 
                      className="form-input-styled" 
                      value={barrierForm.c}
                      onChange={(e) => setBarrierForm(prev => ({ ...prev, c: e.target.value, r: Number(e.target.value) * Number(prev.p) }))}
                    />
                  </div>
                  <div>
                    <label className="form-label-styled">P (Probability)</label>
                    <input 
                      type="number" 
                      className="form-input-styled" 
                      value={barrierForm.p}
                      onChange={(e) => setBarrierForm(prev => ({ ...prev, p: e.target.value, r: Number(prev.c) * Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="form-label-styled">R (Risk Rating)</label>
                    <input 
                      type="number" 
                      className="form-input-styled" 
                      style={{ background: '#f1f5f9', cursor: 'not-allowed' }}
                      value={Number(barrierForm.c) * Number(barrierForm.p)}
                      readOnly 
                    />
                  </div>
                </div>

                {/* Recommendation */}
                <label className="form-label-styled">Recommendation for new barrier</label>
                <textarea 
                  className="form-textarea-styled" 
                  rows="2"
                  placeholder="Enter recommendation..."
                  value={barrierForm.recommendation}
                  onChange={(e) => setBarrierForm(prev => ({ ...prev, recommendation: e.target.value }))}
                ></textarea>

                <div className="form-row-3">
                  <div>
                    <label className="form-label-styled">C (Rec)</label>
                    <input 
                      type="number" 
                      className="form-input-styled" 
                      value={barrierForm.c_rec}
                      onChange={(e) => setBarrierForm(prev => ({ ...prev, c_rec: e.target.value, r_rec: Number(e.target.value) * Number(prev.p_rec) }))}
                    />
                  </div>
                  <div>
                    <label className="form-label-styled">P (Rec)</label>
                    <input 
                      type="number" 
                      className="form-input-styled" 
                      value={barrierForm.p_rec}
                      onChange={(e) => setBarrierForm(prev => ({ ...prev, p_rec: e.target.value, r_rec: Number(prev.c_rec) * Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="form-label-styled">R (Rec)</label>
                    <input 
                      type="number" 
                      className="form-input-styled" 
                      style={{ background: '#f1f5f9', cursor: 'not-allowed' }}
                      value={Number(barrierForm.c_rec) * Number(barrierForm.p_rec)}
                      readOnly 
                    />
                  </div>
                </div>

                <div className="bowtie-modal-footer">
                  <button 
                    type="button" 
                    className="btn-bowtie-secondary" 
                    onClick={() => setIsBarrierModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn-bowtie-primary"
                  >
                    {editingBarrierId ? 'Update Barrier' : 'Save Barrier'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </StudyLayout>
  );
};

export default BowTieAnalysis;
