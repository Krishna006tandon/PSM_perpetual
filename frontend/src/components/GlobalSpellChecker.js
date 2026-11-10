import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  initSpellChecker,
  isDictionaryReady,
  subscribeSpellChecker,
  getSpellCheckSettings,
  setAutoCorrectEnabled,
  checkText,
  getSuggestions,
  getAutoCorrection,
  addCustomWord,
  ignoreWord
} from '../utils/spellCheckEngine';
import {
  measureInputMisspellings,
  measureContentEditableMisspellings,
  getVisibleClipRect
} from '../utils/caretCoordinates';
import './GlobalSpellChecker.css';

const EXCLUDED_INPUT_TYPES = new Set([
  'password', 'email', 'number', 'date', 'time', 'datetime-local',
  'month', 'week', 'url', 'tel', 'hidden', 'checkbox', 'radio',
  'file', 'range', 'color', 'submit', 'button', 'reset', 'image', 'search'
]);

const NON_PROSE_PATTERN = /\b(email|password|passwd|otp|pin|phone|mobile|contact|fax|zip|postal|drawingid|revision|hyperlink|tagno|pb_tag|casnumber|casno|firnumber|projectnumber|search|filter|amount|price|cost|qty|quantity|tolerance|cell-score)\b/i;

function resolveEditableTarget(el) {
  if (!el || !el.isConnected) return null;
  if (el.isContentEditable) {
    return el.closest('[contenteditable="true"]') || el;
  }
  return el;
}

function isSpellCheckEligible(rawEl) {
  const el = resolveEditableTarget(rawEl);
  if (!el || !el.isConnected) return false;
  if (el.closest && (el.closest('.psm-spellcheck-layer') || el.closest('.psm-spell-popover') || el.closest('.psm-autocorrect-toast'))) {
    return false;
  }

  // Respect explicit opt-out
  if (el.getAttribute('data-spellcheck') === 'false' || el.getAttribute('data-no-spellcheck') === 'true') {
    return false;
  }
  if (el.closest && el.closest('[data-spellcheck="false"]')) {
    return false;
  }

  const isTextArea = el.tagName === 'TEXTAREA';
  const isInput = el.tagName === 'INPUT';
  const isEditable = el.isContentEditable;

  if (!isTextArea && !isInput && !isEditable) return false;
  if (el.disabled || el.readOnly) return false;

  if (isInput) {
    const type = (el.type || 'text').toLowerCase();
    if (EXCLUDED_INPUT_TYPES.has(type)) return false;

    const meta = [
      el.name || '',
      el.id || '',
      el.placeholder || '',
      el.className || '',
      el.getAttribute('aria-label') || ''
    ].join(' ');

    if (NON_PROSE_PATTERN.test(meta)) return false;
  }

  const rect = el.getBoundingClientRect();
  if (rect.width < 24 || rect.height < 14) return false;

  return true;
}

function suppressNativeSpellcheck(el) {
  if (!el || el.dataset.psmOrigSpellcheck !== undefined) return;
  const orig = el.getAttribute('spellcheck');
  el.dataset.psmOrigSpellcheck = orig === null ? '__unset__' : orig;
  el.spellcheck = false;
}

function restoreAllNativeSpellcheck() {
  if (typeof document === 'undefined') return;
  const modified = document.querySelectorAll('[data-psm-orig-spellcheck]');
  modified.forEach((el) => {
    const orig = el.dataset.psmOrigSpellcheck;
    if (orig === '__unset__') {
      el.removeAttribute('spellcheck');
    } else {
      el.setAttribute('spellcheck', orig);
    }
    delete el.dataset.psmOrigSpellcheck;
  });
}

function setElementValueReactSafe(el, newValue, caretPos) {
  if (!el) return;
  const proto = el.tagName === 'TEXTAREA'
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
  if (descriptor && descriptor.set) {
    descriptor.set.call(el, newValue);
  } else {
    el.value = newValue;
  }

  if (typeof caretPos === 'number' && typeof el.setSelectionRange === 'function') {
    try {
      el.setSelectionRange(caretPos, caretPos);
    } catch (e) {}
  }

  const inputEvt = new Event('input', { bubbles: true });
  el.dispatchEvent(inputEvt);

  if (typeof caretPos === 'number' && typeof el.setSelectionRange === 'function') {
    requestAnimationFrame(() => {
      if (document.activeElement === el && el.value === newValue) {
        try {
          el.setSelectionRange(caretPos, caretPos);
        } catch (e) {}
      }
    });
  }
}

