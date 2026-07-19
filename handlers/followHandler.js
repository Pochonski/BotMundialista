require('dotenv').config();
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

async function getFollowByTicketId(ticketId) {
  try {
    const r = await pool.query(
      'SELECT ticket_id, game_id, chat_ids, mode, last_notified_status FROM bet_followers WHERE ticket_id = $1',
      [String(ticketId)]
    );
    if (r.rows.length === 0) return null;
    const row = r.rows[0];
    row.chatIds = row.chat_ids;
    return row;
  } catch (_) { return null; }
}

async function upsertFollow(ticketIdStr, gameId, chatIds, mode, lastNotifiedStatus) {
  await pool.query(`
    INSERT INTO bet_followers (ticket_id, game_id, chat_ids, mode, last_notified_status, updated_at)
    VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
    ON CONFLICT (ticket_id, mode)
    DO UPDATE SET chat_ids = EXCLUDED.chat_ids, game_id = EXCLUDED.game_id,
                  last_notified_status = COALESCE(EXCLUDED.last_notified_status, bet_followers.last_notified_status),
                  updated_at = NOW()
  `, [ticketIdStr, gameId != null ? Number(gameId) : null, chatIds, mode,
      lastNotifiedStatus ? JSON.stringify(lastNotifiedStatus) : null]);
}

async function deleteFollow(ticketIdStr) {
  await pool.query('DELETE FROM bet_followers WHERE ticket_id = $1', [ticketIdStr]);
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

  const existing = await getFollowByTicketId(ticketIdStr);

  let chatIds = existing?.chatIds || [];
  if (chatIds.includes(chatIdStr)) {
    if (existing.mode === mode) {
      return { ok: true, message: `✅ Ya estás siguiendo el ticket #${ticketId} (modo: ${MODE_LABELS[mode]}).` };
    }
    await upsertFollow(ticketIdStr, gameId, chatIds, mode, existing.last_notified_status);
    return { ok: true, message: `✅ Modo actualizado para ticket #${ticketId}: ${MODE_LABELS[mode]}.` };
  }

  if (chatIds.length >= MAX_FOLLOWS_PER_CHAT) {
    return { ok: false, message: `⚠️ Llegaste al máximo de ${MAX_FOLLOWS_PER_CHAT} tickets seguidos.` };
  }

  chatIds.push(chatIdStr);
  await upsertFollow(ticketIdStr, gameId, chatIds, mode, null);

  context.rememberTicket(chatIdStr, ticketIdStr);
  return {
    ok: true,
    message: `✅ Listo, sigo tu ticket #${ticketId} (${ticket.partido_extrado || `partido ${gameId}`}). Te aviso con ${MODE_LABELS[mode]}.\n\n💡 Tip: para cambiar el modo usa "/follow ${ticketId} outcome" o "/follow ${ticketId} all".`
  };
}

async function unfollowTicket(chatIdStr, ticketId) {
  const ticketIdStr = String(ticketId);
  const existing = await getFollowByTicketId(ticketIdStr);

  if (!existing || !Array.isArray(existing.chatIds) || !existing.chatIds.includes(chatIdStr)) {
    return { ok: false, message: `❌ No sigues el ticket #${ticketId}.` };
  }

  const chatIds = existing.chatIds.filter((c) => c !== chatIdStr);
  if (chatIds.length === 0) {
    await deleteFollow(ticketIdStr);
    return { ok: true, message: `✅ Dejé de seguir el ticket #${ticketId}.` };
  }

  await upsertFollow(ticketIdStr, existing.game_id, chatIds, existing.mode, null);
  return { ok: true, message: `✅ Dejé de seguir el ticket #${ticketId} para ti.` };
}

async function listFollowed(chatIdStr) {
  try {
    const r = await pool.query(
      "SELECT ticket_id, chat_ids, mode, game_id FROM bet_followers WHERE $1 = ANY(chat_ids)",
      [chatIdStr]
    );
    const mine = r.rows;
    if (mine.length === 0) {
      return { ok: true, message: '📭 No sigues ningún ticket todavía. Probá: "/follow 555" (con un ticket tuyo).' };
    }
    const lines = ['📋 *Tickets que sigues:*\n'];
    for (const sub of mine) {
      const ticket = await getTicketInfo(sub.ticket_id);
      const modeIcon = sub.mode === 'outcome_only' ? '🎯' : '📡';
      const partido = ticket?.partido_extrado || `partido ${sub.game_id}`;
      lines.push(`${modeIcon} *#${sub.ticket_id}* — ${partido}`);
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
  const existing = await getFollowByTicketId(ticketIdStr);
  if (!existing || !Array.isArray(existing.chatIds) || !existing.chatIds.includes(chatIdStr)) {
    return { ok: false, message: `❌ No sigues el ticket #${ticketId}. Primero: /follow ${ticketId}` };
  }
  await upsertFollow(ticketIdStr, existing.game_id, existing.chatIds, newMode, null);
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
