import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const rendererRoot = resolve(repoRoot, 'renderer');
const outputDir = resolve(rendererRoot, '.pages');

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

cpSync(resolve(rendererRoot, 'demo-booking-bundled.html'), resolve(outputDir, 'index.html'));
cpSync(resolve(rendererRoot, 'demo-booking-bundled.html'), resolve(outputDir, 'demo-booking-bundled.html'));
cpSync(resolve(rendererRoot, 'demo-venue.json'), resolve(outputDir, 'demo-venue.json'));
cpSync(resolve(rendererRoot, 'dist'), resolve(outputDir, 'dist'), { recursive: true });

// Disable Jekyll processing so asset paths are served exactly as emitted.
writeFileSync(resolve(outputDir, '.nojekyll'), '');

console.log(`Prepared GitHub Pages artifact at ${outputDir}`);