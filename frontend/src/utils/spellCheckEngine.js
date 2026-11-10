import nspell from 'nspell';
import {
  PSM_DOMAIN_WORDS,
  COMMON_TYPO_MAP,
  PRIORITY_RANK_WORDS
} from './psmDictionary.js';

const SPELLCHECK_ENABLED_KEY = 'psm_spellcheck_enabled';
const AUTOCORRECT_ENABLED_KEY = 'psm_autocorrect_enabled';
const CUSTOM_DICT_KEY = 'psm_custom_dictionary';
const SESSION_IGNORED_KEY = 'psm_spellcheck_ignored';
export const SPELLCHECK_EVENT = 'psm-spellcheck-updated';

// Common engineering shorthand & abbreviations that shouldn't be flagged
const SHORTHAND_WORDS = [
  'approx', 'temp', 'qty', 'dia', 'thk', 'dwg', 'drg', 'dept', 'engr',
  'inst', 'spec', 'specs', 'avg', 'std', 'nos', 'hrs', 'yrs', 'mos', 'wks',
  'elev', 'rev', 'ref', 'fig', 'sec', 'vol', 'etc', 'viz', 'sqft', 'sqm',
  'deg', 'degc', 'degf', 'kpa', 'mpa', 'gpm', 'cfm', 'scfm', 'lpm', 'ppm',
  'ppb', 'bpd', 'tpy', 'mmhg', 'nm3', 'mbar', 'bara', 'barg', 'psig', 'psia',
  'kpag', 'ma', 'mv', 'kv', 'kw', 'mw', 'ph', 'wt', 'mol', 'sr', 'sl',
  'eg', 'ie', 'vs', 'na', 'tbd', 'tba', 'asap', 'wip', 'eta', 'min', 'max'
];

// Standard English contractions without relying solely on Hunspell tokenization
const VALID_CONTRACTIONS = new Set([
  "don't", "doesn't", "didn't", "isn't", "aren't", "wasn't", "weren't",
  "won't", "wouldn't", "can't", "couldn't", "shouldn't", "hasn't", "haven't",
  "hadn't", "mustn't", "needn't", "shan't", "it's", "that's", "there's",
  "here's", "what's", "who's", "where's", "when's", "why's", "how's",
  "let's", "i'm", "you're", "we're", "they're", "he's", "she's",
  "i've", "you've", "we've", "they've", "i'll", "you'll", "we'll",
  "they'll", "he'll", "she'll", "it'll", "i'd", "you'd", "we'd", "they'd",
  "he'd", "she'd", "o'clock"
]);

const psmWordList = [...PSM_DOMAIN_WORDS, ...SHORTHAND_WORDS];
const psmLowerSet = new Set([
  ...psmWordList.map((w) => w.toLowerCase()),
  ...Array.from(PRIORITY_RANK_WORDS)
]);
const psmCanonicalMap = new Map();
psmWordList.forEach((w) => {
  const low = w.toLowerCase();
  if (!psmCanonicalMap.has(low)) psmCanonicalMap.set(low, w);
});

let spellInstance = null;
let loadPromise = null;
let dictionaryReady = false;
let dictionaryError = null;
const suggestionCache = new Map();
const subscribers = new Set();

function emitUpdate() {
  subscribers.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      // ignore subscriber errors
    }
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SPELLCHECK_EVENT));
  }
}

export function subscribeSpellChecker(callback) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

export function isDictionaryReady() {
  return dictionaryReady;
}

export function getDictionaryError() {
  return dictionaryError;
}

// --- Settings Helpers ---
export function getSpellCheckSettings() {
  if (typeof window === 'undefined') {
    return { spellCheckEnabled: true, autoCorrectEnabled: true };
  }
  const sc = localStorage.getItem(SPELLCHECK_ENABLED_KEY);
  const ac = localStorage.getItem(AUTOCORRECT_ENABLED_KEY);
  return {
    spellCheckEnabled: sc !== null ? sc === 'true' : true,
    autoCorrectEnabled: ac !== null ? ac === 'true' : true
  };
}

