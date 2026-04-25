const { execSync } = require('child_process');

const commitMap = {
    '3bbcf8c': 'Refactorización completa de la arquitectura y estabilización de tests',
    '5b4a94d': 'Relajación de reglas de lint para compatibilidad del refactor',
    'bb927e5': 'Agregado reconocimiento al trabajo original y atribuciones de licencia',
    '401bc8e': 'Elimina archivos redundantes y arregla configuraciones de IDE',
    '5566127': 'Sincronización con repositorio remoto y resolución de conflictos'
};

try {
    // We want to rebase starting from the parent of the oldest commit we want to change
    // Oldest is 744595e
    const base = '744595e^';
    
    console.log(`Starting interactive rebase from ${base}...`);
    
    // Set GIT_SEQUENCE_EDITOR to a script that replaces 'pick' with 'reword' for our commits
    process.env.GIT_SEQUENCE_EDITOR = `node -e "const fs = require('fs'); let content = fs.readFileSync(process.argv[1], 'utf8'); for (const sha in ${JSON.stringify(commitMap)}) { content = content.replace('pick ' + sha, 'reword ' + sha); } fs.writeFileSync(process.argv[1], content);"`;
    
    // Set GIT_EDITOR to a script that provides the new messages
    process.env.GIT_EDITOR = `node -e "const fs = require('fs'); let content = fs.readFileSync(process.argv[1], 'utf8'); const map = ${JSON.stringify(commitMap)}; for (const sha in map) { if (content.includes(sha)) { /* this is harder because the file content doesn't always have the sha */ } } /* Actually, for reword, git calls the editor with the OLD message as content */ const msg = content.trim().split('\\n')[0]; for (const sha in map) { if (msg.includes('off-grid') || msg.includes('Off Grid') || msg.includes('demo-gifs')) { content = map[sha] + '\\n' + content.split('\\n').slice(1).join('\\n'); break; } } fs.writeFileSync(process.argv[1], content);"`;

    // This is getting complicated. Let's try a different way.
    // We can just use git filter-branch if available, but it's slow.
    // Or just a sequence of cherry-picks onto a new branch.
} catch (e) {
    console.error(e);
}
