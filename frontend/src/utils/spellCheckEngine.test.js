import fs from 'fs';
import path from 'path';
import {
  initSpellCheckerFromStrings,
  checkText,
  getSuggestions,
  getAutoCorrection,
  addCustomWord,
  removeCustomWord,
  getCustomDictionary,
  ignoreWord,
  getSpellCheckSettings,
  setSpellCheckEnabled,
  setAutoCorrectEnabled
} from './spellCheckEngine';

beforeAll(() => {
  const dictDir = path.resolve(__dirname, '../../public/dictionaries');
  const aff = fs.readFileSync(path.join(dictDir, 'en.aff'), 'utf8');
  const dic = fs.readFileSync(path.join(dictDir, 'en.dic'), 'utf8');
  initSpellCheckerFromStrings(aff, dic);
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('spellCheckEngine', () => {
  test('recognizes valid English and Process Safety / Engineering domain terms without false positives', () => {
    const text =
      "Conduct HAZOP and LOPA review for PSV-101, BDV-202, LSHH, and PAHH interlocks. " +
      "Check depressurisation, overpressure, hydrocarbon leakage, SIL2 ESD, SS316L piping, H2S/CO2, " +
      "operator's response (approx. 12 barg), and https://psm.perpetualsolutions.co.in or safety@plant.com.";

    const errors = checkText(text);
    expect(errors).toEqual([]);
  });

  test('detects misspelled English and engineering words with exact offsets', () => {
    const text = 'High pressue in vessle due to valv leakage and safegaurd failure.';
    const errors = checkText(text);
    const words = errors.map((e) => e.word);

    expect(words).toEqual(['pressue', 'vessle', 'valv', 'safegaurd']);
    errors.forEach((e) => {
      expect(text.slice(e.start, e.end)).toBe(e.word);
    });
  });

  test('skips word currently being typed when skipWordTouchingCaret is enabled', () => {
    const text = 'High pressue';
    expect(checkText(text, { caretPos: text.length, skipWordTouchingCaret: true })).toEqual([]);
    expect(checkText(text, { caretPos: 0, skipWordTouchingCaret: true }).map((e) => e.word)).toEqual(['pressue']);
  });

  test('ranks top suggestions accurately and preserves word casing', () => {
    expect(getSuggestions('pressue', 3)[0]).toBe('pressure');
    expect(getSuggestions('Pressue', 3)[0]).toBe('Pressure');
    expect(getSuggestions('teh', 3)[0]).toBe('the');
    expect(getSuggestions('Teh', 3)[0]).toBe('The');
    expect(getSuggestions('overpressue', 3)[0]).toBe('overpressure');
    expect(getSuggestions('recomendation', 3)[0]).toBe('recommendation');
    expect(getSuggestions('temprature', 3)[0]).toBe('temperature');
  });

  test('safely auto-corrects unambiguous typos while ignoring short acronyms and tags', () => {
    expect(getAutoCorrection('pressue')).toBe('pressure');
    expect(getAutoCorrection('Teh')).toBe('The');
    expect(getAutoCorrection('safegaurd')).toBe('safeguard');
    expect(getAutoCorrection('equipement')).toBe('equipment');

    // Must never alter valid words or short uppercase instrumentation acronyms
    expect(getAutoCorrection('pressure')).toBeNull();
    expect(getAutoCorrection('PSV')).toBeNull();
    expect(getAutoCorrection('LSHH')).toBeNull();
    expect(getAutoCorrection('H2S')).toBeNull();
    expect(getAutoCorrection('R-101')).toBeNull();
  });

  test('supports persistent custom dictionary add/remove and session ignore', () => {
    const text = 'Catalyst XylophosX caused fouling in AnkleshwarUnit.';
    expect(checkText(text).map((e) => e.word)).toEqual(['XylophosX', 'AnkleshwarUnit']);

    addCustomWord('XylophosX');
    expect(getCustomDictionary()).toContain('XylophosX');
    expect(checkText(text).map((e) => e.word)).toEqual(['AnkleshwarUnit']);

    ignoreWord('AnkleshwarUnit');
    expect(checkText(text)).toEqual([]);

    removeCustomWord('XylophosX');
    expect(getCustomDictionary()).not.toContain('XylophosX');
    expect(checkText(text).map((e) => e.word)).toEqual(['XylophosX']);
  });

  test('manages spellcheck and autocorrect settings in localStorage', () => {
    expect(getSpellCheckSettings()).toEqual({
      spellCheckEnabled: true,
      autoCorrectEnabled: true
    });

    setSpellCheckEnabled(false);
    setAutoCorrectEnabled(false);
    expect(getSpellCheckSettings()).toEqual({
      spellCheckEnabled: false,
      autoCorrectEnabled: false
    });
  });
});
