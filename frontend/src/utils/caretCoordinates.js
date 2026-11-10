import { checkText } from './spellCheckEngine';

const MIRROR_ID = 'psm-spellcheck-mirror-measurer';

const COPIED_STYLE_PROPS = [
  'direction',
  'boxSizing',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'fontVariant',
  'fontStretch',
  'letterSpacing',
  'wordSpacing',
  'lineHeight',
  'textTransform',
  'textIndent',
  'textAlign',
  'tabSize',
  'wordBreak',
  'overflowWrap',
  'wordWrap',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderTopStyle',
  'borderRightStyle',
  'borderBottomStyle',
  'borderLeftStyle'
];

function getMirrorElement() {
  if (typeof document === 'undefined') return null;
  let mirror = document.getElementById(MIRROR_ID);
  if (!mirror) {
    mirror = document.createElement('div');
    mirror.id = MIRROR_ID;
    mirror.setAttribute('aria-hidden', 'true');
    mirror.style.position = 'fixed';
    mirror.style.top = '-99999px';
    mirror.style.left = '-99999px';
    mirror.style.visibility = 'hidden';
    mirror.style.pointerEvents = 'none';
    mirror.style.zIndex = '-1';
    mirror.style.overflow = 'hidden';
    document.body.appendChild(mirror);
  }
  return mirror;
}

/**
 * Computes the visible clipping box for an editable element by intersecting
 * its content box with scrollable ancestors, sticky table headers, and viewport.
 */
export function getVisibleClipRect(el) {
  if (!el || typeof window === 'undefined') return null;
  const elRect = el.getBoundingClientRect();
  if (elRect.width <= 0 || elRect.height <= 0) return null;

  const cs = window.getComputedStyle(el);
  const bLeft = parseFloat(cs.borderLeftWidth) || 0;
  const bRight = parseFloat(cs.borderRightWidth) || 0;
  const bTop = parseFloat(cs.borderTopWidth) || 0;
  const bBottom = parseFloat(cs.borderBottomWidth) || 0;

  let left = elRect.left + bLeft;
  let right = elRect.right - bRight;
  let top = elRect.top + bTop;
  let bottom = elRect.bottom - bBottom;

  let inTbody = false;
  let parent = el.parentElement;

  while (parent && parent !== document.documentElement) {
    if (parent.tagName === 'TBODY') {
      inTbody = true;
    }

    if (parent.tagName === 'TABLE' && inTbody) {
      const thead = parent.querySelector('thead');
      if (thead) {
        const th = thead.querySelector('th');
        const thPos = th ? window.getComputedStyle(th).position : '';
        const theadPos = window.getComputedStyle(thead).position;
        if (thPos === 'sticky' || theadPos === 'sticky') {
          const theadRect = thead.getBoundingClientRect();
          if (theadRect.height > 0) {
            top = Math.max(top, theadRect.bottom);
          }
        }
      }
    }

    const pcs = window.getComputedStyle(parent);
    const overflowAll = `${pcs.overflow} ${pcs.overflowX} ${pcs.overflowY}`;
    if (/(auto|scroll|hidden|clip)/.test(overflowAll)) {
      const pRect = parent.getBoundingClientRect();
      left = Math.max(left, pRect.left);
      right = Math.min(right, pRect.right);
      top = Math.max(top, pRect.top);
      bottom = Math.min(bottom, pRect.bottom);
    }

    parent = parent.parentElement;
  }

  // Clamp to viewport
  left = Math.max(left, 0);
  top = Math.max(top, 0);
  right = Math.min(right, window.innerWidth);
  bottom = Math.min(bottom, window.innerHeight);

  if (right <= left || bottom <= top) return null;
  return { left, top, right, bottom };
}

/**
 * Computes viewport underline rectangles for misspelled words in an <input> or <textarea>.
 */
