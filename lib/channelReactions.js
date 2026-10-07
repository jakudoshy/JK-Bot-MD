'use strict';

const CHANNEL_POST_PATH = /^\/channel\/([A-Za-z0-9_-]{6,80})\/(\d{1,24})\/?$/;
const EMOJI_GRAPHEME = new Intl.Segmenter('es', { granularity: 'grapheme' });

function parseChannelPostUrl(value) {
  let url;
  try {
    url = new URL(String(value || '').trim());
  } catch {
    throw new Error('Pega el enlace completo de una publicación de canal de WhatsApp.');
  }
  if (url.protocol !== 'https:' || !['whatsapp.com', 'www.whatsapp.com'].includes(url.hostname.toLowerCase())) {
    throw new Error('El enlace debe pertenecer a https://whatsapp.com/channel/.');
  }
  const match = url.pathname.match(CHANNEL_POST_PATH);
  if (!match) throw new Error('Usa el enlace de una publicación concreta, que termine en el número del post.');
  return { inviteCode: match[1], postId: match[2] };
}

function parseReactionEmoji(value) {
  const emoji = String(value || '').trim().normalize('NFC');
  const graphemes = [...EMOJI_GRAPHEME.segment(emoji)];
  const isPictographic = /\p{Extended_Pictographic}/u.test(emoji)
    || /^\p{Regional_Indicator}{2}$/u.test(emoji)
    || /^[0-9#*]\uFE0F?\u20E3$/u.test(emoji);
  if (graphemes.length !== 1 || emoji.length > 16 || !isPictographic) {
    throw new Error('Elige un solo emoji para la reacción.');
  }
  return emoji;
}

async function sendChannelReaction(sock, input = {}) {
  const post = parseChannelPostUrl(input.url);
  const emoji = parseReactionEmoji(input.emoji);
  if (!sock || typeof sock.newsletterMetadata !== 'function' || typeof sock.newsletterReactMessage !== 'function') {
    throw new Error('El bot conectado no tiene disponible la función de reacciones a canales.');
  }
  const metadata = await sock.newsletterMetadata('invite', post.inviteCode);
  if (!metadata?.id) throw new Error('No se encontró el canal para ese enlace. Revisa que el post siga disponible.');
  await sock.newsletterReactMessage(metadata.id, post.postId, emoji);
  return { postId: post.postId, channelName: String(metadata.name || '') };
}

module.exports = { parseChannelPostUrl, parseReactionEmoji, sendChannelReaction };
