import React, { useState, useEffect, useRef } from 'react';

const SelectRecTargetModal = ({
  isOpen,
  onClose,
  scenario,
  options = [],
  initialSelectedTarget,
  onConfirm
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    if (initialSelectedTarget && options.length > 0) {
      const idx = options.findIndex(
        opt => opt.id === initialSelectedTarget.id || opt.label === initialSelectedTarget.label
      );
      if (idx !== -1) {
        setSelectedIndex(idx);
      } else {
        setSelectedIndex(0);
      }
    } else {
      setSelectedIndex(0);
    }
  }, [isOpen, initialSelectedTarget, options]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % (options.length || 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + (options.length || 1)) % (options.length || 1));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (options[selectedIndex]) {
          onConfirm(options[selectedIndex]);
        }
        return;
      }
      // Check 1-9 number shortcut
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= options.length) {
        e.preventDefault();
        setSelectedIndex(num - 1);
        onConfirm(options[num - 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, options, onConfirm, onClose]);

  if (!isOpen) return null;

  const currentOption = options[selectedIndex] || null;

  return (
    <div 
      className="modal-overlay" 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100000,
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        ref={containerRef}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '560px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #e2e8f0',
          animation: 'fadeInScale 0.15s ease-out'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>🎯</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                Select Recommendation Target
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                Kiske against recommendation add karni hai?
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '18px',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              lineHeight: 1
            }}
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Body / Options List */}
        <div style={{ padding: '16px 20px', maxHeight: '60vh', overflowY: 'auto' }}>
          <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#475569', fontWeight: '500' }}>
            Choose whether to assign this recommendation against the entire consequence or a specific safeguard:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {options.map((opt, idx) => {
              const isSelected = selectedIndex === idx;
              const isSafeguard = opt.type === 'safeguard';

              return (
                <div
                  key={opt.id || idx}
                  onClick={() => {
                    setSelectedIndex(idx);
                  }}
                  onDoubleClick={() => {
                    setSelectedIndex(idx);
                    onConfirm(opt);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 4px 6px -1px rgba(37, 99, 235, 0.1)' : 'none'
                  }}
                >
                  {/* Radio indicator */}
                  <div style={{ paddingTop: '2px' }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      border: isSelected ? '5px solid #2563eb' : '2px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      boxSizing: 'border-box'
                    }} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '700',
                        backgroundColor: isSafeguard ? '#fef3c7' : '#e0e7ff',
                        color: isSafeguard ? '#92400e' : '#3730a3'
                      }}>
                        {isSafeguard ? '🛡️' : '📌'} {opt.label}
                      </span>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        (Press {idx + 1})
                      </span>
                    </div>

                    <div style={{
                      fontSize: '12px',
                      color: isSelected ? '#1e3a8a' : '#334155',
                      lineHeight: '1.4',
                      wordBreak: 'break-word'
                    }}>
                      {opt.description || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>(Empty description)</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            💡 <b>↑ / ↓</b> navigate • <b>Enter</b> select • <b>Esc</b> cancel
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '7px 14px',
                fontSize: '12px',
                fontWeight: '600',
                color: '#475569',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (currentOption) onConfirm(currentOption);
              }}
              style={{
                padding: '7px 18px',
                fontSize: '12px',
                fontWeight: '600',
                color: '#ffffff',
                backgroundColor: '#2563eb',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}
            >
              <span>Add Recommendation</span>
              <kbd style={{
                background: 'rgba(255,255,255,0.25)',
                padding: '1px 5px',
                borderRadius: '3px',
                fontSize: '10px'
              }}>Enter</kbd>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectRecTargetModal;
