#!/usr/bin/env node
/**
 * Wraps flat string fields into per-language objects.
 *
 *   headline: "Your expertise..."   ->   headline: { en: "Your expertise..." }
 *
 * Only the fields listed in TARGETS are touched, and only when they are
 * still a plain string — running this twice is a no-op, so a partial run
 * can be safely resumed.
 *
 * DRY RUN BY DEFAULT. Pass --apply to write. Pass --backup <file> to
 * dump every affected document before writing.
 *
 * Requires SANITY_WRITE_TOKEN, plus NEXT_PUBLIC_SANITY_PROJECT_ID and
 * NEXT_PUBLIC_SANITY_DATASET.
 *
 * Drafts are migrated alongside published documents. Skipping them would
 * leave an editor's unpublished work in the old shape, and publishing it
 * later would silently revert the field to a plain string.
 */

import { createClient } from '@sanity/client'
import fs from 'node:fs'

const TARGETS = {
  hero: ['headline', 'subheadline', 'body', 'ctaLabel'],
  humanValue: ['title', 'body'],
  journey: ['title', 'description'],
  siteSettings: ['tagline'],
}

const SOURCE_LOCALE = 'en'

const apply = process.argv.includes('--apply')
const backupIdx = process.argv.indexOf('--backup')
const backupPath = backupIdx > -1 ? process.argv[backupIdx + 1] : null

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
const token = process.env.SANITY_WRITE_TOKEN

if (!projectId || !dataset) {
  console.error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID / NEXT_PUBLIC_SANITY_DATASET')
  process.exit(2)
}
if (apply && !token) {
  console.error('--apply needs SANITY_WRITE_TOKEN')
  process.exit(2)
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  useCdn: false, // sanity-economy: allow-no-cdn one-off migration, must read fresh
  token,
})

const types = Object.keys(TARGETS)
const query = `*[_type in $types]`
const docs = await client.fetch(query, { types })

console.log(`Dataset ${projectId}/${dataset}`)
console.log(`${docs.length} documents of type: ${types.join(', ')}\n`)

if (backupPath) {
  fs.writeFileSync(backupPath, docs.map((d) => JSON.stringify(d)).join('\n'))
  console.log(`Backup written: ${backupPath} (${docs.length} documents)\n`)
}

let patchCount = 0
let fieldCount = 0
let alreadyDone = 0
const transaction = client.transaction()

for (const doc of docs) {
  const fields = TARGETS[doc._type] ?? []
  const set = {}

  for (const field of fields) {
    const value = doc[field]
    if (value === undefined || value === null) continue
    if (typeof value === 'object') {
      alreadyDone += 1
      continue // already migrated
    }
    if (typeof value !== 'string') continue
    set[field] = { [SOURCE_LOCALE]: value }
  }

  if (!Object.keys(set).length) continue

  patchCount += 1
  fieldCount += Object.keys(set).length
  const isDraft = doc._id.startsWith('drafts.')
  console.log(`${isDraft ? 'draft ' : '      '}${doc._id}  (${doc._type})`)
  for (const [field, wrapped] of Object.entries(set)) {
    const preview = String(wrapped[SOURCE_LOCALE]).replace(/\s+/g, ' ').slice(0, 62)
    console.log(`         ${field}: "${preview}${preview.length >= 62 ? '…' : ''}"`)
  }

  transaction.patch(doc._id, { set })
}

console.log(
  `\n${patchCount} documents to patch, ${fieldCount} fields to wrap` +
    (alreadyDone ? `, ${alreadyDone} already migrated (skipped)` : '')
)

if (!patchCount) {
  console.log('Nothing to do.')
  process.exit(0)
}

if (!apply) {
  console.log('\nDRY RUN — nothing written. Re-run with --apply to commit.')
  process.exit(0)
}

const result = await transaction.commit()
console.log(`\nCommitted. Transaction ${result.transactionId}`)
