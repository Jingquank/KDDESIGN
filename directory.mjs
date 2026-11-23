// Builds directory/, the edition of KDDESIGN submitted to the Claude plugin directory (ADR 0049).
// The directory takes scripts and mods only from Verified organizations, so this edition holds
// the skills that are Markdown alone, and no Nudge. skills/ stays the one source: run this after
// changing one of those skills or the version, and commit directory/ with it.
//   node directory.mjs          rebuild directory/
//   node directory.mjs --check  exit 1 when directory/ is not what a rebuild would make
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const SKILLS = ['crazy-prototype', 'whip-it', 'break-it', 'iterate-it']
// What the directory accepts from an organization that is not Verified.
const ALLOWED = /(\.(md|txt|json|ya?ml|png|jpe?g|gif|webp)|\/LICENSE)$/i

function build(out) {
  rmSync(join(out, 'skills'), { recursive: true, force: true })
  rmSync(join(out, '.claude-plugin'), { recursive: true, force: true })
  for (const skill of SKILLS) {
    const from = join(ROOT, 'skills', skill)
    // evals/ is for working on a skill, not for using it, and holds scripts.
    cpSync(from, join(out, 'skills', skill), {
      recursive: true,
      filter: src => !relative(from, src).startsWith('evals') && !src.endsWith('.DS_Store'),
    })
  }
  cpSync(join(ROOT, 'LICENSE'), join(out, 'LICENSE'))
  cpSync(join(ROOT, 'docs', 'icon.png'), join(out, '.claude-plugin', 'icon.png'))
  const full = JSON.parse(readFileSync(join(ROOT, '.claude-plugin', 'plugin.json'), 'utf8'))
  const manifest = {
    name: full.name,
    displayName: full.displayName,
    version: full.version,
    description: `KD's design skills (${SKILLS.join(', ')}): prototype wide on one Artifact page, raise or lower a prototype's fidelity, whip sloppy UI back into line, and break a fresh UI the way the craziest real user would.`,
    author: full.author,
    license: full.license,
    icon: './.claude-plugin/icon.png',
  }
  writeFileSync(join(out, '.claude-plugin', 'plugin.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  for (const file of walk(out)) {
    if (!ALLOWED.test(file)) throw new Error(`${relative(out, file)} is not a file the directory accepts`)
  }
}

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

const OUT = join(ROOT, 'directory')
if (process.argv.includes('--check')) {
  const fresh = mkdtempSync(join(tmpdir(), 'kddesign-directory-'))
  cpSync(join(OUT, 'README.md'), join(fresh, 'README.md'))
  build(fresh)
  const files = dir => (existsSync(dir) ? walk(dir).map(f => relative(dir, f)).filter(f => !f.endsWith('.DS_Store')).sort() : [])
  const [want, have] = [files(fresh), files(OUT)]
  const stale = [...new Set([...want, ...have])].filter(
    f => !want.includes(f) || !have.includes(f) || !readFileSync(join(fresh, f)).equals(readFileSync(join(OUT, f))),
  )
  rmSync(fresh, { recursive: true, force: true })
  if (stale.length) {
    console.error(`directory/ is stale; run node directory.mjs:\n  ${stale.join('\n  ')}`)
    process.exit(1)
  }
  console.log('directory/ is up to date')
} else {
  build(OUT)
  console.log(`directory/ rebuilt: ${SKILLS.join(', ')}`)
}
