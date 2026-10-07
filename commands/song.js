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

const API_OPTIONS = {
  timeout: 25000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
    Accept: 'application/json, text/plain, */*'
  }
};

async function getEliteProTechDownloadByUrl(videoUrl) {
  const url = `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(videoUrl)}&format=mp3`;
  const res = await axios.get(url, API_OPTIONS);
  if (res?.data?.success && res?.data?.downloadURL) return { download: res.data.downloadURL, title: res.data.title };
  throw new Error('EliteProTech no devolvió una URL de audio.');
}

async function getYupraDownloadByUrl(videoUrl) {
  const url = `https://api.yupra.my.id/api/downloader/ytmp3?url=${encodeURIComponent(videoUrl)}`;
  const res = await axios.get(url, API_OPTIONS);
  if (res?.data?.success && res?.data?.data?.download_url) return { download: res.data.data.download_url, title: res.data.data.title };
  throw new Error('Yupra no devolvió una URL de audio.');
}

async function getOkatsuDownloadByUrl(videoUrl) {
  const url = `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp3?url=${encodeURIComponent(videoUrl)}`;
  const res = await axios.get(url, API_OPTIONS);
  if (res?.data?.dl) return { download: res.data.dl, title: res.data.title };
  throw new Error('Okatsu no devolvió una URL de audio.');
}

function readMessageText(message) {
  const content = message?.message?.ephemeralMessage?.message
    || message?.message?.viewOnceMessage?.message
    || message?.message?.viewOnceMessageV2?.message
    || message?.message;
  return String(content?.conversation || content?.extendedTextMessage?.text || content?.imageMessage?.caption || content?.videoMessage?.caption || '').trim();
}

function createProviders(videoUrl, fallbackTitle) {
  return [
    { name: 'EliteProTech', resolve: () => getEliteProTechDownloadByUrl(videoUrl) },
    { name: 'Yupra', resolve: () => getYupraDownloadByUrl(videoUrl) },
    { name: 'Okatsu', resolve: () => getOkatsuDownloadByUrl(videoUrl) },
    { name: 'Alya', resolve: async () => {
      const res = await axios.get(`https://api.alyachan.pro/api/ytmp3?url=${encodeURIComponent(videoUrl)}&apikey=G7I6X7`, API_OPTIONS);
      if (res?.data?.status && res?.data?.data?.url) return { download: res.data.data.url, title: res.data.data.title };
      throw new Error('Alya no devolvió una URL de audio.');
    } },
    { name: 'Vreden', resolve: async () => {
      const res = await axios.get(`https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(videoUrl)}`, API_OPTIONS);
      const result = res?.data?.result;
      if (res?.data?.status && result?.download?.url) return { download: result.download.url, title: result.metadata?.title };
      throw new Error('Vreden no devolvió una URL de audio.');
    } },
    { name: 'yt-dlp', resolve: async () => ({ download: await getDirectUrl(videoUrl, 'bestaudio[ext=m4a]/bestaudio/best'), title: fallbackTitle }) }
  ];
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
    const query = text.replace(/^\/(?:song|cancion)(?:\s+|$)/i, '').trim();
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
    const text = error.message === 'No encontré una fuente de audio válida.'
      ? 'No pude descargar un audio reproducible de esa búsqueda. Prueba con otra canción o con un enlace público de YouTube.'
      : 'No pude preparar o enviar ese audio. Inténtalo otra vez con un enlace público de YouTube.';
    try { await sock.sendMessage(chatId, { text }, { quoted: message }); } catch {}
  }
}

songCommand.prepareAudio = prepareAudio;
songCommand.readMessageText = readMessageText;
songCommand.createProviders = createProviders;
songCommand.downloadValidatedAudio = downloadValidatedAudio;
songCommand.isYouTubeUrl = isYouTubeUrl;
songCommand.safeFilename = safeFilename;
module.exports = songCommand;
