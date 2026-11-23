import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import pieces from './dist/piezas.js';

const root = fileURLToPath(new URL('./dist', import.meta.url));
const cache = fileURLToPath(new URL('./.vistas', import.meta.url));
const port = Number(process.env.SUBSUELO_PORT || 8774);
const apiKey = process.env.POLLINATIONS_API_KEY?.trim();
const model = 'seedream5';
const angles = ['front', 'three-quarter view showing the mannequin’s left side', 'rear'];
const mimeTypes = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8',
};
const catalog = new Map(pieces.filter(piece => piece.outfitSlot).map(piece => [
  piece.id, { name: piece.name, slots: [piece.outfitSlot, ...(piece.covers ?? [])] },
]));
let activeGeneration;

function json(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(payload));
}

function selectionFor(input) {
  if (!input || !['hombre', 'mujer'].includes(input.model) ||
      !Array.isArray(input.items) || !input.items.length || input.items.length > catalog.size) return;
  const ids = [...input.items].sort();
  const occupied = new Set();
  for (const id of ids) {
    const piece = catalog.get(id);
    if (!piece || piece.slots.some(slot => occupied.has(slot))) return;
    piece.slots.forEach(slot => occupied.add(slot));
  }
  return { body: input.model, ids };
}

async function readSelection(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk.toString();
    if (body.length > 4096) return;
  }
  try { return selectionFor(JSON.parse(body)); } catch { return; }
}

async function referencesFor({ body, ids }) {
  return Promise.all(angles.map(async (_, view) => {
    const n = view + 1;
    return Promise.all([
      readFile(resolve(root, 'assets/outfit', body + '-' + n + '.png')),
      ...ids.map(id => readFile(resolve(root, 'assets/isolated', id + '-' + n + '.png'))),
    ]);
  }));
}

function photoType(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  throw new Error('Invalid image');
}

async function editPhoto(prompt, references) {
  const form = new FormData();
  form.set('model', model);
  form.set('prompt', prompt);
  form.set('size', '1024x1536');
  form.set('response_format', 'b64_json');
  references.forEach((bytes, index) => {
    const type = photoType(bytes);
    form.append('image', new Blob([bytes], { type }), 'reference-' + index + '.' + type.split('/')[1]);
  });
  const response = await fetch('https://gen.pollinations.ai/v1/images/edits', {
    method: 'POST', headers: { Authorization: 'Bearer ' + apiKey }, body: form,
    signal: AbortSignal.timeout(100_000),
  });
  if (!response.ok) {
    const error = new Error('Provider returned ' + response.status);
    error.status = response.status;
    throw error;
  }
  const payload = await response.json();
  const bytes = Buffer.from(payload.data?.[0]?.b64_json ?? '', 'base64');
  photoType(bytes);
  return bytes;
}

async function generate(selection, references, cacheFile) {
  const pieces = selection.ids.map(id => catalog.get(id).name).join(', ');
  const photos = [];
  for (const [index, angle] of angles.entries()) {
    const prompt = [
      index === 0 ? 'Reference 1 is a retail mannequin with plain base clothes.'
        : 'Reference 1 is the finished front view. Reference 2 gives the exact target mannequin pose.',
      'The remaining references, in order, are the requested catalog pieces: ' + pieces + '.',
      'Create one photorealistic full-length studio photo of the mannequin in a ' + angle + '.',
      'Dress the mannequin in every requested piece. Keep plain charcoal base clothing only where needed and keep plain black shoes unless shoes are provided.',
      'Keep garment color, cut, details, body shape and camera distance. Use a plain dark plum studio background and soft lighting.',
      'A crossbody bag stays on the mannequin’s left hip, with strap from its right shoulder, even from behind. Keep the cap aligned to the head with brim pointing forward.',
      'Preserve natural folds and occlusion. No extra accessories, text, collage or multiple figures.',
    ].join(' ');
    const inputs = index === 0 ? references[index] : [photos[0], ...references[index]];
    photos.push(await editPhoto(prompt, inputs));
  }
  const views = photos.map(bytes => 'data:' + photoType(bytes) + ';base64,' + bytes.toString('base64'));
  await mkdir(cache, { recursive: true });
  const temporary = cacheFile + '.tmp';
  await writeFile(temporary, JSON.stringify({ views }));
  await rename(temporary, cacheFile);
  return { views };
}

async function handle(request, response) {
  if (!['localhost:' + port, '127.0.0.1:' + port].includes(request.headers.host)) {
    return json(response, 403, { error: 'Vista previa local.' });
  }
  const url = new URL(request.url, 'http://127.0.0.1:' + port);
  if (url.pathname === '/api/probador' && request.method === 'GET') {
    return json(response, 200, { enabled: Boolean(apiKey) });
  }
  if (url.pathname === '/api/probador' && request.method === 'POST') {
    if (request.headers.origin !== 'http://' + request.headers.host ||
        request.headers['content-type'] !== 'application/json') {
      return json(response, 403, { error: 'Abrí el catálogo desde su servidor local.' });
    }
    const selection = await readSelection(request);
    if (!selection) return json(response, 400, { error: 'Revisá las piezas que elegiste.' });
    const references = await referencesFor(selection);
    const hash = createHash('sha256').update(JSON.stringify({ model, version: 1, selection }));
    for (const bytes of references.flat()) hash.update(createHash('sha256').update(bytes).digest());
    const cacheFile = resolve(cache, hash.digest('hex') + '.json');
    const saved = await readFile(cacheFile, 'utf8').catch(error => {
      if (error.code !== 'ENOENT') throw error;
    });
    if (saved) return json(response, 200, JSON.parse(saved));
    if (!apiKey) return json(response, 503, { error: 'La generación con IA está sin configurar.' });
    if (activeGeneration && activeGeneration.file !== cacheFile) {
      return json(response, 429, { error: 'Ya se está generando un conjunto. Probá cuando termine.' });
    }
    activeGeneration ??= {
      file: cacheFile,
      result: generate(selection, references, cacheFile).finally(() => { activeGeneration = undefined; }),
    };
    try {
      return json(response, 200, await activeGeneration.result);
    } catch (error) {
      console.error(error.message);
      const message = [402, 429].includes(error.status)
        ? 'El proveedor alcanzó su límite de saldo o de solicitudes.'
        : 'No pudimos generar las tres vistas. Probá de nuevo más tarde.';
      return json(response, 502, { error: message });
    }
  }
  if (request.method !== 'GET') return json(response, 405, { error: 'Método no permitido.' });
  const file = resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
  if (!file.startsWith(root + sep)) return json(response, 404, { error: 'Archivo no encontrado.' });
  const bytes = await readFile(file).catch(error => {
    if (error.code !== 'ENOENT' && error.code !== 'EISDIR') throw error;
  });
  if (!bytes) return json(response, 404, { error: 'Archivo no encontrado.' });
  response.writeHead(200, { 'Content-Type': mimeTypes[extname(file)] ?? 'application/octet-stream' });
  response.end(bytes);
}

createServer((request, response) => {
  handle(request, response).catch(error => {
    console.error(error.message);
    json(response, 500, { error: 'Hubo un problema con el probador.' });
  });
}).listen(port, '127.0.0.1', () => console.log('Subsuelo en http://127.0.0.1:' + port));