export function setSpellCheckEnabled(enabled) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SPELLCHECK_ENABLED_KEY, String(!!enabled));
  }
  emitUpdate();
}

export function setAutoCorrectEnabled(enabled) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUTOCORRECT_ENABLED_KEY, String(!!enabled));
  }
  emitUpdate();
}

// --- Custom Dictionary & Session Ignored Words ---
export function getCustomDictionary() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_DICT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function getCustomLowerSet() {
  return new Set(getCustomDictionary().map((w) => String(w).trim().toLowerCase()).filter(Boolean));
}

export function addCustomWord(word) {
  const cleaned = String(word || '').trim();
  if (!cleaned) return false;

  const existing = getCustomDictionary();
  const exists = existing.some((w) => w.toLowerCase() === cleaned.toLowerCase());
  if (!exists) {
    const updated = [...existing, cleaned];
    if (typeof window !== 'undefined') {
      localStorage.setItem(CUSTOM_DICT_KEY, JSON.stringify(updated));
    }
  }

  if (spellInstance) {
    spellInstance.add(cleaned);
    spellInstance.add(cleaned.toLowerCase());
  }
  suggestionCache.clear();
  emitUpdate();
  return true;
}

export function removeCustomWord(word) {
  const target = String(word || '').trim().toLowerCase();
  const updated = getCustomDictionary().filter((w) => w.toLowerCase() !== target);
  if (typeof window !== 'undefined') {
    localStorage.setItem(CUSTOM_DICT_KEY, JSON.stringify(updated));
  }
  if (spellInstance && target && !psmLowerSet.has(target)) {
    try {
      spellInstance.remove(word);
      spellInstance.remove(target);
    } catch (e) {}
  }
  suggestionCache.clear();
  emitUpdate();
}

export function getIgnoredWords() {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = sessionStorage.getItem(SESSION_IGNORED_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.map((w) => String(w).toLowerCase()) : []);
  } catch (e) {
    return new Set();
  }
}

export function ignoreWord(word) {
  const low = String(word || '').trim().toLowerCase();
  if (!low || typeof window === 'undefined') return;
  const current = getIgnoredWords();
  current.add(low);
  sessionStorage.setItem(SESSION_IGNORED_KEY, JSON.stringify(Array.from(current)));
  emitUpdate();
}

// --- Lazy Dictionary Loader ---
export function initSpellChecker() {
  if (dictionaryReady) return Promise.resolve(true);
  if (loadPromise) return loadPromise;

  const baseUrl = (typeof process !== 'undefined' && process.env && process.env.PUBLIC_URL)
    ? process.env.PUBLIC_URL.replace(/\/$/, '')
    : '';

  loadPromise = (async () => {
    try {
      const [affRes, dicRes] = await Promise.all([
        fetch(`${baseUrl}/dictionaries/en.aff`),
        fetch(`${baseUrl}/dictionaries/en.dic`)
      ]);

      if (!affRes.ok || !dicRes.ok) {
        throw new Error(`Failed to fetch dictionary files (${affRes.status}/${dicRes.status})`);
      }

      const [affText, dicText] = await Promise.all([affRes.text(), dicRes.text()]);
      const instance = nspell(affText, dicText);

      // Register PSM domain vocabulary & user custom words
      const personalLines = [
        ...psmWordList,
        ...Array.from(PRIORITY_RANK_WORDS),
        ...getCustomDictionary()
      ];
      instance.personal(personalLines.join('\n'));

      spellInstance = instance;
      dictionaryReady = true;
      dictionaryError = null;
      suggestionCache.clear();
      emitUpdate();
      return true;
    } catch (err) {
      console.error('[SpellCheck] Dictionary initialization error:', err);
      dictionaryError = err.message || 'Dictionary failed to load';
      return false;
    }
  })();

  return loadPromise;
}

/**
 * Allows injecting preloaded aff/dic strings in tests or non-fetch environments.
 */
