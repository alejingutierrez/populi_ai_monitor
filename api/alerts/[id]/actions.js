import { query } from '../../db.js'
import { parseSingle } from '../shared.js'

const allowCors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 'no-store')
}

const actionMap = {
  ack: 'ack',
  acknowledge: 'ack',
  snooze: 'snoozed',
  snoozed: 'snoozed',
  resolve: 'resolved',
  resolved: 'resolved',
  escalate: 'escalated',
  escalated: 'escalated',
  reopen: 'open',
  open: 'open',
}

const parseScopeFromId = (id) => {
  if (id === 'overall') return { scopeType: 'overall', scopeId: 'overall' }
  const [scopeType, ...rest] = id.split(':')
  const scopeId = rest.join(':')
  if (!scopeType || !scopeId) return null
  return { scopeType, scopeId }
}

const normalizeSnapshot = (value) => {
  if (!value || typeof value !== 'object') return null
  return value
}

export default async function handler(req, res) {
  allowCors(res)

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const id = parseSingle(req.query?.id)
  if (!id) {
    res.status(400).json({ error: 'Missing alert id' })
    return
  }

  const body = req.body ?? {}
  const rawAction = parseSingle(body.action) ?? 'ack'
  const action = actionMap[rawAction] ?? 'ack'
  const actor = parseSingle(body.actor)
  const note = parseSingle(body.note)
  const snoozeUntilInput = parseSingle(body.snoozeUntil)
  const snapshot = normalizeSnapshot(body.alert ?? body.snapshot)

  const parsedScope = snapshot?.scopeType && snapshot?.scopeId
    ? { scopeType: snapshot.scopeType, scopeId: snapshot.scopeId }
    : parseScopeFromId(id)
  if (!parsedScope) {
    res.status(400).json({ error: 'Missing scope data for alert' })
    return
  }

  const now = new Date()
  const nowIso = now.toISOString()
  const clearTimers = action === 'open'
  const ackAt = action === 'ack' ? nowIso : null
  const resolvedAt = action === 'resolved' ? nowIso : null
  let snoozeUntil = null
  if (action === 'snoozed') {
    const fallback = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    const candidate = snoozeUntilInput ? new Date(snoozeUntilInput) : fallback
    snoozeUntil = Number.isNaN(candidate.getTime())
      ? fallback.toISOString()
      : candidate.toISOString()
  }

  const values = [
    id,
    parsedScope.scopeType,
    parsedScope.scopeId,
    snapshot?.scopeLabel ?? parsedScope.scopeId ?? null,
    snapshot?.title ?? null,
    snapshot?.summary ?? null,
    snapshot?.severity ?? null,
    action,
    snapshot?.priority ?? null,
    snapshot?.owner ?? null,
    snapshot?.team ?? null,
    snapshot?.assignee ?? null,
    snapshot?.firstSeenAt ?? null,
    snapshot?.lastSeenAt ?? null,
    nowIso,
    ackAt,
    resolvedAt,
    snoozeUntil,
    snapshot?.occurrences ?? null,
    snapshot?.activeWindowCount ?? null,
    snapshot?.confidence ?? null,
    snapshot?.ruleIds ?? null,
    snapshot?.ruleValues ?? null,
    snapshot?.uniqueAuthors ?? null,
    snapshot?.newAuthorsPct ?? null,
    snapshot?.geoSpread ?? null,
    snapshot?.topEntities ?? null,
    snapshot?.keywords ?? null,
    clearTimers,
  ]

  const upsertSql = `
    insert into alerts (
      id,
      scope_type,
      scope_id,
      scope_label,
      title,
      summary,
      severity,
      status,
      priority,
      owner,
      team,
      assignee,
      first_seen_at,
      last_seen_at,
      last_status_at,
      ack_at,
      resolved_at,
      snooze_until,
      occurrences,
      active_window_count,
      confidence,
      rule_ids,
      rule_values,
      unique_authors,
      new_authors_pct,
      geo_spread,
      top_entities,
      keywords,
      updated_at
    ) values (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      coalesce($7, 'low'),
      $8,
      $9,
      $10,
      $11,
      $12,
      $13,
      $14,
      $15,
      $16,
      $17,
      $18,
      $19,
      $20,
      $21,
      $22,
      $23,
      $24,
      $25,
      $26,
      $27,
      $28,
      now()
    )
    on conflict (id) do update set
      status = excluded.status,
      last_status_at = excluded.last_status_at,
      ack_at = case when $29 then null else coalesce($16, alerts.ack_at) end,
      resolved_at = case when $29 then null else coalesce($17, alerts.resolved_at) end,
      snooze_until = case when $29 then null else coalesce($18, alerts.snooze_until) end,
      owner = coalesce($10, alerts.owner),
      team = coalesce($11, alerts.team),
      assignee = coalesce($12, alerts.assignee),
      priority = coalesce($9, alerts.priority),
      severity = coalesce($7, alerts.severity),
      title = coalesce($5, alerts.title),
      summary = coalesce($6, alerts.summary),
      scope_label = coalesce($4, alerts.scope_label),
      first_seen_at = coalesce(alerts.first_seen_at, $13),
      last_seen_at = coalesce($14, alerts.last_seen_at),
      occurrences = coalesce($19, alerts.occurrences),
      active_window_count = coalesce($20, alerts.active_window_count),
      confidence = coalesce($21, alerts.confidence),
      rule_ids = coalesce($22, alerts.rule_ids),
      rule_values = coalesce($23, alerts.rule_values),
      unique_authors = coalesce($24, alerts.unique_authors),
      new_authors_pct = coalesce($25, alerts.new_authors_pct),
      geo_spread = coalesce($26, alerts.geo_spread),
      top_entities = coalesce($27, alerts.top_entities),
      keywords = coalesce($28, alerts.keywords),
      updated_at = now()
    returning
      id,
      status,
      ack_at as "ackAt",
      resolved_at as "resolvedAt",
      snooze_until as "snoozeUntil",
      last_status_at as "lastStatusAt",
      owner,
      team,
      assignee,
      priority,
      severity
  `

  try {
    const upsertResult = await query(upsertSql, values)
    const updated = upsertResult.rows?.[0]
    const actionSql = `
      insert into alert_actions (alert_id, action, actor, note, metadata)
      values ($1, $2, $3, $4, $5::jsonb)
      returning id, created_at
    `
    const metadata =
      snapshot || snoozeUntilInput
        ? JSON.stringify({
            snapshot: snapshot ?? null,
            snoozeUntil: snoozeUntilInput ?? null,
          })
        : null
    const actionResult = await query(actionSql, [id, action, actor ?? null, note ?? null, metadata])

    res.status(200).json({
      status: 'ok',
      id,
      action,
      updated,
      actionId: actionResult.rows?.[0]?.id,
      createdAt: actionResult.rows?.[0]?.created_at ?? nowIso,
    })
  } catch (error) {
    console.error('Alert action error:', error)
    res.status(500).json({ error: 'Alert action failed' })
  }
}
