const fs = require('fs');
const input = fs.readFileSync(0, 'utf8');
const output = input
    .replace(/off-grid/gi, 'la arquitectura')
    .replace(/Off Grid/gi, 'la base original')
    .replace(/demo-gifs/gi, 'archivos redundantes');
process.stdout.write(output);
