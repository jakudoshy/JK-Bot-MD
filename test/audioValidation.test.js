'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { identifyAudio, safeAudioUrl, downloadValidatedAudio } = require('../lib/audioValidation');

test('identifica MP3 y WAV por firma, no por extensión del enlace', () => {
  assert.equal(identifyAudio(Buffer.concat([Buffer.from('ID3'), Buffer.alloc(16)])).extension, 'mp3');
  const wav = Buffer.alloc(16); wav.write('RIFF', 0, 'ascii'); wav.write('WAVE', 8, 'ascii');
  assert.equal(identifyAudio(wav).mime, 'audio/wav');
});

test('rechaza direcciones locales y páginas HTML con aspecto de descarga de audio', async () => {
  assert.equal(safeAudioUrl('http://127.0.0.1/audio.mp3'), null);
  assert.equal(safeAudioUrl('file:///tmp/audio.mp3'), null);
  const htmlClient = { get: async () => ({ data: Buffer.from('<html>error</html>'), headers: { 'content-type': 'text/html' } }) };
  await assert.rejects(downloadValidatedAudio('https://media.example/audio.mp3', htmlClient), /página de error/i);
});

test('descarga solo devuelve audio con firma reconocida y nombre de archivo limpio', async () => {
  const mp3 = Buffer.concat([Buffer.from([0xff, 0xfb, 0x90, 0x64]), Buffer.alloc(20)]);
  const client = { get: async (url, options) => {
    assert.equal(url, 'https://media.example/track');
    assert.equal(options.responseType, 'arraybuffer');
    return { data: mp3, headers: { 'content-type': 'application/octet-stream' } };
  } };
  const result = await downloadValidatedAudio('https://media.example/track', client);
  assert.equal(result.format.extension, 'mp3');
  assert.deepEqual(result.buffer, mp3);
});


test('el flujo de /cancion prueba proveedores alternativos y solo devuelve MP3 reproducible', async () => {
  const song = require('../commands/song');
  const mp3 = Buffer.concat([Buffer.from('ID3'), Buffer.alloc(24)]);
  const providers = [
    { name: 'caído', resolve: async () => ({ download: 'https://media.example/broken' }) },
    { name: 'respaldo', resolve: async () => ({ download: 'https://media.example/track', title: 'Mi canción' }) }
  ];
  const client = { get: async url => url.endsWith('/broken')
    ? ({ data: Buffer.from('<html>falló</html>'), headers: { 'content-type': 'text/html' } })
    : ({ data: mp3, headers: { 'content-type': 'audio/mpeg' } }) };
  const result = await song.prepareAudio('https://youtube.com/watch?v=test', 'Título', providers, client);
  assert.equal(result.provider, 'respaldo');
  assert.equal(result.title, 'Mi canción');
  assert.deepEqual(result.buffer, mp3);
});


test('el comando /cancion sin búsqueda responde con instrucciones sin llamar proveedores', async () => {
  const song = require('../commands/song');
  const sent = [];
  const sock = { sendMessage: async (_jid, payload) => { sent.push(payload.text); } };
  await song(sock, 'chat@s.whatsapp.net', { message: { conversation: '/cancion' } });
  assert.match(sent[0], /Uso: \/cancion nombre o enlace de YouTube/i);
});
