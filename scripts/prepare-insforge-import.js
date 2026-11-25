#!/usr/bin/env node

import { gunzipSync } from 'node:zlib'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

function parseCopyTable(dump, table) {
  const escaped = table.replaceAll('.', '\\.').replaceAll('_', '\\_')
  const match = dump.match(new RegExp(`^COPY ${escaped} \\(([^\\n]+)\\) FROM stdin;\\n([\\s\\S]*?)^\\\\\\.$`, 'm'))
  if (!match) throw new Error(`No COPY data found for ${table}`)
  const columns = match[1].split(',').map((column) => column.trim())
  const rows = match[2].split('\n').filter(Boolean).map((line) => {
    const values = line.split('\t').map((value) => {
      if (value === '\\N') return null
      return value.replace(/\\([\\tnrbfv]|[0-7]{1,3})/g, (_, escapedValue) => {
        if (/^[0-7]/.test(escapedValue)) return String.fromCharCode(Number.parseInt(escapedValue, 8))
        return ({ '\\': '\\', t: '\t', n: '\n', r: '\r', b: '\b', f: '\f', v: '\v' })[escapedValue]
      })
    })
    if (values.length !== columns.length) throw new Error(`Unexpected column count in ${table}`)
    return Object.fromEntries(columns.map((column, index) => [column, values[index]]))
  })
  return rows
}

function sql(value) {
  if (value === null || value === undefined) return 'null'
  return `'${String(value).replaceAll("'", "''")}'`
}

function bool(value) {
  return value === 't' || value === 'true' ? 'true' : 'false'
}

function main() {
  const input = resolve(process.argv[2] ?? '20260611_023202.sql.gz')
  const output = resolve(process.argv[3] ?? 'supabase/.temp/import-insforge.sql')
  const raw = readFileSync(input)
  const dump = input.endsWith('.gz') ? gunzipSync(raw).toString('utf8') : raw.toString('utf8')
  const users = parseCopyTable(dump, 'auth.users')
  const applications = parseCopyTable(dump, 'public.applications')
  const accountById = new Map(users
    .filter((user) => user.email && user.is_anonymous !== 't')
    .map((user) => [user.id, user.email.trim().toLowerCase()]))
  const importedApplications = applications.filter((app) => accountById.has(app.user_id))
  const skipped = applications.length - importedApplications.length

  const statements = [
    'begin;',
    'insert into private.legacy_accounts (legacy_user_id, email) values',
    [...accountById].map(([id, email]) => `  (${sql(id)}::uuid, ${sql(email)})`).join(',\n') || '  (null::uuid, null)',
    'on conflict (legacy_user_id) do update set email = excluded.email;',
    'insert into private.legacy_applications (legacy_user_id, id, company_name, job_title, status, modality, work_location, date_applied, url, notes, is_interesting, created_at, updated_at) values',
    importedApplications.map((app) => `  (${sql(app.user_id)}::uuid, ${sql(app.id)}, ${sql(app.company_name)}, ${sql(app.job_title)}, ${sql(app.status)}, ${sql(app.modality)}, ${sql(app.work_location)}, ${sql(app.date_applied)}::date, ${sql(app.url)}, ${sql(app.notes)}, ${bool(app.is_interesting)}, ${sql(app.created_at)}::timestamptz, ${sql(app.updated_at)}::timestamptz)`).join(',\n') || '  (null::uuid, null, null, null, null, null, null, null, null, null, false, null, null)',
    'on conflict (legacy_user_id, id) do update set company_name = excluded.company_name, job_title = excluded.job_title, status = excluded.status, modality = excluded.modality, work_location = excluded.work_location, date_applied = excluded.date_applied, url = excluded.url, notes = excluded.notes, is_interesting = excluded.is_interesting, created_at = excluded.created_at, updated_at = excluded.updated_at;',
    'commit;',
  ]
  const sqlText = statements.join('\n')
  if (!accountById.size || !importedApplications.length) throw new Error('No importable InsForge accounts or applications found')
  mkdirSync(dirname(output), { recursive: true })
  writeFileSync(output, sqlText, { mode: 0o600 })
  console.log(`Prepared ${accountById.size} account mappings and ${importedApplications.length} applications (${skipped} skipped) in ${output}`)
}

main()
