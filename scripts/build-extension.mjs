import { createWriteStream, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(rootDir, 'dist-zip');
const manifest = JSON.parse(readFileSync(join(rootDir, 'manifest.json'), 'utf8'));
const outFile = join(outDir, `url-webhook-clipper-v${manifest.version}.zip`);

// Only the files Chrome actually loads per manifest.json - not the Vite/React
// scaffold (src/, index.html) or the stale root-level popup.html/popup.js.
const entries = [
  { type: 'file', path: 'manifest.json' },
  { type: 'file', path: 'background.js' },
  { type: 'dir', path: 'popup' },
  { type: 'dir', path: 'icons' },
];

mkdirSync(outDir, { recursive: true });

const output = createWriteStream(outFile);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`Wrote ${outFile} (${archive.pointer()} bytes)`);
});

archive.on('warning', (err) => {
  throw err;
});
archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);

for (const entry of entries) {
  const fullPath = join(rootDir, entry.path);
  if (entry.type === 'file') {
    archive.file(fullPath, { name: entry.path });
  } else {
    archive.directory(fullPath, entry.path);
  }
}

await archive.finalize();
