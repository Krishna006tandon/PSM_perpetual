import React, { useMemo, useRef, useState } from 'react';

const CARD_WIDTH = 276;
const MARGIN_X = 48;
const MARGIN_TOP = 104; // Space for embedded title banner & legend in exported SVG/PNG
const MARGIN_BOTTOM = 48;
const H_GAP = 34;
const V_GAP = 64;
const LR_LEVEL_GAP = 86;
const LR_SIBLING_GAP = 26;

const wrapText = (text = '', maxChars = 34) => {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return ['(No statement)'];

  const lines = [];
  let current = '';

  words.forEach((word) => {
    if (word.length > maxChars) {
      if (current) {
        lines.push(current);
        current = '';
      }
      for (let i = 0; i < word.length; i += maxChars) {
        lines.push(word.slice(i, i + maxChars));
      }
      return;
    }

    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  });

  if (current) lines.push(current);
  return lines;
};

const getCardColors = (node) => {
  const isAnchor = !node.parentId || node.whyLevel === 0;
  const isRC = node.isRootCause || (node.rootCauseType && node.rootCauseType !== 'None');
  const status = node.status || 'Exploring';

  if (isAnchor) {
    return {
      fill: '#eff6ff',
      stroke: '#1e3a8a',
      accent: '#1e3a8a',
      badgeBg: '#1e3a8a',
      badgeText: '#ffffff',
      dashed: false
    };
  }
  if (isRC) {
    return {
      fill: '#fef2f2',
      stroke: '#dc2626',
      accent: '#dc2626',
      badgeBg: '#dc2626',
      badgeText: '#ffffff',
      dashed: false
    };
  }
  if (status === 'Disproven') {
    return {
      fill: '#f8fafc',
      stroke: '#94a3b8',
      accent: '#64748b',
      badgeBg: '#cbd5e1',
      badgeText: '#334155',
      dashed: true
    };
  }
  if (status === 'Validated') {
    return {
      fill: '#f0fdf4',
      stroke: '#16a34a',
      accent: '#15803d',
      badgeBg: '#16a34a',
      badgeText: '#ffffff',
      dashed: false
    };
  }
  if (status === 'Inconclusive') {
    return {
      fill: '#faf5ff',
      stroke: '#7c3aed',
      accent: '#6d28d9',
      badgeBg: '#7c3aed',
      badgeText: '#ffffff',
      dashed: false
    };
  }
  // Exploring (default)
  return {
    fill: '#ffffff',
    stroke: '#f59e0b',
    accent: '#b45309',
    badgeBg: '#fef3c7',
    badgeText: '#92400e',
    dashed: false
  };
};

const getStatusBadgeColors = (status) => {
  switch (status) {
    case 'Validated':
      return { bg: '#dcfce7', text: '#166534' };
    case 'Disproven':
      return { bg: '#e2e8f0', text: '#475569' };
    case 'Inconclusive':
      return { bg: '#ede9fe', text: '#5b21b6' };
    default:
      return { bg: '#fef3c7', text: '#92400e' };
  }
};

