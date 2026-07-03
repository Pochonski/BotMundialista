require('dotenv').config();
const cosmos = require('../database/cosmos');
const context = require('../services/conversationContext');
const { pool } = require('../database/connection');

const MAX_FOLLOWS_PER_CHAT = 10;
const DEFAULT_MODE = 'all_events';

const MODE_LABELS = {
  all_events: 'todos los eventos (goles, tarjetas, etc.)',
  outcome_only: 'solo cuando sepas si ganaste o perdiste',
};

async function getTicketInfo(ticketId) {
  try {
    const r = await pool.query(`
      SELECT a.id, a.id_usuario, a.id_partido_api, a.estado, a.partido_extrado
      FROM apuestas a
      WHERE a.id = $1
    `, [parseInt(ticketId, 10)]);
    return r.rows[0] || null;
  } catch (e) {
    console.error('[followHandler] getTicketInfo error:', e.message);
    return null;
  }
}

async function followTicket(chatIdStr, ticketId, mode = DEFAULT_MODE) {
  const ticket = await getTicketInfo(ticketId);
  if (!ticket) {
    return { ok: false, message: `❌ No encontré el ticket #${ticketId}. Verifica que exista.` };
  }
  if (ticket.id_usuario !== chatIdStr) {
    return { ok: false, message: `❌ El ticket #${ticketId} no es tuyo.` };
  }
  if (!['abierta'].includes(ticket.estado)) {
    return { ok: false, message: `❌ El ticket #${ticketId} ya está ${ticket.estado}.` };
  }

  const ticketIdStr = String(ticket.id);
  const gameId = ticket.id_partido_api ? Number(ticket.id_partido_api) : null;
  const docId = `ticket-${ticketIdStr}`;

  let existing = null;
  try { existing = await cosmos.getById('bet_followers', docId, ticketIdStr); } catch (_) {}

  let chatIds = existing?.chatIds || [];
  if (chatIds.includes(chatIdStr)) {
    if (existing.mode === mode) {
      return { ok: true, message: `✅ Ya estás siguiendo el ticket #${ticketId} (modo: ${MODE_LABELS[mode]}).` };
    }
    await cosmos.upsert('bet_followers', {
      id: docId,
      ticketId: ticketIdStr,
      gameId,
      chatIds,
      mode,
      lastNotifiedStatus: existing.lastNotifiedStatus || null,
      _fetchedAt: new Date().toISOString(),
    });
    return { ok: true, message: `✅ Modo actualizado para ticket #${ticketId}: ${MODE_LABELS[mode]}.` };
  }

  if (chatIds.length >= MAX_FOLLOWS_PER_CHAT) {
    return { ok: false, message: `⚠️ Llegaste al máximo de ${MAX_FOLLOWS_PER_CHAT} tickets seguidos.` };
  }

  chatIds.push(chatIdStr);
  await cosmos.upsert('bet_followers', {
    id: docId,
    ticketId: ticketIdStr,
    gameId,
    chatIds,
    mode,
    lastNotifiedStatus: null,
    _fetchedAt: new Date().toISOString(),
  });

  context.rememberTicket(chatIdStr, ticketIdStr);
  return {
    ok: true,
    message: `✅ Listo, sigo tu ticket #${ticketId} (${ticket.partido_extrado || `partido ${gameId}`}). Te aviso con ${MODE_LABELS[mode]}.\n\n💡 Tip: para cambiar el modo usa "/follow ${ticketId} outcome" o "/follow ${ticketId} all".`
  };
}

async function unfollowTicket(chatIdStr, ticketId) {
  const ticketIdStr = String(ticketId);
  const docId = `ticket-${ticketIdStr}`;
  let existing = null;
  try { existing = await cosmos.getById('bet_followers', docId, ticketIdStr); } catch (_) {}
  if (!existing) {
    return { ok: false, message: `❌ No sigues el ticket #${ticketId}.` };
  }
  const chatIds = (existing.chatIds || []).filter((c) => c !== chatIdStr);
  if (chatIds.length === 0) {
    await cosmos.deleteDoc('bet_followers', docId, ticketIdStr);
    return { ok: true, message: `✅ Dejé de seguir el ticket #${ticketId}.` };
  }
  await cosmos.upsert('bet_followers', {
    id: docId,
    ticketId: ticketIdStr,
    gameId: existing.gameId,
    chatIds,
    mode: existing.mode,
    lastNotifiedStatus: existing.lastNotifiedStatus,
    _fetchedAt: new Date().toISOString(),
  });
  return { ok: true, message: `✅ Dejé de seguir el ticket #${ticketId} para ti.` };
}

