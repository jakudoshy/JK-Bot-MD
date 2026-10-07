'use strict';

const MAX_AUDIO_BYTES = 24 * 1024 * 1024;
const MAX_WHATSAPP_AUDIO_BYTES = 16 * 1024 * 1024;

function identifyAudio(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 8) return null;
  if (buffer.subarray(0, 3).toString('ascii') === 'ID3') return { extension: 'mp3', mime: 'audio/mpeg' };
  if (buffer[0] === 0xff && (buffer[1] === 0xf1 || buffer[1] === 0xf9)) return { extension: 'aac', mime: 'audio/aac' };
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) return { extension: 'mp3', mime: 'audio/mpeg' };
  if (buffer.subarray(0, 4).toString('ascii') === 'OggS') return { extension: 'ogg', mime: 'audio/ogg' };
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WAVE') return { extension: 'wav', mime: 'audio/wav' };
  if (buffer.subarray(0, 4).toString('ascii') === 'fLaC') return { extension: 'flac', mime: 'audio/flac' };
  if (buffer.subarray(0, 4).toString('hex') === '1a45dfa3') return { extension: 'webm', mime: 'audio/webm' };
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') return { extension: 'm4a', mime: 'audio/mp4' };
  return null;
}

function safeAudioUrl(value) {
  try {
    const url = new URL(String(value || ''));
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.localhost') || host === '::1' || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) return null;
    return url.toString();
  } catch { return null; }
}

async function downloadValidatedAudio(url, client) {
  const safeUrl = safeAudioUrl(url);
  if (!safeUrl) throw new Error('La fuente de audio devolvió una dirección no válida.');
  const response = await client.get(safeUrl, {
    responseType: 'arraybuffer', timeout: 45000,
    maxContentLength: MAX_AUDIO_BYTES, maxBodyLength: MAX_AUDIO_BYTES,
    validateStatus: status => status >= 200 && status < 300,
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'audio/*,application/octet-stream;q=0.9,*/*;q=0.1' }
  });
  const contentType = String(response.headers?.['content-type'] || '').toLowerCase();
  if (/text\/html|application\/(?:json|xml)/.test(contentType)) throw new Error('La fuente devolvió una página de error, no un archivo de audio.');
  const buffer = Buffer.isBuffer(response.data) ? response.data : Buffer.from(response.data || []);
  if (!buffer.length) throw new Error('La descarga llegó vacía.');
  if (buffer.length > MAX_AUDIO_BYTES) throw new Error('El audio supera el límite seguro de descarga.');
  const format = identifyAudio(buffer);
  if (!format) throw new Error('El archivo descargado no tiene un formato de audio reconocido.');
  return { buffer, format };
}

function safeFilename(value) {
  const name = String(value || 'audio').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, ' ').slice(0, 90);
  return name || 'audio';
}

function isYouTubeUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'www.youtu.be'].includes(url.hostname.toLowerCase());
  } catch { return false; }
}

module.exports = { MAX_AUDIO_BYTES, MAX_WHATSAPP_AUDIO_BYTES, identifyAudio, safeAudioUrl, downloadValidatedAudio, safeFilename, isYouTubeUrl };
