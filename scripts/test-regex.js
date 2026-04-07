// test-regex.js
function preprocessMarkdown(text) {
  if (!text) return '';
  let processed = text;
  // Block math
  processed = processed.replace(/(?:\*\*|__)?[`]?\$\$\s*([\s\S]+?)\s*\$\$[`]?(?:\*\*|__)?/g, '\n\n```math-block\n$1\n```\n\n');
  // Inline math
  processed = processed.replace(/(?:\*\*|__)?[`]?\$([^\$\n]+?)\$[`]?(?:\*\*|__)?/g, '\n\n```math-inline\n$1\n```\n\n');
  return processed;
}

const input = 'La expresion $5x^2$ se escribe. Display: $$5x^2$$ y bold **$5x^2$** fin';
const result = preprocessMarkdown(input);
console.log('=== INPUT ===');
console.log(input);
console.log('=== OUTPUT ===');
console.log(result);

// Also test the latexToUnicode function concept
const SUPER = {'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','n':'ⁿ','x':'ˣ'};
function toSuper(s) { return s.split('').map(c => SUPER[c] || c).join(''); }
function simpleLatex(latex) {
  let r = latex;
  r = r.replace(/\^{([^}]+)}/g, (_, g) => toSuper(g));
  r = r.replace(/\^(.)/g, (_, c) => toSuper(c));
  return r;
}
console.log('=== MATH TEST ===');
console.log('5x^2 =>', simpleLatex('5x^2'));
console.log('5x^{2} =>', simpleLatex('5x^{2}'));
console.log('x^{2n+1} =>', simpleLatex('x^{2n+1}'));