export function initSpellCheckerFromStrings(affText, dicText) {
  const instance = nspell(affText, dicText);
  const personalLines = [
    ...psmWordList,
    ...Array.from(PRIORITY_RANK_WORDS),
    ...getCustomDictionary()
  ];
  instance.personal(personalLines.join('\n'));
  spellInstance = instance;
  dictionaryReady = true;
  dictionaryError = null;
  suggestionCache.clear();
  return true;
}

// --- Roman numeral & identifier helpers ---
const ROMAN_REGEX = /^(?=[MDCLXVI]+$)M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;

function shouldSkipWord(rawWord) {
  if (!rawWord || rawWord.length < 2) return true;
  if (/[0-9_]/.test(rawWord)) return true; // numbers, equipment tags like P101, SS316, snake_case
  if (/^[A-Z]{1,4}$/.test(rawWord)) return true; // short ALL-CAPS instrumentation/system tags (PT, XV, PSV, ESD)
  if (rawWord.length >= 2 && ROMAN_REGEX.test(rawWord)) return true;
  return false;
}

function normalizeApostrophes(str) {
  return str.replace(/[\u2018\u2019]/g, "'");
}

/**
 * Checks whether a single cleaned token (no spaces/hyphens) is valid.
 */
export function isWordValid(word, ignoredSet = null) {
  if (!word) return true;
  const normalized = normalizeApostrophes(word);
  if (shouldSkipWord(normalized)) return true;

  const lower = normalized.toLowerCase();
  if (ignoredSet && ignoredSet.has(lower)) return true;
  if (psmLowerSet.has(lower)) return true;
  if (getCustomLowerSet().has(lower)) return true;
  if (VALID_CONTRACTIONS.has(lower)) return true;

  // Handle possessive forms like "operator's" or "operators'"
  if (lower.endsWith("'s") && lower.length > 3) {
    const base = normalized.slice(0, -2);
    if (isWordValid(base, ignoredSet)) return true;
  } else if (lower.endsWith("'") && lower.length > 2) {
    const base = normalized.slice(0, -1);
    if (isWordValid(base, ignoredSet)) return true;
  }

  if (!spellInstance) {
    // Dictionary still loading -> don't report false errors
    return true;
  }

  if (spellInstance.correct(normalized)) return true;
  // Also allow lowercase check when capitalized at start of sentence / title case
  if (normalized !== lower && /^[A-Z][a-z]+$/.test(normalized)) {
    if (spellInstance.correct(lower)) return true;
  }
  // Allow ALL-CAPS words >= 5 letters if their lowercase is valid (e.g., PRESSURE, VALVE)
  if (normalized.length >= 5 && normalized === normalized.toUpperCase()) {
    if (spellInstance.correct(lower)) return true;
  }

  return false;
}

/**
 * Tokenizes text into checkable word spans, skipping URLs, emails, tags, and numbers.
 */
