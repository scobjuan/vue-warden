import { existsSync, readFileSync } from 'node:fs'

const FILE = '.agents/MEMORY.md'
const MAX_TOTAL = 250
const SECTION_LIMITS = {
  'Current state': 20,
  'Direction / next steps': 20,
  'Existing utilities': 60,
  'Architecture decisions': 50,
  'Learnings / gotchas': 50,
  'Recent changes': 30
}

if (!existsSync(FILE)) {
  console.log(`${FILE} not found, skipping`)
  process.exit(0)
}

const lines = readFileSync(FILE, 'utf8').split('\n')
const errors = []

if (lines.length > MAX_TOTAL) {
  errors.push(`${FILE} has ${lines.length} lines (max ${MAX_TOTAL})`)
}

let current = null
const counts = {}
for (const line of lines) {
  if (line.startsWith('## ')) {
    current = Object.keys(SECTION_LIMITS).find((name) =>
      line.slice(3).startsWith(name)
    )
    if (current) counts[current] = 0
    continue
  }
  if (current && line.trim() !== '') counts[current]++
}

for (const [name, limit] of Object.entries(SECTION_LIMITS)) {
  if ((counts[name] ?? 0) > limit) {
    errors.push(`Section "${name}" has ${counts[name]} lines (max ${limit})`)
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log(`${FILE} ok (${lines.length}/${MAX_TOTAL} lines)`)