async function listFollowed(chatIdStr) {
  try {
    const all = await cosmos.queryAll('bet_followers', { query: 'SELECT c.ticketId, c.chatIds, c.mode, c.gameId FROM c' });
    const mine = all.filter((d) => Array.isArray(d.chatIds) && d.chatIds.includes(chatIdStr));
    if (mine.length === 0) {
      return { ok: true, message: '📭 No sigues ningún ticket todavía. Probá: "/follow 555" (con un ticket tuyo).' };
    }
    const lines = ['📋 *Tickets que sigues:*\n'];
    for (const sub of mine) {
      const ticket = await getTicketInfo(sub.ticketId);
      const modeIcon = sub.mode === 'outcome_only' ? '🎯' : '📡';
      const partido = ticket?.partido_extrado || `partido ${sub.gameId}`;
      lines.push(`${modeIcon} *#${sub.ticketId}* — ${partido}`);
      lines.push(`   Modo: ${MODE_LABELS[sub.mode] || sub.mode}`);
      if (ticket) lines.push(`   Estado: ${ticket.estado}`);
      lines.push('');
    }
    lines.push('💡 Para dejar de seguir: /unfollow <id>');
    return { ok: true, message: lines.join('\n') };
  } catch (e) {
    return { ok: false, message: `❌ Error listando: ${e.message}` };
  }
}

async function changeMode(chatIdStr, ticketId, newMode) {
  if (newMode !== 'all_events' && newMode !== 'outcome_only') {
    return { ok: false, message: '❌ Modo inválido. Usa "all" o "outcome".' };
  }
  const ticketIdStr = String(ticketId);
  const docId = `ticket-${ticketIdStr}`;
  let existing = null;
  try { existing = await cosmos.getById('bet_followers', docId, ticketIdStr); } catch (_) {}
  if (!existing || !Array.isArray(existing.chatIds) || !existing.chatIds.includes(chatIdStr)) {
    return { ok: false, message: `❌ No sigues el ticket #${ticketId}. Primero: /follow ${ticketId}` };
  }
  await cosmos.upsert('bet_followers', {
    id: docId,
    ticketId: ticketIdStr,
    gameId: existing.gameId,
    chatIds: existing.chatIds,
    mode: newMode,
    lastNotifiedStatus: null,
    _fetchedAt: new Date().toISOString(),
  });
  return { ok: true, message: `✅ Ticket #${ticketId}: modo cambiado a "${MODE_LABELS[newMode]}".` };
}

async function handleFollowCommand(chatIdStr, args) {
  const parts = (args || '').trim().split(/\s+/);
  const ticketId = parts[0];
  const modeArg = (parts[1] || '').toLowerCase();
  let mode = DEFAULT_MODE;
  if (modeArg === 'all' || modeArg === 'all_events' || modeArg === 'todo' || modeArg === 'todos') mode = 'all_events';
  else if (modeArg === 'outcome' || modeArg === 'outcome_only' || modeArg === 'final' || modeArg === 'solo') mode = 'outcome_only';
  if (!ticketId) {
    return { ok: false, message: '❌ Uso: /follow <ticketId> [all|outcome]' };
  }
  if (!/^\d+$/.test(ticketId)) {
    return { ok: false, message: '❌ ticketId debe ser numérico.' };
  }
  return await followTicket(chatIdStr, ticketId, mode);
}

async function handleUnfollowCommand(chatIdStr, args) {
  const ticketId = (args || '').trim().split(/\s+/)[0];
  if (!ticketId) return { ok: false, message: '❌ Uso: /unfollow <ticketId>' };
  if (!/^\d+$/.test(ticketId)) return { ok: false, message: '❌ ticketId debe ser numérico.' };
  return await unfollowTicket(chatIdStr, ticketId);
}

async function handleListCommand(chatIdStr) {
  return await listFollowed(chatIdStr);
}

async function handleIntentFollow(chatIdStr, intent) {
  const ticketId = intent.ticketId;
  if (!ticketId) {
    return { ok: false, message: '🤔 No entendí qué ticket. Decime: "sígueme el 555" (con el número).' };
  }
  const mode = intent.mode === 'outcome_only' ? 'outcome_only' : 'all_events';
  return await followTicket(chatIdStr, ticketId, mode);
}

async function handleIntentUnfollow(chatIdStr, intent) {
  const ticketId = intent.ticketId;
  if (!ticketId) {
    return { ok: false, message: '🤔 No entendí qué ticket. Decime: "deja de seguir el 555".' };
  }
  return await unfollowTicket(chatIdStr, ticketId);
}

async function handleIntentChangeMode(chatIdStr, intent) {
  const ticketId = intent.ticketId;
  const mode = intent.mode;
  if (!ticketId) {
    return { ok: false, message: '🤔 No entendí qué ticket. Decime: "cambia el 555 a solo cuando gane".' };
  }
  if (!mode) {
    return { ok: false, message: '🤔 No entendí a qué modo cambiar. Opciones: "all" o "outcome".' };
  }
  return await changeMode(chatIdStr, ticketId, mode);
}

module.exports = {
  followTicket,
  unfollowTicket,
  listFollowed,
  changeMode,
  getTicketInfo,
  handleFollowCommand,
  handleUnfollowCommand,
  handleListCommand,
  handleIntentFollow,
  handleIntentUnfollow,
  handleIntentChangeMode,
  MAX_FOLLOWS_PER_CHAT,
  MODE_LABELS,
};