export function tokenizeText(text) {
  if (!text || typeof text !== 'string') return [];

  // Build exclusion ranges for URLs and email addresses
  const excludedRanges = [];
  const urlOrEmailRegex = /(?:https?:\/\/|www\.)\S+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/gi;
  let exMatch;
  while ((exMatch = urlOrEmailRegex.exec(text)) !== null) {
    excludedRanges.push([exMatch.index, exMatch.index + exMatch[0].length]);
  }

  const isExcluded = (start, end) =>
    excludedRanges.some(([es, ee]) => start >= es && end <= ee);

  const tokens = [];
  const tokenRegex = /[A-Za-z0-9_'\u2018\u2019-]+/g;
  let match;

  while ((match = tokenRegex.exec(text)) !== null) {
    let raw = match[0];
    let start = match.index;
    let end = start + raw.length;

    // Trim leading/trailing punctuation (- or ')
    while (raw.length > 0 && /^[-'\u2018\u2019]/.test(raw)) {
      raw = raw.slice(1);
      start += 1;
    }
    while (raw.length > 0 && /[-'\u2018\u2019]$/.test(raw)) {
      // Keep trailing apostrophe only if possessive like s'
      if (raw.endsWith("'") && raw.length >= 2 && /s$/i.test(raw.slice(0, -1))) {
        break;
      }
      raw = raw.slice(0, -1);
      end -= 1;
    }

    if (!raw || raw.length < 2) continue;
    if (isExcluded(start, end)) continue;
    if (/[0-9_]/.test(raw)) continue; // skips P-101, SS316, V_201, etc.

    if (raw.includes('-')) {
      // Split hyphenated compound words (e.g., "over-pressue" -> check each alphabetic segment)
      let offset = 0;
      const parts = raw.split('-');
      for (const part of parts) {
        if (part.length >= 2 && !shouldSkipWord(part)) {
          tokens.push({
            word: part,
            start: start + offset,
            end: start + offset + part.length
          });
        }
        offset += part.length + 1;
      }
    } else if (!shouldSkipWord(raw)) {
      tokens.push({ word: raw, start, end });
    }
  }

  return tokens;
}

/**
 * Returns misspelled word occurrences in text: [{ word, start, end }].
 * If skipWordTouchingCaret is true, the token the user is currently typing is skipped.
 */
export function checkText(text, options = {}) {
  if (!dictionaryReady || !text || typeof text !== 'string') return [];

  const {
    caretPos = null,
    skipWordTouchingCaret = false
  } = options;

  const ignoredSet = getIgnoredWords();
  const tokens = tokenizeText(text);
  const misspellings = [];

  for (const tok of tokens) {
    if (
      skipWordTouchingCaret &&
      typeof caretPos === 'number' &&
      caretPos >= tok.start &&
      caretPos <= tok.end
    ) {
      continue;
    }

    if (!isWordValid(tok.word, ignoredSet)) {
      misspellings.push(tok);
    }
  }

  return misspellings;
}

// --- Edit Distance & Suggestion Ranking ---
export function damerauLevenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, dp[i - 2][j - 2] + cost);
      }
      dp[i][j] = best;
    }
  }
  return dp[m][n];
}

export function matchWordCase(sourceWord, targetWord) {
  if (!sourceWord || !targetWord) return targetWord;
  // Preserve uppercase domain acronyms like HAZOP, PSV, LOPA
  if (psmCanonicalMap.has(targetWord.toLowerCase())) {
    const canonical = psmCanonicalMap.get(targetWord.toLowerCase());
    if (canonical === canonical.toUpperCase() && canonical.length >= 2) {
      return canonical;
    }
  }
  if (sourceWord.length >= 2 && sourceWord === sourceWord.toUpperCase()) {
    return targetWord.toUpperCase();
  }
  if (/^[A-Z]/.test(sourceWord) && targetWord[0] === targetWord[0].toLowerCase()) {
    return targetWord.charAt(0).toUpperCase() + targetWord.slice(1);
  }
  return targetWord;
}

