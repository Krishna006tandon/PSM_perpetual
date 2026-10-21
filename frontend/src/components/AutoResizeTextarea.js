import React, { useRef, useLayoutEffect, useEffect, useCallback } from 'react';

const AutoResizeTextarea = ({
  value,
  onChange,
  onInput,
  onBlur,
  onKeyDown,
  onFocus,
  disabled,
  style,
  className,
  placeholder,
  minHeight = 36,
  spellCheck = true,
  dataGramm = 'false',
  ...rest
}) => {
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
  };

  const handleInputInternal = (e) => {
    if (onInput) onInput(e);
    adjustHeight();
  };

  return (
    <textarea
      ref={textareaRef}
      value={value || ''}
      onChange={handleChange}
      onInput={handleInputInternal}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      disabled={disabled}
      placeholder={placeholder}
      spellCheck={spellCheck}
      data-gramm={dataGramm}
      className={className}
      style={{
        width: '100%',
        overflowY: 'hidden',
        overflowX: 'hidden',
        resize: 'none',
        ...style
      }}
      {...rest}
    />
  );
};

export default AutoResizeTextarea;
