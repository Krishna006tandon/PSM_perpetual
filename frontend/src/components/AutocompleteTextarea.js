import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import './AutocompleteTextarea.css';

const AutocompleteTextarea = ({
  value,
  onChange,
  onInput,
  onBlur,
  onKeyDown,
  onFocus,
  suggestions = [],
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

  const handleChange = (e) => {
    if (onChange) onChange(e);
    adjustHeight();

    const text = e.target.value;
    const cursorPosition = e.target.selectionStart;

    // Get text before cursor and find the last word
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
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestionIndex(
          (prevIndex) => (prevIndex + 1) % filteredSuggestions.length
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestionIndex(
          (prevIndex) => (prevIndex - 1 + filteredSuggestions.length) % filteredSuggestions.length
        );
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = filteredSuggestions[activeSuggestionIndex];
        insertSuggestion(selected);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    } else {
      if (onKeyDown) onKeyDown(e);
    }
  };

  const handleSuggestionClick = (suggestion) => {
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
        onFocus={onFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        data-gramm="false"
        spellCheck={true}
      />
      {showSuggestions && (
        <ul className="suggestions-list">
          {filteredSuggestions.map((suggestion, index) => {
            let itemClassName = "suggestion-item";
            if (index === activeSuggestionIndex) {
              itemClassName += " suggestion-active";
            }
            return (
              <li
                className={itemClassName}
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                title={suggestion}
              >
                {suggestion}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default AutocompleteTextarea;