export function getSuggestions(word, limit = 6) {
  if (!word || typeof word !== 'string') return [];
  const normalized = normalizeApostrophes(word.trim());
  if (!normalized) return [];

  const cacheKey = `${normalized}|${limit}`;
  if (suggestionCache.has(cacheKey)) {
    return suggestionCache.get(cacheKey);
  }

  const lower = normalized.toLowerCase();
  const candidates = new Map(); // lower -> { text, priorityBoost }
  const customLowerSet = getCustomLowerSet();

  const addCandidate = (cand, boost = 0) => {
    if (!cand) return;
    const cLow = cand.toLowerCase();
    if (cLow === lower) return;
    const existing = candidates.get(cLow);
    if (!existing || boost > existing.boost) {
      candidates.set(cLow, { text: cand, boost });
    }
  };

  // 1. Common Typo Map exact match
  if (COMMON_TYPO_MAP[lower]) {
    addCandidate(COMMON_TYPO_MAP[lower], 100);
  }

  // 2. Domain & Custom Dictionary fuzzy matches (fast scan ~350 words)
  const maxDist = lower.length <= 4 ? 1 : 2;
  const domainAndCustom = [...psmWordList, ...getCustomDictionary()];
  for (const dw of domainAndCustom) {
    const dwLow = dw.toLowerCase();
    if (Math.abs(dwLow.length - lower.length) > maxDist) continue;
    const dist = damerauLevenshtein(lower, dwLow);
    if (dist <= maxDist) {
      addCandidate(dw, 40 - dist * 10);
    }
  }

  // 3. Hunspell suggestions
  if (spellInstance) {
    const rawSugg = spellInstance.suggest(normalized) || [];
    rawSugg.forEach((s, idx) => addCandidate(s, Math.max(0, 15 - idx)));

    if (normalized !== lower) {
      const lowSugg = spellInstance.suggest(lower) || [];
      lowSugg.forEach((s, idx) => addCandidate(s, Math.max(0, 14 - idx)));
    }
  }

  // 4. Score & rank all candidates
  const scored = Array.from(candidates.values()).map(({ text, boost }) => {
    const tLow = text.toLowerCase();
    const dist = damerauLevenshtein(lower, tLow);
    let score = boost;

    // Strongly prefer closer edit distances
    score -= dist * 35;

    // Boost common English & PSM priority words over obscure dictionary words
    if (PRIORITY_RANK_WORDS.has(tLow) || psmLowerSet.has(tLow) || customLowerSet.has(tLow)) {
      score += 28;
    }

    // Same first letter bonus
    if (tLow[0] === lower[0]) {
      score += 6;
    }

    // Penalize split two-word suggestions unless single words are scarce
    if (text.includes(' ')) {
      score -= 12;
    }

    return {
      text: matchWordCase(normalized, text),
      score
    };
  });

  scored.sort((a, b) => b.score - a.score);

  const result = [];
  const seenOut = new Set();
  for (const item of scored) {
    const key = item.text.toLowerCase();
    if (!seenOut.has(key)) {
      seenOut.add(key);
      result.push(item.text);
      if (result.length >= limit) break;
    }
  }

  if (suggestionCache.size > 500) {
    suggestionCache.clear();
  }
  suggestionCache.set(cacheKey, result);
  return result;
}

/**
 * Returns a safe, high-confidence auto-correction for a completed word, or null if ambiguous.
 */
export function getAutoCorrection(word) {
  if (!dictionaryReady || !word || typeof word !== 'string') return null;
  const normalized = normalizeApostrophes(word.trim());
  if (normalized.length < 3) return null;

  // Never auto-correct tokens with digits, underscores, hyphens, or short ALL-CAPS tags
  if (/[0-9_-]/.test(normalized)) return null;
  if (/^[A-Z]{2,5}$/.test(normalized)) return null;
  if (/[a-z][A-Z]/.test(normalized)) return null;

  const ignoredSet = getIgnoredWords();
  if (isWordValid(normalized, ignoredSet)) return null;

  const lower = normalized.toLowerCase();

  // 1. High-confidence explicit typo map
  if (COMMON_TYPO_MAP[lower]) {
    return matchWordCase(normalized, COMMON_TYPO_MAP[lower]);
  }

  // 2. For words >= 5 chars, auto-correct only if there's a clear distance-1 winner
  if (normalized.length >= 5) {
    const suggs = getSuggestions(normalized, 4);
    if (suggs.length > 0) {
      const top = suggs[0];
      const topLow = top.toLowerCase();
      if (!top.includes(' ') && damerauLevenshtein(lower, topLow) === 1) {
        const secondDist = suggs[1]
          ? damerauLevenshtein(lower, suggs[1].toLowerCase())
          : 99;
        const topIsPriority = PRIORITY_RANK_WORDS.has(topLow) || psmLowerSet.has(topLow);
        const secondIsPriority = suggs[1]
          ? (PRIORITY_RANK_WORDS.has(suggs[1].toLowerCase()) || psmLowerSet.has(suggs[1].toLowerCase()))
          : false;

        if (secondDist > 1 || (topIsPriority && !secondIsPriority)) {
          return top;
        }
      }
    }
  }

  return null;
}