const GlobalSpellChecker = () => {
  const [settings, setSettings] = useState(() => getSpellCheckSettings());
  const [dictReady, setDictReady] = useState(() => isDictionaryReady());
  const [underlines, setUnderlines] = useState([]);
  const [activeBadge, setActiveBadge] = useState(null);
  const [popover, setPopover] = useState(null);
  const [autoCorrectToast, setAutoCorrectToast] = useState(null);

  const activeElRef = useRef(null);
  const popoverRef = useRef(null);
  const isTypingRef = useRef(false);
  const typingTimerRef = useRef(null);
  const scanTimerRef = useRef(null);
  const rafRef = useRef(null);
  const isProgrammaticRef = useRef(false);
  const skipAutoCorrectRef = useRef(false);
  const prevValuesRef = useRef(new WeakMap());
  const toastTimerRef = useRef(null);

  useEffect(() => {
    popoverRef.current = popover;
  }, [popover]);

  useEffect(() => {
    if (!settings.spellCheckEnabled) {
      restoreAllNativeSpellcheck();
      setUnderlines([]);
      setActiveBadge(null);
      setPopover(null);
    }
  }, [settings.spellCheckEnabled]);

  const recomputeUnderlines = useCallback((includeVisibleOthers = true) => {
    const { spellCheckEnabled } = getSpellCheckSettings();
    if (!spellCheckEnabled || !isDictionaryReady()) {
      setUnderlines([]);
      setActiveBadge(null);
      return;
    }

    const activeEl = activeElRef.current;
    const allRects = [];
    let activeTypoCount = 0;
    let firstActiveRect = null;

    // 1. Measure active focused element immediately
    if (activeEl && isSpellCheckEligible(activeEl)) {
      suppressNativeSpellcheck(activeEl);
      if (activeEl.isContentEditable) {
        const rects = measureContentEditableMisspellings(activeEl, {
          skipWordTouchingCaret: isTypingRef.current
        });
        rects.forEach((r, idx) => {
          allRects.push({ ...r, el: activeEl, isActive: true, key: `active-ce-${idx}` });
        });
        activeTypoCount = rects.length;
        if (rects.length > 0) firstActiveRect = rects[0];
      } else {
        const val = activeEl.value || '';
        const caret = typeof activeEl.selectionStart === 'number' ? activeEl.selectionStart : null;
        const misspellings = checkText(val, {
          caretPos: caret,
          skipWordTouchingCaret: isTypingRef.current
        });
        if (misspellings.length > 0) {
          const rects = measureInputMisspellings(activeEl, misspellings);
          rects.forEach((r, idx) => {
            allRects.push({ ...r, el: activeEl, isActive: true, key: `active-${idx}` });
          });
          activeTypoCount = misspellings.length;
          if (rects.length > 0) firstActiveRect = rects[0];
        }
      }

      // Active element badge (skip if AutocompleteTextarea dropdown is currently open)
      const acWrapper = activeEl.closest ? activeEl.closest('.autocomplete-wrapper') : null;
      const acDropdownOpen = acWrapper && acWrapper.querySelector('.suggestions-list');

      if (activeTypoCount > 0 && firstActiveRect && !acDropdownOpen) {
        const clip = getVisibleClipRect(activeEl);
        if (clip) {
          const badgeTop = clip.top >= 24 ? clip.top - 18 : Math.min(window.innerHeight - 24, clip.bottom + 2);
          setActiveBadge({
            el: activeEl,
            count: activeTypoCount,
            firstUnderline: { ...firstActiveRect, el: activeEl },
            top: badgeTop,
            left: Math.min(window.innerWidth - 88, Math.max(8, clip.right - 68))
          });
        } else {
          setActiveBadge(null);
        }
      } else {
        setActiveBadge(null);
      }
    } else {
      setActiveBadge(null);
    }

    // 2. Lightly scan other visible eligible elements on screen (capped for performance)
    if (includeVisibleOthers) {
      const candidates = document.querySelectorAll(
        'textarea, input:not([type]), input[type="text"], [contenteditable="true"]'
      );
      let checkedVisibleCount = 0;
      const MAX_VISIBLE_SCAN = 35;

      for (let i = 0; i < candidates.length && checkedVisibleCount < MAX_VISIBLE_SCAN; i++) {
        const el = candidates[i];
        if (el === activeEl) continue;
        if (!isSpellCheckEligible(el)) continue;

        const rect = el.getBoundingClientRect();
        if (
          rect.bottom <= 0 ||
          rect.top >= window.innerHeight ||
          rect.right <= 0 ||
          rect.left >= window.innerWidth
        ) {
          continue;
        }

        if (el.isContentEditable) {
          if (!el.innerText || !el.innerText.trim()) continue;
          checkedVisibleCount++;
          suppressNativeSpellcheck(el);
          const rects = measureContentEditableMisspellings(el, { skipWordTouchingCaret: false });
          rects.forEach((r, idx) => {
            allRects.push({ ...r, el, isActive: false, key: `vis-ce-${i}-${idx}` });
          });
        } else {
          const val = el.value || '';
          if (!val.trim()) continue;
          checkedVisibleCount++;
          suppressNativeSpellcheck(el);
          const misspellings = checkText(val, { skipWordTouchingCaret: false });
          if (misspellings.length > 0) {
            const rects = measureInputMisspellings(el, misspellings);
            rects.forEach((r, idx) => {
              allRects.push({ ...r, el, isActive: false, key: `vis-${i}-${idx}` });
            });
          }
        }
      }
    }

    setUnderlines(allRects);
  }, []);

  const scheduleScan = useCallback((immediate = false) => {
    if (immediate) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        recomputeUnderlines(true);
      });
      return;
    }
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    scanTimerRef.current = setTimeout(() => {
      recomputeUnderlines(true);
    }, 180);
  }, [recomputeUnderlines]);

  // Initialize dictionary once
  useEffect(() => {
    if (!isDictionaryReady()) {
      initSpellChecker().then((ok) => {
        if (ok) {
          setDictReady(true);
          scheduleScan(true);
        }
      });
    }

    const unsub = subscribeSpellChecker(() => {
      setSettings(getSpellCheckSettings());
      setDictReady(isDictionaryReady());
      scheduleScan(true);
    });

    return () => {
      unsub();
    };
  }, [scheduleScan]);

  const showAutoCorrectUndoToast = useCallback((info) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setAutoCorrectToast(info);
    toastTimerRef.current = setTimeout(() => {
      setAutoCorrectToast(null);
    }, 4200);
  }, []);

  // Open suggestion popover cleanly anchored to an underline item
  const openPopoverForItem = useCallback((item) => {
    if (!item || !item.el) return;
    const suggestions = getSuggestions(item.word, 5);
    const popWidth = 248;
    const estimatedHeight = 250;

    let left = item.left;
    if (left + popWidth > window.innerWidth - 10) {
      left = Math.max(10, window.innerWidth - popWidth - 10);
    }
    left = Math.max(10, left);

    let top = item.top + 6;
    if (top + estimatedHeight > window.innerHeight - 10 && item.lineTop - estimatedHeight > 10) {
      top = Math.max(10, item.lineTop - estimatedHeight - 4);
    }

    setPopover({
      el: item.el,
      word: item.word,
      start: item.start,
      end: item.end,
      isContentEditable: !!item.isContentEditable,
      textNode: item.textNode || null,
      suggestions,
      left,
      top
    });
  }, []);

  // Apply chosen spelling replacement
  const applyReplacement = useCallback((targetPopover, replacement) => {
    if (!targetPopover || !targetPopover.el || !replacement) return;
    const { el, word, start, end, isContentEditable, textNode } = targetPopover;

    if (document.activeElement !== el) {
      try {
        el.focus({ preventScroll: true });
      } catch (e) {}
    }

    if (isContentEditable) {
      if (textNode && textNode.isConnected) {
        const currentSlice = textNode.nodeValue.slice(start, end);
        if (currentSlice === word) {
          textNode.replaceData(start, end - start, replacement);
          try {
            const sel = window.getSelection();
            const range = document.createRange();
            const nextPos = start + replacement.length;
            range.setStart(textNode, Math.min(nextPos, textNode.nodeValue.length));
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
          } catch (e) {}
          isProgrammaticRef.current = true;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          isProgrammaticRef.current = false;
        }
      }
    } else {
      const currentVal = el.value || '';
      if (currentVal.slice(start, end) === word) {
        const nextVal = currentVal.slice(0, start) + replacement + currentVal.slice(end);
        const nextCaret = start + replacement.length;
        isProgrammaticRef.current = true;
        setElementValueReactSafe(el, nextVal, nextCaret);
        prevValuesRef.current.set(el, nextVal);
        isProgrammaticRef.current = false;
      }
    }

    setPopover(null);
    isTypingRef.current = false;
    scheduleScan(true);
  }, [scheduleScan]);

  // Attempt safe auto-correct right after a word delimiter is typed
  const tryAutoCorrect = useCallback((el) => {
    const { spellCheckEnabled, autoCorrectEnabled } = getSpellCheckSettings();
    if (!spellCheckEnabled || !autoCorrectEnabled || !isDictionaryReady()) return false;
    if (!el || el.isContentEditable) return false;
    if (skipAutoCorrectRef.current) {
      skipAutoCorrectRef.current = false;
      return false;
    }

    const newVal = el.value || '';
    const prevVal = prevValuesRef.current.get(el) ?? '';
    prevValuesRef.current.set(el, newVal);

    if (newVal.length <= prevVal.length) return false;
    if (newVal.length - prevVal.length > 2) return false;

    const caret = el.selectionStart;
    if (typeof caret !== 'number' || caret !== el.selectionEnd || caret < 2) return false;

    const delimiter = newVal[caret - 1];
    if (!/^[\s.,;:!?)\n]$/.test(delimiter)) return false;

    const textBeforeDelim = newVal.slice(0, caret - 1);
    const wordMatch = textBeforeDelim.match(/([A-Za-z'\u2018\u2019]+)$/);
    if (!wordMatch) return false;

    const word = wordMatch[1];
    const wordStart = caret - 1 - word.length;
    const wordEnd = caret - 1;

    // Ensure word sits on a clean word boundary
    if (wordStart > 0 && !/[\s(["'\n]/.test(newVal[wordStart - 1])) {
      return false;
    }

    const fixed = getAutoCorrection(word);
    if (!fixed || fixed === word) return false;

    const updatedVal = newVal.slice(0, wordStart) + fixed + newVal.slice(wordEnd);
    const nextCaret = wordStart + fixed.length + 1;

    isProgrammaticRef.current = true;
    setElementValueReactSafe(el, updatedVal, nextCaret);
    prevValuesRef.current.set(el, updatedVal);
    isProgrammaticRef.current = false;

    showAutoCorrectUndoToast({
      el,
      originalWord: word,
      fixedWord: fixed,
      start: wordStart
    });

    return true;
  }, [showAutoCorrectUndoToast]);

  // Undo an auto-correction
  const handleUndoAutoCorrect = useCallback((addToDict = false) => {
    if (!autoCorrectToast) return;
    const { el, originalWord, fixedWord, start } = autoCorrectToast;

    if (el && el.isConnected) {
      const val = el.value || '';
      const slice = val.slice(start, start + fixedWord.length);
      if (slice === fixedWord) {
        const reverted = val.slice(0, start) + originalWord + val.slice(start + fixedWord.length);
        const nextCaret = start + originalWord.length + 1;
        try {
          el.focus({ preventScroll: true });
        } catch (e) {}
        isProgrammaticRef.current = true;
        setElementValueReactSafe(el, reverted, nextCaret);
        prevValuesRef.current.set(el, reverted);
        isProgrammaticRef.current = false;
      }
    }

    if (addToDict) {
      addCustomWord(originalWord);
    } else {
      ignoreWord(originalWord);
    }

    setAutoCorrectToast(null);
    scheduleScan(true);
  }, [autoCorrectToast, scheduleScan]);

  // Global Event Listeners (bound once)
  useEffect(() => {
    const handleFocusIn = (e) => {
      const target = resolveEditableTarget(e.target);
      if (isSpellCheckEligible(target)) {
        activeElRef.current = target;
        if (!target.isContentEditable) {
          prevValuesRef.current.set(target, target.value || '');
        }
        suppressNativeSpellcheck(target);
        isTypingRef.current = false;
        setPopover(null);
        scheduleScan(true);
      }
    };

    const handleFocusOut = (e) => {
      const target = resolveEditableTarget(e.target);
      if (target && target === activeElRef.current) {
        isTypingRef.current = false;
        setTimeout(() => {
          const curActive = resolveEditableTarget(document.activeElement);
          if (!curActive || !isSpellCheckEligible(curActive)) {
            if (activeElRef.current === target) {
              activeElRef.current = null;
            }
          }
          scheduleScan(false);
        }, 120);
      }
    };

    const handleBeforeInput = (e) => {
      const type = e.inputType || '';
      if (
        type.startsWith('delete') ||
        type.startsWith('history') ||
        type === 'insertFromPaste' ||
        type === 'insertFromDrop'
      ) {
        skipAutoCorrectRef.current = true;
      } else {
        skipAutoCorrectRef.current = false;
      }
    };

    const handleInput = (e) => {
      const target = resolveEditableTarget(e.target);
      if (!isSpellCheckEligible(target)) return;
      activeElRef.current = target;
      setPopover(null);

      if (!isProgrammaticRef.current) {
        tryAutoCorrect(target);
      }

      isTypingRef.current = true;
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        isTypingRef.current = false;
        scheduleScan(true);
      }, 900);

      scheduleScan(true);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setPopover(null);
        return;
      }
      if (
        popoverRef.current &&
        ((e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) ||
          e.key === 'Backspace' ||
          e.key === 'Delete')
      ) {
        setPopover(null);
      }
    };

    const handleMouseUp = (e) => {
      const rawTarget = e.target;
      if (
        rawTarget.closest &&
        (rawTarget.closest('.psm-spell-popover') ||
          rawTarget.closest('.psm-spell-underline') ||
          rawTarget.closest('.psm-spell-badge'))
      ) {
        return;
      }

      const target = resolveEditableTarget(rawTarget);
      if (!isSpellCheckEligible(target)) {
        setPopover(null);
        return;
      }

      activeElRef.current = target;
      isTypingRef.current = false;

      // Avoid conflict if AutocompleteTextarea suggestions dropdown is open
      const acWrapper = target.closest ? target.closest('.autocomplete-wrapper') : null;
      if (acWrapper && acWrapper.querySelector('.suggestions-list')) {
        setPopover(null);
        return;
      }

      if (target.isContentEditable) {
        const sel = window.getSelection();
        if (sel && sel.isCollapsed && sel.anchorNode && sel.anchorNode.nodeType === Node.TEXT_NODE && target.contains(sel.anchorNode)) {
          const textNode = sel.anchorNode;
          const offset = sel.anchorOffset;
          const misspellings = checkText(textNode.nodeValue || '', { skipWordTouchingCaret: false });
          const hit = misspellings.find((m) => offset >= m.start && offset <= m.end);
          if (hit) {
            const range = document.createRange();
            range.setStart(textNode, hit.start);
            range.setEnd(textNode, hit.end);
            const rects = range.getClientRects();
            if (rects.length > 0) {
              const r = rects[0];
              openPopoverForItem({
                el: target,
                isContentEditable: true,
                textNode,
                word: hit.word,
                start: hit.start,
                end: hit.end,
                left: r.left,
                top: r.bottom,
                lineTop: r.top
              });
              return;
            }
          }
        }
      } else if (typeof target.selectionStart === 'number') {
        if (target.selectionStart !== target.selectionEnd) {
          setPopover(null);
          return;
        }
        const caret = target.selectionStart;
        const val = target.value || '';
        const misspellings = checkText(val, { skipWordTouchingCaret: false });
        const hit = misspellings.find((m) => caret >= m.start && caret <= m.end);
        if (hit) {
          const rects = measureInputMisspellings(target, [hit]);
          if (rects.length > 0) {
            openPopoverForItem({ ...rects[0], el: target });
            return;
          }
        }
      }

      setPopover(null);
      scheduleScan(true);
    };

    const handleScrollOrResize = () => {
      setPopover(null);
      scheduleScan(true);
    };

    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('focusout', handleFocusOut, true);
    document.addEventListener('beforeinput', handleBeforeInput, true);
    document.addEventListener('input', handleInput, true);
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('mouseup', handleMouseUp, true);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    const observer = new MutationObserver(() => {
      scheduleScan(false);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    scheduleScan(false);

    return () => {
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('focusout', handleFocusOut, true);
      document.removeEventListener('beforeinput', handleBeforeInput, true);
      document.removeEventListener('input', handleInput, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('mouseup', handleMouseUp, true);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      observer.disconnect();
      restoreAllNativeSpellcheck();
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [openPopoverForItem, scheduleScan, tryAutoCorrect]);

  if (!settings.spellCheckEnabled || !dictReady) {
    return null;
  }

  return (
    <div className="psm-spellcheck-layer" aria-hidden={false}>
      {/* Red wavy underlines */}
      {underlines.map((u) => (
        <div
          key={u.key}
          className={`psm-spell-underline ${
            popover && popover.el === u.el && popover.start === u.start ? 'active' : ''
          }`}
          style={{
            left: `${u.left}px`,
            top: `${u.top - 3}px`,
            width: `${u.width}px`
          }}
          title={`Spelling: "${u.word}" — Click for suggestions`}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            openPopoverForItem(u);
          }}
        />
      ))}

      {/* Subtle active field typo counter badge */}
      {activeBadge && !popover && (
        <button
          type="button"
          className="psm-spell-badge"
          style={{
            top: `${activeBadge.top}px`,
            left: `${activeBadge.left}px`
          }}
          title="Click to fix spelling"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            openPopoverForItem(activeBadge.firstUnderline);
          }}
        >
          <span className="psm-spell-badge-dot" />
          <span>{activeBadge.count} {activeBadge.count === 1 ? 'typo' : 'typos'}</span>
        </button>
      )}

      {/* Suggestion Popover */}
      {popover && (
        <div
          className="psm-spell-popover"
          style={{
            left: `${popover.left}px`,
            top: `${popover.top}px`
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className="psm-spell-popover-header">
            <div className="psm-spell-word-wrap">
              <span className="psm-spell-label">Typo</span>
              <span className="psm-spell-word-pill" title={popover.word}>
                {popover.word}
              </span>
            </div>
            <button
              type="button"
              className="psm-spell-close"
              onClick={() => setPopover(null)}
              title="Close (Esc)"
            >
              ×
            </button>
          </div>

          <div className="psm-spell-suggestions">
            {popover.suggestions.length > 0 ? (
              popover.suggestions.map((sugg, idx) => (
                <button
                  key={`${sugg}-${idx}`}
                  type="button"
                  className="psm-spell-sugg-btn"
                  onClick={() => applyReplacement(popover, sugg)}
                >
                  <span className="psm-spell-sugg-left">
                    <span className="psm-spell-sugg-idx">{idx + 1}</span>
                    <span>{sugg}</span>
                  </span>
                  <span className="psm-spell-sugg-apply">Replace</span>
                </button>
              ))
            ) : (
              <div className="psm-spell-no-sugg">No suggestions found</div>
            )}
          </div>

          <div className="psm-spell-actions">
            <button
              type="button"
              className="psm-spell-action-btn"
              onClick={() => {
                addCustomWord(popover.word);
                setPopover(null);
                scheduleScan(true);
              }}
              title="Save this term permanently to your custom dictionary"
            >
              <span>+ Add to Dict</span>
            </button>
            <button
              type="button"
              className="psm-spell-action-btn"
              onClick={() => {
                ignoreWord(popover.word);
                setPopover(null);
                scheduleScan(true);
              }}
              title="Ignore this word for the current session"
            >
              <span>Ignore</span>
            </button>
          </div>

          <div className="psm-spell-footer">
            <span>English + PSM Dict</span>
            <button
              type="button"
              className="psm-spell-autocorrect-toggle"
              onClick={() => {
                const next = !settings.autoCorrectEnabled;
                setAutoCorrectEnabled(next);
              }}
              title="Toggle automatic typo correction while typing"
            >
              <span>Auto-correct:</span>
              <span className={`psm-spell-ac-pill ${settings.autoCorrectEnabled ? 'on' : 'off'}`}>
                {settings.autoCorrectEnabled ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Auto-Correct Undo Pill */}
      {autoCorrectToast && (
        <div
          className="psm-autocorrect-toast"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <span>⚡ Auto-corrected</span>
          <code>{autoCorrectToast.originalWord}</code>
          <span>→</span>
          <code>{autoCorrectToast.fixedWord}</code>
          <button
            type="button"
            className="psm-autocorrect-undo"
            onClick={() => handleUndoAutoCorrect(false)}
          >
            Undo
          </button>
          <button
            type="button"
            className="psm-autocorrect-dict"
            onClick={() => handleUndoAutoCorrect(true)}
            title="Revert and add original word to custom dictionary"
          >
            + Dict
          </button>
        </div>
      )}
    </div>
  );
};

export default GlobalSpellChecker;
