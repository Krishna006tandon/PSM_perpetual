import React, { useState, useRef, useEffect } from 'react';
import './AutocompleteTextarea.css';

const AutocompleteTextarea = ({
  value,
  onChange,
  onBlur,
  onKeyDown,
  suggestions,
  disabled,
  style,
  className,
  placeholder
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const wrapperRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e) => {
    onChange(e);
    
    const text = e.target.value;
    const cursorPosition = e.target.selectionStart;
    
    // Get text before cursor and find the last word
    const textBeforeCursor = text.substring(0, cursorPosition);
    const match = textBeforeCursor.match(/[a-zA-Z0-9_]+$/);
    
    if (match && match[0].length >= 1) {
      const currentWord = match[0];
      
      const unlinked = suggestions.filter(
        (suggestion) =>
          suggestion.toLowerCase().startsWith(currentWord.toLowerCase()) &&
          suggestion !== currentWord
      );
      
      const unique = [...new Set(unlinked)].slice(0, 10); // Limit to 10 suggestions for performance
      setFilteredSuggestions(unique);
      setShowSuggestions(unique.length > 0);
      setActiveSuggestionIndex(0);
    } else {
      setShowSuggestions(false);
    }
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

    onChange({ target: { value: newText } });
    setShowSuggestions(false);

    setTimeout(() => {
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

  return (
    <div className="autocomplete-wrapper" ref={wrapperRef}>
      <textarea
        ref={textareaRef}
        disabled={disabled}
        className={className}
        style={style}
        value={value || ''}
        onChange={handleChange}
        onBlur={(e) => {
          if (onBlur) onBlur(e);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        data-gramm="false"
        spellCheck="false"
      />
      {showSuggestions && (
        <ul className="suggestions-list">
          {filteredSuggestions.map((suggestion, index) => {
            let className = "suggestion-item";
            if (index === activeSuggestionIndex) {
              className += " suggestion-active";
            }
            return (
              <li
                className={className}
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
