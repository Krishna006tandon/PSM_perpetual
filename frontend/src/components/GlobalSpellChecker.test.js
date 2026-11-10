import React, { useState, act } from 'react';
import { createRoot } from 'react-dom/client';
import fs from 'fs';
import path from 'path';
import GlobalSpellChecker from './GlobalSpellChecker';
import { initSpellCheckerFromStrings, getCustomDictionary } from '../utils/spellCheckEngine';

let container = null;
let root = null;

beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const dictDir = path.resolve(__dirname, '../../public/dictionaries');
  const aff = fs.readFileSync(path.join(dictDir, 'en.aff'), 'utf8');
  const dic = fs.readFileSync(path.join(dictDir, 'en.dic'), 'utf8');
  initSpellCheckerFromStrings(aff, dic);

  // JSDOM layout mock so visibility and clientRect measurements work cleanly
  Element.prototype.getBoundingClientRect = function () {
    return {
      left: 10,
      top: 40,
      right: 410,
      bottom: 120,
      width: 400,
      height: 80,
      x: 10,
      y: 40
    };
  };
  Element.prototype.getClientRects = function () {
    return [
      {
        left: 20,
        top: 48,
        right: 80,
        bottom: 66,
        width: 60,
        height: 18
      }
    ];
  };
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  container = null;
});

function ControlledHarness({ initialText = '' }) {
  const [text, setText] = useState(initialText);
  const [pwd, setPwd] = useState('mispeledpwd');
  return (
    <div>
      <textarea
        data-testid="prose"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <input
        type="password"
        data-testid="pwd"
        value={pwd}
        onChange={(e) => setPwd(e.target.value)}
      />
      <div data-testid="state-mirror">{text}</div>
      <GlobalSpellChecker />
    </div>
  );
}

describe('GlobalSpellChecker integration', () => {
  test('auto-corrects unambiguous typo on space, updates React state, and supports Undo', () => {
    act(() => {
      root.render(<ControlledHarness initialText="pressue" />);
    });

    const textarea = container.querySelector('[data-testid="prose"]');
    act(() => {
      textarea.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    });

    // Simulate typing space right after "pressue"
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    act(() => {
      setter.call(textarea, 'pressue ');
      textarea.setSelectionRange(8, 8);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(container.querySelector('[data-testid="state-mirror"]').textContent).toBe('pressure ');
    const toast = container.querySelector('.psm-autocorrect-toast');
    expect(toast).not.toBeNull();
    expect(toast.textContent).toContain('pressue');
    expect(toast.textContent).toContain('pressure');

    // Click Undo
    const undoBtn = container.querySelector('.psm-autocorrect-undo');
    act(() => {
      undoBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.querySelector('[data-testid="state-mirror"]').textContent).toBe('pressue ');
  });

  test('highlights typo with wavy underline, opens click-to-fix popover, and replaces React state', () => {
    jest.useFakeTimers();

    act(() => {
      root.render(<ControlledHarness initialText="Check safegaurd integrity" />);
    });

    const textarea = container.querySelector('[data-testid="prose"]');
    act(() => {
      textarea.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      jest.runOnlyPendingTimers();
    });

    const underlines = container.querySelectorAll('.psm-spell-underline');
    expect(underlines.length).toBe(1);
    expect(underlines[0].getAttribute('title')).toContain('safegaurd');

    // Click the red wavy underline to open suggestions
    act(() => {
      underlines[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const popover = container.querySelector('.psm-spell-popover');
    expect(popover).not.toBeNull();
    const firstSuggBtn = popover.querySelector('.psm-spell-sugg-btn');
    expect(firstSuggBtn.textContent).toContain('safeguard');

    // Apply suggestion
    act(() => {
      firstSuggBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      jest.runOnlyPendingTimers();
    });

    expect(container.querySelector('[data-testid="state-mirror"]').textContent).toBe(
      'Check safeguard integrity'
    );
    expect(container.querySelectorAll('.psm-spell-underline').length).toBe(0);

    jest.useRealTimers();
  });

  test('adds unknown term to persistent Custom Dictionary via popover', () => {
    jest.useFakeTimers();

    act(() => {
      root.render(<ControlledHarness initialText="Inspect XylophosUnit now" />);
    });

    const textarea = container.querySelector('[data-testid="prose"]');
    act(() => {
      textarea.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      jest.runOnlyPendingTimers();
    });

    const underline = container.querySelector('.psm-spell-underline');
    expect(underline).not.toBeNull();

    act(() => {
      underline.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const addToDictBtn = container.querySelectorAll('.psm-spell-action-btn')[0];
    act(() => {
      addToDictBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      jest.runOnlyPendingTimers();
    });

    expect(getCustomDictionary()).toContain('XylophosUnit');
    expect(container.querySelectorAll('.psm-spell-underline').length).toBe(0);

    jest.useRealTimers();
  });

  test('skips password fields and supports Ignore button', () => {
    jest.useFakeTimers();

    act(() => {
      root.render(<ControlledHarness initialText="Check mytypo here" />);
    });

    const pwd = container.querySelector('[data-testid="pwd"]');
    act(() => {
      pwd.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      jest.runOnlyPendingTimers();
    });

    // Only "mytypo" from textarea should be flagged, never "mispeledpwd" from password input
    const underlines = container.querySelectorAll('.psm-spell-underline');
    expect(underlines.length).toBe(1);
    expect(underlines[0].getAttribute('title')).toContain('mytypo');

    act(() => {
      underlines[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const ignoreBtn = container.querySelectorAll('.psm-spell-action-btn')[1];
    act(() => {
      ignoreBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      jest.runOnlyPendingTimers();
    });

    expect(container.querySelectorAll('.psm-spell-underline').length).toBe(0);

    jest.useRealTimers();
  });
});
