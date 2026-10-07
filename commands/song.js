'use strict';

const axios = require('axios');
const yts = require('yt-search');
const { toAudio } = require('../lib/converter');
const { getDirectUrl } = require('../lib/youtube');
const {
  MAX_WHATSAPP_AUDIO_BYTES,
  downloadValidatedAudio,
  identifyAudio,
  safeFilename,
  isYouTubeUrl
} = require('../lib/audioValidation');

function readMessageText(message) {
  let content = message?.message || {};
  for (let depth = 0; depth < 5; depth++) {
    const nested = content?.ephemeralMessage?.message
      || content?.viewOnceMessage?.message
      || content?.viewOnceMessageV2?.message
      || content?.viewOnceMessageV2Extension?.message
      || content?.documentWithCaptionMessage?.message
      || content?.editedMessage?.message;
    if (!nested) break;
    content = nested;
  }
  const interactiveText = content?.buttonsResponseMessage?.selectedButtonId
    || content?.templateButtonReplyMessage?.selectedId
    || content?.listResponseMessage?.singleSelectReply?.selectedRowId;
  return String(content?.conversation
    || content?.extendedTextMessage?.text
    || content?.imageMessage?.caption
    || content?.videoMessage?.caption
    || content?.documentMessage?.caption
    || interactiveText
    || '').trim();
}

function extractSongQuery(value) {
  return String(value || '').replace(/^\s*\/(?:song|cancion)(?:@[a-z0-9._-]+)?(?=\s|$)\s*/i, '').trim();
}

function createProviders(videoUrl, fallbackTitle) {
  return [
    { name: 'CNV / yt-dlp', resolve: async () => ({ download: await getDirectUrl(videoUrl, 'bestaudio[ext=m4a]/bestaudio/best'), title: fallbackTitle }) }
  ];
}

function songErrorMessage(error) {
  const details = [error?.message, ...(error?.causes || [])].join(' ');
  if (/\b429\b|too many requests|rate.?limit/i.test(details)) {
    return 'YouTube está limitando las descargas en este momento (HTTP 429). Espera un poco y vuelve a intentarlo; no es un problema de tu cuenta.';
  }
  if (error?.message === 'No encontré una fuente de audio válida.') {
    return 'No pude obtener un audio reproducible ahora mismo. Prueba con otra canción o con un enlace público de YouTube.';
  }
  return 'No pude preparar o enviar ese audio. Inténtalo otra vez con un enlace público de YouTube.';
}

async function prepareAudio(videoUrl, fallbackTitle, providers = createProviders(videoUrl, fallbackTitle), httpClient = axios, convertAudio = toAudio) {
  const errors = [];
  for (const provider of providers) {
    try {
      const source = await provider.resolve();
      if (!source?.download) throw new Error('El proveedor no incluyó el audio.');
      const downloaded = await downloadValidatedAudio(source.download, httpClient);
      let buffer = downloaded.buffer;
      if (downloaded.format.extension !== 'mp3') buffer = await convertAudio(buffer, downloaded.format.extension);
      const finalFormat = identifyAudio(buffer);
      if (!finalFormat || finalFormat.extension !== 'mp3') throw new Error('La conversión no produjo un MP3 válido.');
      if (buffer.length > MAX_WHATSAPP_AUDIO_BYTES) throw new Error('El MP3 supera el límite práctico de WhatsApp.');
      return { buffer, title: source.title || fallbackTitle || 'audio', provider: provider.name };
    } catch (error) {
      errors.push(`${provider.name}: ${error.message}`);
      console.warn(`[cancion] ${provider.name} no disponible: ${error.message}`);
    }
  }
  const error = new Error('No encontré una fuente de audio válida.');
  error.causes = errors;
  throw error;
}

async function songCommand(sock, chatId, message) {
  try {
    const text = readMessageText(message);
    const query = extractSongQuery(text);
    if (!query) return sock.sendMessage(chatId, { text: 'Uso: /cancion nombre o enlace de YouTube.' }, { quoted: message });

    let video;
    if (isYouTubeUrl(query)) video = { url: query, title: 'Audio de YouTube' };
    else {
      await sock.sendMessage(chatId, { react: { text: '⏳', key: message?.key } });
      const search = await yts(query);
      video = search?.videos?.[0];
      if (!video?.url || !isYouTubeUrl(video.url)) return sock.sendMessage(chatId, { text: 'No encontré una canción con un enlace de YouTube válido.' }, { quoted: message });
    }

    await sock.sendMessage(chatId, { text: `Preparando el audio: ${video.title || 'YouTube'}${video.timestamp ? ` · duración ${video.timestamp}` : ''}.` }, { quoted: message });
    const result = await prepareAudio(video.url, video.title);
    await sock.sendMessage(chatId, {
      audio: result.buffer,
      mimetype: 'audio/mpeg',
      fileName: `${safeFilename(result.title)}.mp3`,
      ptt: false
    }, { quoted: message });
  } catch (error) {
    console.error('[cancion] Error:', error.message, error.causes || '');
    const text = songErrorMessage(error);
    try { await sock.sendMessage(chatId, { text }, { quoted: message }); } catch {}
  }
}

songCommand.prepareAudio = prepareAudio;
songCommand.readMessageText = readMessageText;
songCommand.extractSongQuery = extractSongQuery;
songCommand.createProviders = createProviders;
songCommand.songErrorMessage = songErrorMessage;
songCommand.downloadValidatedAudio = downloadValidatedAudio;
songCommand.isYouTubeUrl = isYouTubeUrl;
songCommand.safeFilename = safeFilename;
module.exports = songCommand;
