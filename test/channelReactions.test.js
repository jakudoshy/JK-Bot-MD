'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseChannelPostUrl, parseReactionEmoji, sendChannelReaction } = require('../lib/channelReactions');

test('acepta el enlace de una publicación concreta de un canal de WhatsApp', () => {
  assert.deepEqual(parseChannelPostUrl('https://whatsapp.com/channel/0029VbBVupfKbYMFuKLsIg2M/436'), {
    inviteCode: '0029VbBVupfKbYMFuKLsIg2M', postId: '436'
  });
  assert.deepEqual(parseChannelPostUrl('https://www.whatsapp.com/channel/0029VbBVupfKbYMFuKLsIg2M/436?source=share#post'), {
    inviteCode: '0029VbBVupfKbYMFuKLsIg2M', postId: '436'
  });
});

test('rechaza links que no sean post de canal de WhatsApp', () => {
  for (const link of [
    'https://example.com/channel/0029VbBVupfKbYMFuKLsIg2M/436',
    'http://whatsapp.com/channel/0029VbBVupfKbYMFuKLsIg2M/436',
    'https://whatsapp.com/channel/0029VbBVupfKbYMFuKLsIg2M',
    'https://whatsapp.com/channel/0029VbBVupfKbYMFuKLsIg2M/not-a-post'
  ]) assert.throws(() => parseChannelPostUrl(link));
});

test('acepta un emoji sencillo o compuesto como reacción única', () => {
  for (const emoji of ['❤️', '👍', '🇩🇴', '👨‍👩‍👧‍👦', '1️⃣']) assert.equal(parseReactionEmoji(emoji), emoji);
});

test('rechaza listas, texto u otros valores que no sean una reacción única', () => {
  for (const value of ['', 'hola', '👍,❤️', '👍❤️']) assert.throws(() => parseReactionEmoji(value));
});

test('resuelve el código del canal y envía una reacción al ID exacto del post', async () => {
  const calls = [];
  const sock = {
    async newsletterMetadata(type, inviteCode) {
      calls.push(['metadata', type, inviteCode]);
      return { id: '12345@newsletter', name: 'Canal de prueba' };
    },
    async newsletterReactMessage(jid, postId, emoji) { calls.push(['react', jid, postId, emoji]); }
  };
  const result = await sendChannelReaction(sock, {
    url: 'https://whatsapp.com/channel/0029VbBVupfKbYMFuKLsIg2M/436', emoji: '🔥'
  });
  assert.deepEqual(result, { postId: '436', channelName: 'Canal de prueba' });
  assert.deepEqual(calls, [
    ['metadata', 'invite', '0029VbBVupfKbYMFuKLsIg2M'],
    ['react', '12345@newsletter', '436', '🔥']
  ]);
});

test('falla sin socket o cuando el enlace no resuelve a un canal disponible', async () => {
  await assert.rejects(sendChannelReaction(null, { url: 'https://whatsapp.com/channel/0029VbBVupfKbYMFuKLsIg2M/436', emoji: '🔥' }), /bot conectado/i);
  await assert.rejects(sendChannelReaction({ newsletterMetadata: async () => null, newsletterReactMessage: async () => {} }, {
    url: 'https://whatsapp.com/channel/0029VbBVupfKbYMFuKLsIg2M/436', emoji: '🔥'
  }), /No se encontró el canal/i);
});
