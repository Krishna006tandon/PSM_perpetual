import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import './AutocompleteTextarea.css';

const getItemText = (item) => {
  if (!item) return '';
  if (typeof item === 'string') return item;
  return item.text || '';
};

const AutocompleteTextarea = ({
  value,
  onChange,
  onInput,
  onBlur,
  onKeyDown,
  onFocus,
  suggestions = [],
  dropdownMode = false,
  disabled,
  style,
  className,
  placeholder,
  minHeight = 36
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const wrapperRef = useRef(null);
  const textareaRef = useRef(null);
  const lastWidthRef = useRef(0);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;

    // Reset height temporarily so scrollHeight can shrink if content was deleted
    el.style.height = 'auto';

    // Account for box-sizing border
    const computed = window.getComputedStyle(el);
    const borderTop = parseFloat(computed.borderTopWidth) || 0;
    const borderBottom = parseFloat(computed.borderBottomWidth) || 0;

    const targetHeight = Math.ceil(el.scrollHeight + borderTop + borderBottom);
    el.style.height = `${Math.max(targetHeight, minHeight)}px`;
  }, [minHeight]);

  useLayoutEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    adjustHeight();

    let ro;
    if (window.ResizeObserver) {
      ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const width = entry.contentRect.width;
          if (width > 0 && Math.abs(width - lastWidthRef.current) > 1) {
            lastWidthRef.current = width;
            adjustHeight();
          }
        }
      });
      ro.observe(el);
    }

    const handleResize = () => adjustHeight();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (ro) ro.disconnect();
    };
  }, [adjustHeight]);

  const filterDropdownSuggestions = useCallback((query) => {
    if (!Array.isArray(suggestions)) return [];
    const q = (query || '').trim().toLowerCase();
    if (!q || q === 'of from to') {
      return suggestions;
    }
    const filtered = suggestions.filter(item => {
      if (item.isHeader) return false;
      const text = getItemText(item).toLowerCase();
      const num = item.num ? String(item.num) : '';
      return text.includes(q) || num === q;
    });
    return filtered.length > 0 ? filtered : suggestions;
  }, [suggestions]);

  const handleFocusInternal = (e) => {
    if (onFocus) onFocus(e);
    if (dropdownMode && Array.isArray(suggestions) && suggestions.length > 0) {
      setFilteredSuggestions(suggestions);
      setShowSuggestions(true);
      const currentText = (value || '').trim().toLowerCase();
      const selectable = suggestions.filter(s => !s.isHeader);
      const idx = selectable.findIndex(s => getItemText(s).toLowerCase() === currentText);
      setActiveSuggestionIndex(idx >= 0 ? idx : 0);
    }
  };

  const handleClickInternal = () => {
    if (dropdownMode && Array.isArray(suggestions) && suggestions.length > 0) {
      setFilteredSuggestions(suggestions);
      setShowSuggestions(true);
    }
  };

  const handleChange = (e) => {
    if (onChange) onChange(e);
    adjustHeight();

    const text = e.target.value;

    if (dropdownMode) {
      const list = filterDropdownSuggestions(text);
      setFilteredSuggestions(list);
      setShowSuggestions(true);
      setActiveSuggestionIndex(0);
      return;
    }

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPosition);
    const match = textBeforeCursor.match(/[a-zA-Z0-9_]+$/);

    if (match && match[0].length >= 1 && Array.isArray(suggestions)) {
      const currentWord = match[0];

      const unlinked = suggestions.filter(
        (suggestion) =>
          typeof suggestion === 'string' &&
          suggestion.toLowerCase().startsWith(currentWord.toLowerCase()) &&
          suggestion !== currentWord
      );

      const unique = [...new Set(unlinked)].slice(0, 10);
      setFilteredSuggestions(unique);
      setShowSuggestions(unique.length > 0);
      setActiveSuggestionIndex(0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleInputInternal = (e) => {
    if (onInput) onInput(e);
    adjustHeight();
  };

  const insertSuggestion = (suggestion) => {
    if (!textareaRef.current) return;

    if (dropdownMode) {
      const selectedText = getItemText(suggestion);
      if (onChange) onChange({ target: { value: selectedText } });
      if (onBlur) onBlur({ target: { value: selectedText } });
      setShowSuggestions(false);
      setTimeout(() => {
        adjustHeight();
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 0);
      return;
    }

    const text = textareaRef.current.value;
    const cursorPosition = textareaRef.current.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPosition);

    const match = textBeforeCursor.match(/[a-zA-Z0-9_]+$/);
    if (!match) return;

    const currentWord = match[0];
    const startIndex = cursorPosition - currentWord.length;

    const newText =
      text.substring(0, startIndex) +
      suggestion +
      text.substring(cursorPosition);

    if (onChange) onChange({ target: { value: newText } });
    setShowSuggestions(false);

    setTimeout(() => {
      adjustHeight();
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = startIndex + suggestion.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (showSuggestions) {
      const selectable = filteredSuggestions.filter(s => !s.isHeader);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestionIndex((prevIndex) => (prevIndex + 1) % (selectable.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestionIndex((prevIndex) => (prevIndex - 1 + (selectable.length || 1)) % (selectable.length || 1));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        const selectable = filteredSuggestions.filter(s => !s.isHeader);
        if (selectable.length > 0) {
          e.preventDefault();
          const selected = selectable[activeSuggestionIndex] || selectable[0];
          insertSuggestion(selected);
        }
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    } else {
      if (onKeyDown) onKeyDown(e);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    if (suggestion.isHeader) return;
    insertSuggestion(suggestion);
  };

  // Separate wrapper positioning from textarea styling
  const wrapperStyle = {};
  const textareaStyle = {};

  if (style) {
    const wrapperKeys = ['width', 'minWidth', 'maxWidth', 'display', 'verticalAlign', 'flex', 'marginBottom', 'marginTop', 'marginLeft', 'marginRight'];
    Object.keys(style).forEach((key) => {
      if (wrapperKeys.includes(key)) {
        wrapperStyle[key] = style[key];
      } else {
        textareaStyle[key] = style[key];
      }
    });
  }

  return (
    <div className="autocomplete-wrapper" ref={wrapperRef} style={wrapperStyle}>
      <textarea
        ref={textareaRef}
        disabled={disabled}
        className={className}
        style={{
          width: '100%',
          overflowY: 'hidden',
          overflowX: 'hidden',
          resize: 'none',
          ...textareaStyle
        }}
        value={value || ''}
        onChange={handleChange}
        onInput={handleInputInternal}
        onBlur={(e) => {
          if (onBlur) onBlur(e);
        }}
        onFocus={handleFocusInternal}
        onClick={handleClickInternal}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        data-gramm="false"
        spellCheck={true}
      />
      {showSuggestions && (
        <ul className="suggestions-list" style={{ maxHeight: '280px', overflowY: 'auto', zIndex: 9999 }}>
          {filteredSuggestions.map((item, index) => {
            if (item.isHeader) {
              return (
                <li
                  key={`header-${index}`}
                  style={{
                    backgroundColor: '#1e293b',
                    color: '#94a3b8',
                    padding: '6px 10px',
                    fontSize: '10px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderTop: '1px solid #334155',
                    borderBottom: '1px solid #334155',
                    cursor: 'default',
                    userSelect: 'none',
                    textAlign: 'center'
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  ⚡ {item.text}
                </li>
              );
            }

            const itemText = getItemText(item);
            const selectable = filteredSuggestions.filter(s => !s.isHeader);
            const selectableIndex = selectable.indexOf(item);
            let itemClassName = "suggestion-item";
            if (selectableIndex === activeSuggestionIndex) {
              itemClassName += " suggestion-active";
            }

            const isCurrentVal = (value || '').trim().toLowerCase() === itemText.toLowerCase();

            return (
              <li
                className={itemClassName}
                key={`sugg-${item.num || index}-${itemText}`}
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent blur so click registers reliably
                  handleSuggestionClick(item);
                }}
                title={itemText}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f1f5f9'
                }}
              >
                {item.num && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '22px',
                    height: '20px',
                    borderRadius: '4px',
                    backgroundColor: item.num <= 10 ? '#dbeafe' : '#fef3c7',
                    color: item.num <= 10 ? '#1e40af' : '#92400e',
                    fontSize: '11px',
                    fontWeight: '700'
                  }}>
                    {item.num}
                  </span>
                )}
                <span style={{ fontWeight: isCurrentVal ? '700' : '500', color: '#1e293b', flex: 1 }}>
                  {itemText}
                </span>
                {isCurrentVal && (
                  <span style={{ color: '#10b981', fontSize: '13px', fontWeight: 'bold' }}>✓</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default AutocompleteTextarea;
