import { createHash } from 'node:crypto'

type ReconcileStrategy = 'merge' | 'keep_account' | 'keep_local'

type ApplicationPayload = {
  id: string
  companyName: string
  jobTitle: string
  status: string
  modality: string
  workLocation: string
  dateApplied: string
  url: string
  notes: string
}

type ReconcileRequest = {
  strategy: ReconcileStrategy
  local_applications: ApplicationPayload[]
}

type ReconcileResponse = {
  created: number
  updated: number
  deleted: number
  skipped: number
  applications: RemoteApplicationRecord[]
}

type RemoteApplicationRecord = {
  id: string
  user_id: string
  company_name: string
  job_title: string
  status: string
  modality: string
  work_location: string | null
  date_applied: string
  url: string | null
  notes: string | null
  created_at: string
  updated_at: string
  sync_origin: 'local' | 'remote' | 'merge'
}

function rowToPayload(row: RemoteApplicationRecord): ApplicationPayload {
  return {
    id: row.id,
    companyName: row.company_name,
    jobTitle: row.job_title,
    status: row.status,
    modality: row.modality,
    workLocation: row.work_location ?? '',
    dateApplied: row.date_applied,
    url: row.url ?? '',
    notes: row.notes ?? '',
  }
}

function payloadToRow(userId: string, payload: ApplicationPayload, existingRow?: RemoteApplicationRecord): RemoteApplicationRecord {
  const now = new Date().toISOString()
  return {
    id: payload.id,
    user_id: userId,
    company_name: payload.companyName,
    job_title: payload.jobTitle,
    status: payload.status,
    modality: payload.modality,
    work_location: payload.workLocation || null,
    date_applied: payload.dateApplied,
    url: payload.url || null,
    notes: payload.notes || null,
    sync_origin: 'merge',
    created_at: existingRow?.created_at || now,
    updated_at: now,
  }
}

function getCorsHeaders(origin: string | null): HeadersInit {
  const isAllowedOrigin = Boolean(
    origin && (
      origin.endsWith('.vercel.app') ||
      origin.startsWith('http://127.0.0.1:') ||
      origin.startsWith('http://localhost:')
    )
  )
  const allowOrigin = isAllowedOrigin && origin ? origin : 'https://job-trackr-wine.vercel.app'

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-idempotency-key,x-insforge-base-url',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function jsonResponse(body: unknown, init: ResponseInit = {}, origin: string | null = null): Response {
  const headers = {
    'content-type': 'application/json',
    ...getCorsHeaders(origin),
    ...(init.headers ?? {}),
  }

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  })
}
function unauthorized(message = 'Missing or invalid bearer token.', origin: string | null = null): Response {
  return jsonResponse({ error: message }, { status: 401 }, origin)
}

function resolveBaseUrl(request: Request): string {
  const headerBaseUrl = request.headers.get('x-insforge-base-url')?.trim() ?? ''
  const envBaseUrl = (process.env.INSFORGE_URL ?? process.env.VITE_INSFORGE_URL ?? '').trim()
  return headerBaseUrl || envBaseUrl
}

function buildDatabaseUrl(baseUrl: string, tableName: string, query = ''): string {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '')
  const suffix = query ? `?${query}` : ''
  return `${normalizedBaseUrl}/api/database/records/${tableName}${suffix}`
}

function hashRequest(userId: string, strategy: string, payload: ApplicationPayload[]): string {
  const hash = createHash('sha256')
  hash.update(userId)
  hash.update(strategy)
  hash.update(JSON.stringify(payload))
  return hash.digest('hex')
}

function normalizeStrategy(value: unknown): ReconcileStrategy | null {
  if (value === 'merge' || value === 'keep_account' || value === 'keep_local') {
    return value
  }

  return null
}

