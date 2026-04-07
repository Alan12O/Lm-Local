import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import { FONTS } from '../constants';

interface MathRendererProps {
  latex: string;
  inline?: boolean;
}

// ─── Unicode lookup tables ───────────────────────────────────────────
const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  'n': 'ⁿ', 'i': 'ⁱ', 'x': 'ˣ', 'y': 'ʸ',
  'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ',
  'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ', 'j': 'ʲ', 'k': 'ᵏ',
  'l': 'ˡ', 'm': 'ᵐ', 'o': 'ᵒ', 'p': 'ᵖ', 'r': 'ʳ',
  's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ', 'v': 'ᵛ', 'w': 'ʷ',
  'z': 'ᶻ',
};

const SUBSCRIPT_MAP: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
  'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ',
  'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ',
  'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ',
  'v': 'ᵥ', 'x': 'ₓ',
};

const GREEK_MAP: Record<string, string> = {
  '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ',
  '\\epsilon': 'ε', '\\zeta': 'ζ', '\\eta': 'η', '\\theta': 'θ',
  '\\iota': 'ι', '\\kappa': 'κ', '\\lambda': 'λ', '\\mu': 'μ',
  '\\nu': 'ν', '\\xi': 'ξ', '\\pi': 'π', '\\rho': 'ρ',
  '\\sigma': 'σ', '\\tau': 'τ', '\\upsilon': 'υ', '\\phi': 'φ',
  '\\chi': 'χ', '\\psi': 'ψ', '\\omega': 'ω',
  '\\Alpha': 'Α', '\\Beta': 'Β', '\\Gamma': 'Γ', '\\Delta': 'Δ',
  '\\Epsilon': 'Ε', '\\Zeta': 'Ζ', '\\Eta': 'Η', '\\Theta': 'Θ',
  '\\Iota': 'Ι', '\\Kappa': 'Κ', '\\Lambda': 'Λ', '\\Mu': 'Μ',
  '\\Nu': 'Ν', '\\Xi': 'Ξ', '\\Pi': 'Π', '\\Rho': 'Ρ',
  '\\Sigma': 'Σ', '\\Tau': 'Τ', '\\Upsilon': 'Υ', '\\Phi': 'Φ',
  '\\Chi': 'Χ', '\\Psi': 'Ψ', '\\Omega': 'Ω',
};

const SYMBOL_MAP: Record<string, string> = {
  '\\times': '×', '\\cdot': '·', '\\div': '÷',
  '\\pm': '±', '\\mp': '∓', '\\neq': '≠', '\\ne': '≠',
  '\\leq': '≤', '\\le': '≤', '\\geq': '≥', '\\ge': '≥',
  '\\approx': '≈', '\\equiv': '≡', '\\sim': '∼',
  '\\infty': '∞', '\\partial': '∂', '\\nabla': '∇',
  '\\forall': '∀', '\\exists': '∃',
  '\\in': '∈', '\\notin': '∉', '\\subset': '⊂', '\\supset': '⊃',
  '\\subseteq': '⊆', '\\supseteq': '⊇',
  '\\cup': '∪', '\\cap': '∩', '\\emptyset': '∅',
  '\\to': '→', '\\rightarrow': '→', '\\leftarrow': '←',
  '\\Rightarrow': '⇒', '\\Leftarrow': '⇐', '\\Leftrightarrow': '⇔',
  '\\sum': 'Σ', '\\prod': 'Π', '\\int': '∫',
  '\\sqrt': '√', '\\angle': '∠', '\\degree': '°',
  '\\circ': '∘', '\\bullet': '•', '\\dots': '…', '\\cdots': '⋯',
  '\\ldots': '…', '\\vdots': '⋮',
  '\\langle': '⟨', '\\rangle': '⟩',
  '\\lfloor': '⌊', '\\rfloor': '⌋', '\\lceil': '⌈', '\\rceil': '⌉',
  '\\prime': '′',
  '\\neg': '¬', '\\land': '∧', '\\lor': '∨',
  '\\perp': '⊥', '\\parallel': '∥',
  '\\triangle': '△',
  '\\star': '⋆',
  '\\hbar': 'ℏ', '\\ell': 'ℓ',
  '\\ ': ' ', '\\,': ' ', '\\;': ' ', '\\!': '',
  '\\quad': '  ', '\\qquad': '    ',
  '\\left': '', '\\right': '',
  '\\Big': '', '\\big': '', '\\bigg': '', '\\Bigg': '',
};

/**
 * Convert a group of characters into Unicode superscript.
 */
function toSuperscript(s: string): string {
  return s.split('').map(c => SUPERSCRIPT_MAP[c] ?? c).join('');
}

/**
 * Convert a group of characters into Unicode subscript.
 */
function toSubscript(s: string): string {
  return s.split('').map(c => SUBSCRIPT_MAP[c] ?? c).join('');
}

/**
 * Parse a brace-delimited group or a single character after a position.
 * Returns [content, newIndex].
 */
