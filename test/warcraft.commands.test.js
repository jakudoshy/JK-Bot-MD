'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const game = require('../lib/warcraft');
const handler = require('../commands/warcraft');

const routedCommands = [
  '-reembolso','aceptarduel','aceptarduelo','aceptarmision','aceptarmisionw','aceptarreembolso','aceptc','agro','agrow','aprenderw','armadurasw','armasw','atacarduel','atacarduelo','ayudaw','cancelarcompra','cancelarmision','cancelarmisionw','cancelarreembolso','cancelc','clase','comandosw','comerciar','comprar','comprarmonturaw','comprarsubastaw','comprarw','confirmarcompra','correow','curar','curarw','dar','darporreembolso','desafiar','diariaw','duelo','dueloatacar','encantamientosw','encantarw','enemigos','enemigosw','enviarmailw','equipar','equiparw','especializacion','especializacionw','fabricarw','grupow','guildw','habilidadduel','habilidadduelo','huir','huirw','inventario','inventariow','login','loginw','logrosw','mapaw','mazmorra','mazmorras','mazmorrasw','mazmorraw','misiones','misionesw','monturasw','ofrecer','pjnombre','profesionesw','recetasw','reclamarmailw','recolectarw','reembolso','rendirse','subastaw','talentos','talentosw','tienda','tiendaw','trade','tutorial','tutorialw','tutorialwarcraft','venderw','viajarw','warcraft','warcraftmenu','zonasw'
];

test('todos los comandos Warcraft registrados responden sin excepción con sesión aislada', async () => {
  const failed = [];
  for (const [index, command] of routedCommands.entries()) {
    const data = {};
    const phone = String(5350001000 + index);
    const jid = `${phone}@s.whatsapp.net`;
    const player = game.createPlayer(data, jid, 'Prueba', 'warrior').player;
    const root = game.ensureRoot(data);
    root.sessions[player.id] = 'smoke';
    const responses = [];
    const sock = { sendMessage: async (chat, payload) => { responses.push({ chat, payload }); return { key: { id: `smoke-${index}` } }; } };
    const msg = { key: { remoteJid: jid }, pushName: 'Prueba' };
    try {
      await handler(sock, jid, msg, command, '', data, () => {});
      assert.ok(responses.length > 0, `/${command} no respondió`);
    } catch (error) {
      failed.push(`/${command}: ${error.stack || error.message}`);
    }
  }
  assert.deepEqual(failed, []);
});


test('el comando de aceptar duelo confirma estado real y vida de ambos, incluso si llega dos veces', async () => {
  const data = {};
  const aliceJid = '5350003001@s.whatsapp.net';
  const bobJid = '5350003002@s.whatsapp.net';
  const alice = game.createPlayer(data, aliceJid, 'Alice', 'warrior').player;
  const bob = game.createPlayer(data, bobJid, 'Bob', 'mage').player;
  const root = game.ensureRoot(data);
  root.sessions[alice.id] = 'alice'; root.sessions[bob.id] = 'bob';
  const sent = [];
  const sock = { sendMessage: async (jid, payload) => { if (payload?.text) sent.push({ jid, text: payload.text }); return { key: { id: `duel-${sent.length}` } }; } };
  const msg = jid => ({ key: { remoteJid: jid } });
  await handler(sock, aliceJid, msg(aliceJid), 'duelo', bob.id, data, () => {});
  await handler(sock, bobJid, msg(bobJid), 'aceptarduelo', '', data, () => {});
  const acceptedMessage = sent.at(-1).text;
  assert.match(acceptedMessage, /Duelo aceptado/i);
  assert.match(acceptedMessage, new RegExp(`Alice: \\d+/${alice.maxHp} vida`));
  assert.match(acceptedMessage, new RegExp(`Bob: \\d+/${bob.maxHp} vida`));
  await handler(sock, bobJid, msg(bobJid), 'aceptarduelo', '', data, () => {});
  const repeatedMessage = sent.at(-1).text;
  assert.match(repeatedMessage, /El duelo ya está activo/i);
  assert.doesNotMatch(repeatedMessage, /no tienes un desafío pendiente|no hay un duelo activo/i);
  assert.match(repeatedMessage, new RegExp(`Alice: \\d+/${alice.maxHp} vida`));
});
