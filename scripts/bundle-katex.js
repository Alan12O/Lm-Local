// scripts/bundle-katex.js
// Ejecuta: node scripts/bundle-katex.js
// Genera src/assets/katexBundle.ts con KaTeX embebido para uso offline.
const fs = require('fs');
const path = require('path');

const js = fs.readFileSync(path.join('node_modules', 'katex', 'dist', 'katex.min.js'), 'utf8');
const css = fs.readFileSync(path.join('node_modules', 'katex', 'dist', 'katex.min.css'), 'utf8');

// Escape for TypeScript template literal
function escapeForTS(s) {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

const output = `// AUTO-GENERATED. No editar manualmente.
// Genera con: node scripts/bundle-katex.js
// KaTeX version 0.16.x empaquetado desde node_modules para uso offline.
export const KATEX_JS = \`${escapeForTS(js)}\`;
export const KATEX_CSS = \`${escapeForTS(css)}\`;
`;

const outDir = path.join(__dirname, '..', 'src', 'assets');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'katexBundle.ts');
fs.writeFileSync(outPath, output, 'utf8');
console.log('Generado:', outPath, 'Tamaño:', output.length, 'bytes');