function parseGroup(latex: string, pos: number): [string, number] {
  if (pos >= latex.length) return ['', pos];
  if (latex[pos] === '{') {
    const close = findMatchingBrace(latex, pos);
    if (close === -1) return [latex.substring(pos + 1), latex.length];
    return [latex.substring(pos + 1, close), close + 1];
  }
  return [latex[pos], pos + 1];
}

function findMatchingBrace(s: string, openPos: number): number {
  let depth = 1;
  for (let i = openPos + 1; i < s.length; i++) {
    if (s[i] === '{') depth++;
    if (s[i] === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

/**
 * Convert a LaTeX string to a Unicode-rich plain text string.
 * Handles: superscripts, subscripts, fractions, Greek letters, symbols.
 */
export function latexToUnicode(latex: string): string {
  let result = '';
  let i = 0;

  while (i < latex.length) {
    // ── Superscript: ^{...} or ^x ──
    if (latex[i] === '^') {
      const [group, newI] = parseGroup(latex, i + 1);
      result += toSuperscript(latexToUnicode(group));
      i = newI;
      continue;
    }

    // ── Subscript: _{...} or _x ──
    if (latex[i] === '_') {
      const [group, newI] = parseGroup(latex, i + 1);
      result += toSubscript(latexToUnicode(group));
      i = newI;
      continue;
    }

    // ── \frac{num}{den} → num/den ──
    if (latex.startsWith('\\frac', i)) {
      i += 5; // skip \frac
      const [num, afterNum] = parseGroup(latex, i);
      const [den, afterDen] = parseGroup(latex, afterNum);
      const uNum = latexToUnicode(num);
      const uDen = latexToUnicode(den);
      // Try superscript/subscript fraction for single-char numerator/denominator
      if (uNum.length <= 2 && uDen.length <= 2) {
        result += toSuperscript(uNum) + '⁄' + toSubscript(uDen);
      } else {
        result += '(' + uNum + ')/(' + uDen + ')';
      }
      i = afterDen;
      continue;
    }

    // ── \sqrt{...} or \sqrt[n]{...} → √(...) or ⁿ√(...) ──
    if (latex.startsWith('\\sqrt', i)) {
      i += 5;
      let nthRoot = '';
      if (i < latex.length && latex[i] === '[') {
        const closeBracket = latex.indexOf(']', i);
        if (closeBracket !== -1) {
          nthRoot = toSuperscript(latex.substring(i + 1, closeBracket));
          i = closeBracket + 1;
        }
      }
      const [group, newI] = parseGroup(latex, i);
      result += nthRoot + '√(' + latexToUnicode(group) + ')';
      i = newI;
      continue;
    }

    // ── \text{...} or \mathrm{...} or \textbf{...} → plain text ──
    if (latex.startsWith('\\text', i) || latex.startsWith('\\mathrm', i) || latex.startsWith('\\mathbf', i)) {
      const cmdEnd = latex.indexOf('{', i);
      if (cmdEnd !== -1) {
        const [group, newI] = parseGroup(latex, cmdEnd);
        result += group;
        i = newI;
      } else {
        i++;
      }
      continue;
    }

    // ── Backslash commands: Greek letters and symbols ──
    if (latex[i] === '\\') {
      // Find the full command
      let cmd = '\\';
      let j = i + 1;
      if (j < latex.length && /[a-zA-Z]/.test(latex[j])) {
        while (j < latex.length && /[a-zA-Z]/.test(latex[j])) { cmd += latex[j]; j++; }
      } else if (j < latex.length) {
        // Single non-alpha char commands like \, \; \! etc.
        cmd += latex[j];
        j++;
      }

      const greek = GREEK_MAP[cmd];
      if (greek) { result += greek; i = j; continue; }

      const symbol = SYMBOL_MAP[cmd];
      if (symbol !== undefined) { result += symbol; i = j; continue; }

      // Unknown command — keep as-is
      result += cmd;
      i = j;
      continue;
    }

    // ── Strip braces (grouping) ──
    if (latex[i] === '{' || latex[i] === '}') {
      i++;
      continue;
    }

    // ── Regular character ──
    result += latex[i];
    i++;
  }

  return result;
}

/**
 * Renders LaTeX as styled native Text using Unicode conversion.
 * No WebView, no internet, no fonts needed. Works 100% offline.
 *
 * IMPORTANT: Always returns a <Text> component, never a <View>.
 * This is critical because the markdown renderer may place this inside
 * a <Text> node, and Android crashes silently when <View> is nested inside <Text>.
 */
export const MathRenderer: React.FC<MathRendererProps> = ({ latex, inline = false }) => {
  const { colors } = useTheme();

  const rendered = latexToUnicode(latex);

  return (
    <Text
      style={[
        inline ? styles.mathText : styles.mathTextBlock,
        { color: colors.text, backgroundColor: inline ? undefined : colors.surfaceLight },
      ]}
    >
      {rendered}
    </Text>
  );
};

const styles = StyleSheet.create({
  mathText: {
    fontFamily: FONTS.mono,
    fontSize: 15,
    letterSpacing: 0.3,
  },
  mathTextBlock: {
    fontFamily: FONTS.mono,
    fontSize: 17,
    letterSpacing: 0.5,
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginVertical: 4,
  },
});