async function resolveAuthenticatedUser(baseUrl: string, authorization: string): Promise<{ id: string; email?: string | null }> {
  const sessionUrl = `${baseUrl.replace(/\/$/, '')}/api/auth/sessions/current`
  const response = await fetch(sessionUrl, {
    method: 'GET',
    headers: {
      Authorization: authorization,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Session lookup failed with status ${response.status}`)
  }

  const parsed = await response.json().catch(() => null) as { user?: { id?: string; email?: string | null } } | null

  const userId = parsed?.user?.id?.trim() ?? ''
  if (!userId) {
    throw new Error('Session response did not include a user id.')
  }

  return {
    id: userId,
    email: parsed?.user?.email ?? null,
  }
}

export default async function handler(request: Request): Promise<Response> {
  const origin = request.headers.get('origin')

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    })
  }

  if (request.method !== 'POST') {
    return new Response(null, {
      status: 405,
      headers: getCorsHeaders(origin),
    })
  }

  const authorization = request.headers.get('authorization')
  if (!authorization || !authorization.toLowerCase().startsWith('bearer ')) {
    return jsonResponse({ error: 'Missing or invalid bearer token.' }, { status: 401 }, origin)
  }

  const idempotencyKey = request.headers.get('x-idempotency-key')?.trim()
  if (!idempotencyKey) {
    return jsonResponse({ error: 'x-idempotency-key header is required.' }, { status: 400 }, origin)
  }

  const parsed = (await request.json().catch(() => null)) as ReconcileRequest | null
  if (!parsed) {
    return jsonResponse({ error: 'Invalid JSON payload.' }, { status: 400 }, origin)
  }

  const strategy = normalizeStrategy(parsed.strategy)
  if (!strategy) {
    return jsonResponse({ error: 'Unsupported strategy. Use merge, keep_account or keep_local.' }, { status: 400 }, origin)
  }

  if (!Array.isArray(parsed.local_applications)) {
    return jsonResponse({ error: 'local_applications must be an array.' }, { status: 400 }, origin)
  }

  const baseUrl = resolveBaseUrl(request)
  if (!baseUrl) {
    return jsonResponse({ error: 'Missing InsForge base URL.' }, { status: 500 }, origin)
  }

  // Extract user ID from token
  let userId: string
  try {
    const token = authorization.replace(/^bearer\s+/i, '')
    const authenticatedUser = await resolveAuthenticatedUser(baseUrl, `Bearer ${token}`)
    userId = authenticatedUser.id
  } catch (error) {
    return unauthorized('Token validation failed.', origin)
  }

  const requestHash = hashRequest(userId, strategy, parsed.local_applications)

  // Load remote applications for authenticated user
  const loadUrl = buildDatabaseUrl(baseUrl, 'applications', `user_id=eq.${userId}&select=*`)
  const loadRes = await fetch(loadUrl, {
    method: 'GET',
    headers: {
      'Authorization': authorization,
      'Accept': 'application/json',
    },
  })

  if (!loadRes.ok) {
    return jsonResponse(
      { error: `Failed to load remote applications: ${loadRes.status}` },
      { status: 500 },
      origin
    )
  }

  const remoteRows: RemoteApplicationRecord[] = await loadRes.json()
  const remoteApplications: ApplicationPayload[] = remoteRows.map(rowToPayload)

  let responsePayload: ReconcileResponse
  let createdCount = 0
  let deletedCount = 0
  const remoteRowsByIdMap = new Map(remoteRows.map(r => [r.id, r]))

  if (strategy === 'keep_account') {
    responsePayload = {
      created: 0,
      updated: 0,
      deleted: 0,
      skipped: parsed.local_applications.length,
      applications: remoteRows,
    }
  } else if (strategy === 'keep_local') {
    // Delete all remote applications
    const remoteIds = remoteApplications.map(a => a.id)
    if (remoteIds.length > 0) {
      const deleteUrl = buildDatabaseUrl(baseUrl, 'applications', `id=in.(${remoteIds.map(id => `"${id}"`).join(',')})`)
      await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': authorization,
        },
      })
    }

    // Upsert all local applications
    const rowsToInsert = parsed.local_applications.map(app => payloadToRow(userId, app, remoteRowsByIdMap.get(app.id)))
    if (rowsToInsert.length > 0) {
      const upsertUrl = buildDatabaseUrl(baseUrl, 'applications')
      await fetch(upsertUrl, {
        method: 'POST',
        headers: {
          'Authorization': authorization,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify(rowsToInsert),
      })
    }

    responsePayload = {
      created: parsed.local_applications.length,
      updated: 0,
      deleted: remoteApplications.length,
      skipped: 0,
      applications: rowsToInsert,
    }
  } else {
    // Merge strategy: union of IDs with local winning on tie
    const mergedMap = new Map<string, ApplicationPayload>()
    for (const remote of remoteApplications) {
      mergedMap.set(remote.id, remote)
    }
    for (const local of parsed.local_applications) {
      mergedMap.set(local.id, local)
    }

    const mergedList = [...mergedMap.values()]

    // Upsert merged state to DB
    const rowsToUpsert = mergedList.map(app => payloadToRow(userId, app, remoteRowsByIdMap.get(app.id)))
    if (rowsToUpsert.length > 0) {
      const upsertUrl = buildDatabaseUrl(baseUrl, 'applications')
      await fetch(upsertUrl, {
        method: 'POST',
        headers: {
          'Authorization': authorization,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify(rowsToUpsert),
      })
    }

    // Count created/deleted for stats
    const remoteIds = new Set(remoteApplications.map(a => a.id))
    const localIds = new Set(parsed.local_applications.map(a => a.id))
    createdCount = parsed.local_applications.filter(a => !remoteIds.has(a.id)).length
    deletedCount = remoteApplications.filter(a => !localIds.has(a.id)).length

    responsePayload = {
      created: createdCount,
      updated: 0,
      deleted: deletedCount,
      skipped: 0,
      applications: rowsToUpsert.sort((a, b) => a.date_applied.localeCompare(b.date_applied)),
    }
  }

  // Persist reconcile run record
  await fetch(`${baseUrl}/rest/v1/reconcile_runs`, {
    method: 'POST',
    headers: {
      'Authorization': authorization,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      idempotency_key: idempotencyKey,
      strategy,
      request_hash: requestHash,
      response_payload: responsePayload,
    }),
  })

  return jsonResponse({ ...responsePayload }, { status: 200 }, origin)
}
