import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'icons');
await mkdir(out, { recursive: true });

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0c1016"/>
  <circle cx="256" cy="256" r="210" fill="#1a2430"/>
  <circle cx="256" cy="248" r="96" fill="#3aa8c4"/>
  <circle cx="256" cy="248" r="58" fill="#d45a28"/>
  <rect x="196" y="330" width="120" height="28" rx="8" fill="#c4a05a"/>
</svg>`;

const png = (size, file) => sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(out, file));
await png(192, 'icon-192.png');
await png(512, 'icon-512.png');
await png(512, 'icon-512-maskable.png');
console.log('Wrote public/icons');
