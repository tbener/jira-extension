const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist-dev');

fs.rmSync(distDir, { recursive: true, force: true });
fs.cpSync(srcDir, distDir, { recursive: true });

const manifestPath = path.join(distDir, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

if (!manifest.name.includes('(DEV)')) {
    manifest.name = `${manifest.name} (DEV)`;
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4) + '\n');

console.log(`Dev build ready at ${distDir}`);
console.log('Load it via chrome://extensions -> Load unpacked');