export default function WhyWhyTreeDiagram({
  incident,
  nodes = [],
  onSelectNodeAndEdit
}) {
  const svgRef = useRef(null);
  const [orientation, setOrientation] = useState('TB'); // 'TB' (Vertical) | 'LR' (Horizontal)
  const [zoom, setZoom] = useState(1);
  const [exporting, setExporting] = useState(false);

  const layout = useMemo(() => {
    if (!nodes || nodes.length === 0) {
      return { positionedNodes: [], edges: [], width: 820, height: 320 };
    }

    const byId = new Map();
    const childrenByParent = new Map();

    nodes.forEach((n) => {
      const statementLines = wrapText(n.statement, 33);
      const isRC = n.isRootCause || (n.rootCauseType && n.rootCauseType !== 'None');
      const hasFooterTag = Boolean(isRC || n.api754Category);
      const cardHeight = Math.max(
        96,
        42 + statementLines.length * 17 + (hasFooterTag ? 28 : 10)
      );

      byId.set(String(n._id), {
        raw: n,
        id: String(n._id),
        statementLines,
        width: CARD_WIDTH,
        height: cardHeight,
        level: n.whyLevel || 0
      });

      const pKey = n.parentId ? String(n.parentId) : 'ROOT';
      if (!childrenByParent.has(pKey)) childrenByParent.set(pKey, []);
      childrenByParent.get(pKey).push(String(n._id));
    });

    const roots = childrenByParent.get('ROOT') || [];
    if (roots.length === 0) {
      return { positionedNodes: [], edges: [], width: 820, height: 320 };
    }

    const positioned = [];
    const edges = [];

    if (orientation === 'TB') {
      // Compute max height per level so rows never collide
      const maxHByLevel = new Map();
      byId.forEach((item) => {
        const prev = maxHByLevel.get(item.level) || 0;
        if (item.height > prev) maxHByLevel.set(item.level, item.height);
      });

      const levelY = new Map();
      let accY = MARGIN_TOP;
      const maxLevel = Math.max(...Array.from(maxHByLevel.keys()));
      for (let lvl = 0; lvl <= maxLevel; lvl++) {
        levelY.set(lvl, accY);
        accY += (maxHByLevel.get(lvl) || 100) + V_GAP;
      }

      // Compute subtree widths bottom-up
      const spanCache = new Map();
      const computeSpan = (id, visited = new Set()) => {
        if (spanCache.has(id)) return spanCache.get(id);
        if (visited.has(id)) return CARD_WIDTH;
        const nextVisited = new Set(visited);
        nextVisited.add(id);

        const kids = childrenByParent.get(id) || [];
        if (kids.length === 0) {
          spanCache.set(id, CARD_WIDTH);
          return CARD_WIDTH;
        }
        const totalKidsWidth =
          kids.reduce((sum, kidId) => sum + computeSpan(kidId, nextVisited), 0) +
          (kids.length - 1) * H_GAP;
        const span = Math.max(CARD_WIDTH, totalKidsWidth);
        spanCache.set(id, span);
        return span;
      };

      const placeTB = (id, startX, visited = new Set()) => {
        if (visited.has(id)) return;
        const nextVisited = new Set(visited);
        nextVisited.add(id);

        const node = byId.get(id);
        const span = computeSpan(id);
        const kids = childrenByParent.get(id) || [];
        const y = levelY.get(node.level) ?? MARGIN_TOP;

        let nodeX;
        if (kids.length === 0) {
          nodeX = startX + (span - node.width) / 2;
        } else {
          const totalKidsWidth =
            kids.reduce((sum, kidId) => sum + computeSpan(kidId), 0) +
            (kids.length - 1) * H_GAP;
          let cursor = startX + (span - totalKidsWidth) / 2;
          const childCenters = [];

          kids.forEach((kidId) => {
            const kidSpan = computeSpan(kidId);
            const kidPos = placeTB(kidId, cursor, nextVisited);
            if (kidPos) {
              childCenters.push(kidPos.x + kidPos.width / 2);
              edges.push({
                id: `${id}->${kidId}`,
                from: null, // filled once parent x known
                fromId: id,
                toId: kidId,
                toNode: kidPos
              });
            }
            cursor += kidSpan + H_GAP;
          });

          const firstCenter = childCenters[0];
          const lastCenter = childCenters[childCenters.length - 1];
          nodeX = (firstCenter + lastCenter) / 2 - node.width / 2;
        }

        const placed = { ...node, x: nodeX, y };
        positioned.push(placed);
        return placed;
      };

      let rootCursor = MARGIN_X;
      roots.forEach((rId) => {
        const span = computeSpan(rId);
        placeTB(rId, rootCursor);
        rootCursor += span + H_GAP;
      });

      const placedMap = new Map(positioned.map((p) => [p.id, p]));
      edges.forEach((e) => {
        e.fromNode = placedMap.get(e.fromId);
      });

      const contentRight = Math.max(...positioned.map((p) => p.x + p.width), 760);
      const contentBottom = Math.max(...positioned.map((p) => p.y + p.height), 260);
      return {
        positionedNodes: positioned,
        edges,
        width: contentRight + MARGIN_X,
        height: contentBottom + MARGIN_BOTTOM
      };
    }

    // Horizontal LR layout
    const spanCacheLR = new Map();
    const computeSpanLR = (id, visited = new Set()) => {
      if (spanCacheLR.has(id)) return spanCacheLR.get(id);
      if (visited.has(id)) return 100;
      const nextVisited = new Set(visited);
      nextVisited.add(id);

      const node = byId.get(id);
      const kids = childrenByParent.get(id) || [];
      if (kids.length === 0) {
        spanCacheLR.set(id, node.height);
        return node.height;
      }
      const totalKidsHeight =
        kids.reduce((sum, kidId) => sum + computeSpanLR(kidId, nextVisited), 0) +
        (kids.length - 1) * LR_SIBLING_GAP;
      const span = Math.max(node.height, totalKidsHeight);
      spanCacheLR.set(id, span);
      return span;
    };

    const placeLR = (id, startY, visited = new Set()) => {
      if (visited.has(id)) return;
      const nextVisited = new Set(visited);
      nextVisited.add(id);

      const node = byId.get(id);
      const span = computeSpanLR(id);
      const kids = childrenByParent.get(id) || [];
      const x = MARGIN_X + node.level * (CARD_WIDTH + LR_LEVEL_GAP);

      let nodeY;
      if (kids.length === 0) {
        nodeY = startY + (span - node.height) / 2;
      } else {
        const totalKidsHeight =
          kids.reduce((sum, kidId) => sum + computeSpanLR(kidId), 0) +
          (kids.length - 1) * LR_SIBLING_GAP;
        let cursor = startY + (span - totalKidsHeight) / 2;
        const childCenters = [];

        kids.forEach((kidId) => {
          const kidSpan = computeSpanLR(kidId);
          const kidPos = placeLR(kidId, cursor, nextVisited);
          if (kidPos) {
            childCenters.push(kidPos.y + kidPos.height / 2);
            edges.push({
              id: `${id}->${kidId}`,
              fromId: id,
              toId: kidId,
              toNode: kidPos
            });
          }
          cursor += kidSpan + LR_SIBLING_GAP;
        });

        const firstCenter = childCenters[0];
        const lastCenter = childCenters[childCenters.length - 1];
        nodeY = (firstCenter + lastCenter) / 2 - node.height / 2;
      }

      const placed = { ...node, x, y: nodeY };
      positioned.push(placed);
      return placed;
    };

    let rootCursorY = MARGIN_TOP;
    roots.forEach((rId) => {
      const span = computeSpanLR(rId);
      placeLR(rId, rootCursorY);
      rootCursorY += span + LR_SIBLING_GAP;
    });

    const placedMap = new Map(positioned.map((p) => [p.id, p]));
    edges.forEach((e) => {
      e.fromNode = placedMap.get(e.fromId);
    });

    const contentRight = Math.max(...positioned.map((p) => p.x + p.width), 760);
    const contentBottom = Math.max(...positioned.map((p) => p.y + p.height), 260);
    return {
      positionedNodes: positioned,
      edges,
      width: contentRight + MARGIN_X,
      height: contentBottom + MARGIN_BOTTOM
    };
  }, [nodes, orientation]);

  const filePrefix = `${incident?.incidentNumber || 'Incident'}_WhyWhy_Diagram`;

  const serializeSvg = () => {
    if (!svgRef.current) return null;
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgRef.current);
    if (!source.match(/^<svg[^>]+xmlns=/)) {
      source = source.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    return source;
  };

  const handleDownloadSvg = () => {
    const svgString = serializeSvg();
    if (!svgString) return;
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filePrefix}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPng = () => {
    const svgString = serializeSvg();
    if (!svgString) return;
    setExporting(true);

    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();

    img.onload = () => {
      const scale = 2; // 2x high-DPI crisp PNG
      const canvas = document.createElement('canvas');
      canvas.width = layout.width * scale;
      canvas.height = layout.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      canvas.toBlob((pngBlob) => {
        if (!pngBlob) {
          setExporting(false);
          return;
        }
        const pngUrl = URL.createObjectURL(pngBlob);
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `${filePrefix}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(pngUrl);
        setExporting(false);
      }, 'image/png');
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      setExporting(false);
    };

    img.src = url;
  };

  const handlePrintDiagram = () => {
    const svgString = serializeSvg();
    if (!svgString) return;
    const win = window.open('', '_blank', 'width=1100,height=800');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${filePrefix}</title>
          <style>
            body { margin: 20px; font-family: "Segoe UI", Arial, sans-serif; background: #ffffff; }
            svg { max-width: 100%; height: auto; display: block; margin: 0 auto; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          ${svgString}
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const { positionedNodes, edges } = layout;
  const classificationCat =
    incident?.api754Classification?.category || incident?.api754Classification?.tier || 'Near Miss';
  const safeTitle = String(incident?.title || 'Incident Investigation').slice(0, 95);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: '#f1f5f9' }}>
      {/* Diagram Controls Toolbar */}
      <div
        style={{
          padding: '10px 22px',
          background: '#ffffff',
          borderBottom: '1px solid #cbd5e1',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#475569' }}>Layout:</span>
          <button
            type="button"
            className={`rca-filter-pill ${orientation === 'TB' ? 'active' : ''}`}
            onClick={() => setOrientation('TB')}
          >
            ↓ Vertical Tree
          </button>
          <button
            type="button"
            className={`rca-filter-pill ${orientation === 'LR' ? 'active' : ''}`}
            onClick={() => setOrientation('LR')}
          >
            → Horizontal Flow
          </button>

          <span style={{ marginLeft: '8px', fontSize: '0.78rem', fontWeight: '800', color: '#475569' }}>
            Zoom:
          </span>
          <button
            type="button"
            className="rca-mini-btn"
            onClick={() => setZoom((z) => Math.max(0.45, Number((z - 0.15).toFixed(2))))}
          >
            −
          </button>
          <span style={{ fontSize: '0.78rem', fontWeight: '700', minWidth: '42px', textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            className="rca-mini-btn"
            onClick={() => setZoom((z) => Math.min(1.8, Number((z + 0.15).toFixed(2))))}
          >
            +
          </button>
          <button
            type="button"
            className="rca-mini-btn"
            onClick={() => setZoom(1)}
          >
            Reset
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="rca-btn-secondary"
            onClick={handleDownloadSvg}
          >
            ⬇ SVG Vector
          </button>
          <button
            type="button"
            className="rca-btn-save"
            onClick={handleDownloadPng}
            disabled={exporting}
          >
            {exporting ? 'Generating PNG...' : '🖼️ Download PNG Diagram'}
          </button>
          <button
            type="button"
            className="rca-btn-secondary"
            onClick={handlePrintDiagram}
          >
            🖨️ Print / Save PDF
          </button>
        </div>
      </div>

      {/* Scrollable Vector Diagram Canvas */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '20px',
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      >
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(15, 23, 42, 0.12)',
            border: '1px solid #cbd5e1',
            display: 'inline-block',
            margin: '0 auto'
          }}
        >
          <svg
            ref={svgRef}
            width={layout.width * zoom}
            height={layout.height * zoom}
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            style={{ display: 'block', fontFamily: 'Segoe UI, Arial, sans-serif' }}
          >
            <defs>
              <marker
                id="rca-arrowhead"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#475569" />
              </marker>
              <marker
                id="rca-arrowhead-disproven"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8" />
              </marker>
            </defs>

            {/* White Export Background */}
            <rect x="0" y="0" width={layout.width} height={layout.height} fill="#ffffff" rx="12" />

            {/* Embedded Report Header */}
            <rect x="20" y="16" width={layout.width - 40} height="68" rx="10" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
            <text x="36" y="40" fontSize="15" fontWeight="800" fill="#0f172a">
              {`${incident?.incidentNumber || 'INC'} — Why-Why Root Cause Analysis Diagram`}
            </text>
            <text x="36" y="60" fontSize="12" fontWeight="600" fill="#475569">
              {`${safeTitle}${incident?.title?.length > 95 ? '...' : ''}   |   Zone: ${incident?.plantZone || 'N/A'}   |   ${classificationCat}`}
            </text>

            {/* Inline Legend (Top Right inside header when wide enough, else compact) */}
            {layout.width >= 780 && (
              <g transform={`translate(${layout.width - 425}, 64)`}>
                <circle cx="0" cy="-4" r="5" fill="#1e3a8a" />
                <text x="9" y="0" fontSize="10.5" fontWeight="700" fill="#334155">Anchor</text>

                <circle cx="65" cy="-4" r="5" fill="#16a34a" />
                <text x="74" y="0" fontSize="10.5" fontWeight="700" fill="#334155">Validated</text>

                <circle cx="142" cy="-4" r="5" fill="#f59e0b" />
                <text x="151" y="0" fontSize="10.5" fontWeight="700" fill="#334155">Exploring</text>

                <circle cx="220" cy="-4" r="5" fill="#dc2626" />
                <text x="229" y="0" fontSize="10.5" fontWeight="700" fill="#991b1b">Root Cause</text>

                <circle cx="310" cy="-4" r="5" fill="#94a3b8" />
                <text x="319" y="0" fontSize="10.5" fontWeight="700" fill="#64748b">Disproven</text>
              </g>
            )}

            {/* Elbow Connector Edges */}
            {edges.map((edge) => {
              if (!edge.fromNode || !edge.toNode) return null;
              const isDisproven = edge.toNode.raw?.status === 'Disproven';
              const strokeColor = isDisproven ? '#94a3b8' : '#475569';
              const marker = isDisproven ? 'url(#rca-arrowhead-disproven)' : 'url(#rca-arrowhead)';

              if (orientation === 'TB') {
                const x1 = edge.fromNode.x + edge.fromNode.width / 2;
                const y1 = edge.fromNode.y + edge.fromNode.height;
                const x2 = edge.toNode.x + edge.toNode.width / 2;
                const y2 = edge.toNode.y - 4;
                const midY = y1 + (y2 - y1) / 2;
                const pathD = `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;

                return (
                  <g key={edge.id}>
                    <path
                      d={pathD}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth="2"
                      strokeDasharray={isDisproven ? '6 4' : undefined}
                      markerEnd={marker}
                    />
                    <rect
                      x={x2 - 22}
                      y={midY + (y2 - midY) / 2 - 10}
                      width="44"
                      height="17"
                      rx="8.5"
                      fill="#e2e8f0"
                    />
                    <text
                      x={x2}
                      y={midY + (y2 - midY) / 2 + 2}
                      textAnchor="middle"
                      fontSize="9.5"
                      fontWeight="800"
                      fill="#334155"
                    >
                      WHY?
                    </text>
                  </g>
                );
              }

              // Horizontal LR elbow
              const x1 = edge.fromNode.x + edge.fromNode.width;
              const y1 = edge.fromNode.y + edge.fromNode.height / 2;
              const x2 = edge.toNode.x - 4;
              const y2 = edge.toNode.y + edge.toNode.height / 2;
              const midX = x1 + (x2 - x1) / 2;
              const pathD = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;

              return (
                <g key={edge.id}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="2"
                    strokeDasharray={isDisproven ? '6 4' : undefined}
                    markerEnd={marker}
                  />
                  <rect
                    x={midX + (x2 - midX) / 2 - 20}
                    y={y2 - 9}
                    width="40"
                    height="17"
                    rx="8.5"
                    fill="#e2e8f0"
                  />
                  <text
                    x={midX + (x2 - midX) / 2}
                    y={y2 + 3}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="800"
                    fill="#334155"
                  >
                    WHY?
                  </text>
                </g>
              );
            })}

            {/* Vector Node Cards */}
            {positionedNodes.map((node) => {
              const raw = node.raw;
              const colors = getCardColors(raw);
              const isAnchor = !raw.parentId || raw.whyLevel === 0;
              const isRC = raw.isRootCause || (raw.rootCauseType && raw.rootCauseType !== 'None');
              const statusBadge = getStatusBadgeColors(raw.status);
              const footerY = node.height - 20;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  style={{ cursor: onSelectNodeAndEdit ? 'pointer' : 'default' }}
                  onClick={() => onSelectNodeAndEdit && onSelectNodeAndEdit(raw._id)}
                >
                  {/* Card Box */}
                  <rect
                    x="0"
                    y="0"
                    width={node.width}
                    height={node.height}
                    rx="11"
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth={isRC || isAnchor ? '2.2' : '1.6'}
                    strokeDasharray={colors.dashed ? '6 4' : undefined}
                  />

                  {/* Top Accent Strip */}
                  <rect
                    x="0"
                    y="0"
                    width={node.width}
                    height="5"
                    rx="3"
                    fill={colors.accent}
                  />

                  {/* Level Pill */}
                  <rect x="12" y="13" width={isAnchor ? 94 : 52} height="20" rx="6" fill={colors.badgeBg} />
                  <text
                    x={12 + (isAnchor ? 47 : 26)}
                    y="27"
                    textAnchor="middle"
                    fontSize="10.5"
                    fontWeight="800"
                    fill={colors.badgeText}
                  >
                    {isAnchor ? 'PROBLEM ANCHOR' : `WHY ${raw.whyLevel}`}
                  </text>

                  {/* Status Pill */}
                  <rect x={node.width - 88} y="13" width="76" height="20" rx="10" fill={statusBadge.bg} />
                  <text
                    x={node.width - 50}
                    y="27"
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="700"
                    fill={statusBadge.text}
                  >
                    {raw.status || 'Exploring'}
                  </text>

                  {/* Wrapped Cause Statement */}
                  <text x="12" y="51" fontSize="12.5" fontWeight="600" fill="#0f172a">
                    {node.statementLines.map((line, idx) => (
                      <tspan key={idx} x="12" dy={idx === 0 ? 0 : 17}>
                        {line}
                      </tspan>
                    ))}
                  </text>

                  {/* Optional Root Cause / API 754 Footer */}
                  {isRC && (
                    <text x="12" y={footerY + 6} fontSize="10.5" fontWeight="800" fill="#991b1b">
                      {`🎯 ${raw.rootCauseType}${raw.api754Category ? `  •  ${raw.api754Category}` : ''}`.slice(0, 42)}
                    </text>
                  )}
                  {!isRC && raw.api754Category && (
                    <text x="12" y={footerY + 6} fontSize="10.5" fontWeight="700" fill="#1d4ed8">
                      {`🏷️ ${raw.api754Category}`.slice(0, 40)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