export function measureInputMisspellings(el, misspellings) {
  if (!el || !misspellings || misspellings.length === 0) return [];

  const clip = getVisibleClipRect(el);
  if (!clip) return [];

  const mirror = getMirrorElement();
  if (!mirror) return [];

  const value = el.value || '';
  if (!value) return [];

  const cs = window.getComputedStyle(el);
  const elRect = el.getBoundingClientRect();
  const isInput = el.tagName === 'INPUT';

  // Reset and copy styles
  mirror.textContent = '';
  COPIED_STYLE_PROPS.forEach((prop) => {
    mirror.style[prop] = cs[prop];
  });

  const bLeft = parseFloat(cs.borderLeftWidth) || 0;
  const bRight = parseFloat(cs.borderRightWidth) || 0;

  mirror.style.boxSizing = 'border-box';

  if (isInput) {
    mirror.style.width = `${elRect.width}px`;
    mirror.style.height = `${elRect.height}px`;
    mirror.style.whiteSpace = 'pre';
    mirror.style.display = 'flex';
    mirror.style.alignItems = 'center';
  } else {
    // Match exact clientWidth (excludes vertical scrollbar if present)
    mirror.style.width = `${el.clientWidth + bLeft + bRight}px`;
    mirror.style.height = 'auto';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.display = 'block';
    mirror.style.alignItems = '';
  }

  const container = isInput ? document.createElement('span') : mirror;
  if (isInput) {
    container.style.display = 'block';
    container.style.width = '100%';
    container.style.textAlign = cs.textAlign || 'left';
    container.style.whiteSpace = 'pre';
    mirror.appendChild(container);
  }

  let cursor = 0;
  const spans = [];

  for (let i = 0; i < misspellings.length; i++) {
    const m = misspellings[i];
    if (m.start > cursor) {
      container.appendChild(document.createTextNode(value.slice(cursor, m.start)));
    }
    const span = document.createElement('span');
    span.textContent = value.slice(m.start, m.end);
    container.appendChild(span);
    spans.push({ span, item: m });
    cursor = m.end;
  }

  if (cursor < value.length) {
    container.appendChild(document.createTextNode(value.slice(cursor)));
  }

  const mirrorRect = mirror.getBoundingClientRect();
  const scrollLeft = el.scrollLeft || 0;
  const scrollTop = el.scrollTop || 0;
  const results = [];

  for (const { span, item } of spans) {
    const rects = span.getClientRects();
    for (let rIdx = 0; rIdx < rects.length; rIdx++) {
      const r = rects[rIdx];
      if (r.width <= 0 || r.height <= 0) continue;

      const vLeft = elRect.left + (r.left - mirrorRect.left) - scrollLeft;
      const vTop = elRect.top + (r.top - mirrorRect.top) - scrollTop;
      const vRight = vLeft + r.width;
      const vBottom = vTop + r.height;

      const cLeft = Math.max(vLeft, clip.left);
      const cRight = Math.min(vRight, clip.right);

      if (cRight - cLeft < 2) continue;
      if (vBottom <= clip.top + 3 || vTop >= clip.bottom - 1) continue;

      const underlineY = Math.min(vBottom - 1, clip.bottom - 1);

      results.push({
        word: item.word,
        start: item.start,
        end: item.end,
        left: cLeft,
        top: underlineY,
        lineTop: Math.max(vTop, clip.top),
        lineHeight: r.height,
        width: cRight - cLeft
      });
    }
  }

  mirror.textContent = '';
  return results;
}

/**
 * Computes viewport underline rectangles for misspelled words in a contentEditable element.
 */
export function measureContentEditableMisspellings(el, options = {}) {
  if (!el || typeof document === 'undefined') return [];
  const clip = getVisibleClipRect(el);
  if (!clip) return [];

  const selection = window.getSelection();
  let activeNode = null;
  let activeOffset = null;
  if (
    options.skipWordTouchingCaret &&
    selection &&
    selection.rangeCount > 0 &&
    el.contains(selection.anchorNode)
  ) {
    activeNode = selection.anchorNode;
    activeOffset = selection.anchorOffset;
  }

  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
  const results = [];
  let textNode;

  while ((textNode = walker.nextNode())) {
    const txt = textNode.nodeValue;
    if (!txt || !txt.trim()) continue;

    const misspellings = checkText(txt, {
      caretPos: textNode === activeNode ? activeOffset : null,
      skipWordTouchingCaret: textNode === activeNode && options.skipWordTouchingCaret
    });

    for (const m of misspellings) {
      const range = document.createRange();
      range.setStart(textNode, m.start);
      range.setEnd(textNode, m.end);
      const rects = range.getClientRects();

      for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        if (r.width <= 0 || r.height <= 0) continue;

        const cLeft = Math.max(r.left, clip.left);
        const cRight = Math.min(r.right, clip.right);
        if (cRight - cLeft < 2) continue;
        if (r.bottom <= clip.top + 3 || r.top >= clip.bottom - 1) continue;

        results.push({
          isContentEditable: true,
          textNode,
          word: m.word,
          start: m.start,
          end: m.end,
          left: cLeft,
          top: Math.min(r.bottom - 1, clip.bottom - 1),
          lineTop: Math.max(r.top, clip.top),
          lineHeight: r.height,
          width: cRight - cLeft
        });
      }
    }
  }

  return results;
}
