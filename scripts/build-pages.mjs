import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const frontend = path.join(root, 'frontend');
const destination = path.join(root, 'dist');
const apiBaseUrl = (process.env.CARDANO_API_URL || '').trim().replace(/\/+$/, '');

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(frontend, destination, { recursive: true });
await writeFile(
  path.join(destination, 'config.js'),
  `window.CARDANO_LAB_CONFIG = Object.freeze(${JSON.stringify({ apiBaseUrl })});\n`,
  'utf8',
);
await writeFile(path.join(destination, '.nojekyll'), '', 'utf8');

console.log(`GitHub Pages build created at ${destination}`);
