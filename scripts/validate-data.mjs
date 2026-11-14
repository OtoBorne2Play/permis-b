// Checks the JSON files in /data. Run with: npm test (or npm run validate).
// Exits with an error code if something is wrong, so mistakes made while
// editing the data by hand are caught before the app is published.
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const errors = []
const warnings = []

function load(name) {
  const path = join(root, 'data', name)
  if (!existsSync(path)) {
    errors.push(`${name}: fichier manquant`)
    return []
  }
  try {
    const data = JSON.parse(readFileSync(path, 'utf8'))
    if (!Array.isArray(data)) {
      errors.push(`${name}: le fichier doit contenir une liste [...]`)
      return []
    }
    return data
  } catch (e) {
    errors.push(`${name}: JSON invalide (${e.message})`)
    return []
  }
}

const isText = (v) => typeof v === 'string' && v.trim().length > 0

function checkBilingual(where, obj) {
  if (!obj || typeof obj !== 'object') {
    errors.push(`${where}: texte fr/ru manquant`)
    return
  }
  if (!isText(obj.fr)) errors.push(`${where}: texte "fr" manquant`)
  if (!isText(obj.ru)) errors.push(`${where}: texte "ru" manquant`)
}

function checkImage(where, image) {
  if (!isText(image)) {
    errors.push(`${where}: chemin d'image invalide`)
    return
  }
  // Images are served from /public, e.g. "img/xxx.webp" -> public/img/xxx.webp
  if (!existsSync(join(root, 'public', image))) {
    errors.push(`${where}: image introuvable (public/${image})`)
  }
}

function checkUnique(where, values) {
  const seen = new Set()
  for (const v of values) {
    if (seen.has(v)) errors.push(`${where}: "${v}" est en double`)
    seen.add(v)
  }
}

// ---------- themes ----------
const themes = load('themes.json')
themes.forEach((t, i) => {
  const where = `themes.json [${t?.id ?? i}]`
  if (!isText(t?.id)) errors.push(`${where}: "id" manquant`)
  checkBilingual(where, t)
})
checkUnique('themes.json', themes.map((t) => t?.id))
const themeIds = new Set(themes.map((t) => t?.id))

// ---------- questions ----------
const questions = load('questions.json')
questions.forEach((q, i) => {
  const where = `questions.json [${q?.id ?? i}]`
  if (!isText(q?.id)) errors.push(`${where}: "id" manquant`)
  if (!themeIds.has(q?.theme)) errors.push(`${where}: thème inconnu "${q?.theme}"`)
  if (typeof q?.grave !== 'boolean') errors.push(`${where}: "grave" doit être true ou false`)
  if (typeof q?.verified !== 'boolean') errors.push(`${where}: "verified" doit être true ou false`)
  if (q?.image !== null) checkImage(where, q?.image)
  checkBilingual(where, q)
  checkBilingual(`${where} explanation`, q?.explanation)

  const options = Array.isArray(q?.options) ? q.options : []
  if (options.length < 2 || options.length > 3) {
    errors.push(`${where}: il faut 2 ou 3 propositions (trouvé ${options.length})`)
  }
  options.forEach((o, j) => {
    checkBilingual(`${where} option ${'ABC'[j] ?? j + 1}`, o)
    if (typeof o?.correct !== 'boolean') {
      errors.push(`${where} option ${'ABC'[j] ?? j + 1}: "correct" doit être true ou false`)
    }
  })
  const correct = options.filter((o) => o?.correct === true).length
  if (correct !== 1) errors.push(`${where}: il faut exactement 1 bonne réponse (trouvé ${correct})`)
})
checkUnique('questions.json', questions.map((q) => q?.id))

// ---------- lessons ----------
const lessons = load('lessons.json')
lessons.forEach((l, i) => {
  const where = `lessons.json [${l?.theme ?? i}]`
  if (!themeIds.has(l?.theme)) errors.push(`${where}: thème inconnu "${l?.theme}"`)
  checkBilingual(`${where} title`, l?.title)
  const blocks = Array.isArray(l?.blocks) ? l.blocks : []
  if (blocks.length === 0) errors.push(`${where}: la fiche est vide`)
  blocks.forEach((b, j) => {
    checkBilingual(`${where} bloc ${j + 1}`, b)
    if (b?.image !== undefined) checkImage(`${where} bloc ${j + 1}`, b.image)
  })
})
checkUnique('lessons.json', lessons.map((l) => l?.theme))

// ---------- glossary ----------
const glossary = load('glossary.json')
glossary.forEach((g, i) => {
  const where = `glossary.json [${g?.fr ?? i}]`
  checkBilingual(where, g)
  if (!isText(g?.example_fr)) errors.push(`${where}: "example_fr" manquant`)
})
checkUnique('glossary.json', glossary.map((g) => g?.fr?.toLowerCase()))

// ---------- hazards ----------
const hazards = load('hazards.json')
hazards.forEach((h, i) => {
  const where = `hazards.json [${h?.id ?? i}]`
  if (!isText(h?.id)) errors.push(`${where}: "id" manquant`)
  checkImage(where, h?.image)
  if (!Array.isArray(h?.zones)) {
    errors.push(`${where}: "zones" doit être une liste (vide s'il n'y a aucun danger)`)
    return
  }
  h.zones.forEach((z, j) => {
    const zw = `${where} zone ${j + 1}`
    checkBilingual(zw, z)
    for (const key of ['x', 'y', 'w', 'h']) {
      const v = z?.[key]
      if (typeof v !== 'number' || v < 0 || v > 100) errors.push(`${zw}: "${key}" doit être entre 0 et 100`)
    }
    if (z?.x + z?.w > 100) errors.push(`${zw}: la zone dépasse à droite (x + w > 100)`)
    if (z?.y + z?.h > 100) errors.push(`${zw}: la zone dépasse en bas (y + h > 100)`)
  })
})
checkUnique('hazards.json', hazards.map((h) => h?.id))

// ---------- credits ----------
const credits = load('credits.json')
credits.forEach((c, i) => {
  const where = `credits.json [${c?.image ?? i}]`
  checkImage(where, c?.image)
  for (const key of ['source', 'author', 'license', 'url']) {
    if (!isText(c?.[key])) errors.push(`${where}: "${key}" manquant`)
  }
})
checkUnique('credits.json', credits.map((c) => c?.image))
const credited = new Set(credits.map((c) => c?.image))
const usedImages = [
  ...questions.map((q) => q?.image),
  ...lessons.flatMap((l) => (l?.blocks ?? []).map((b) => b?.image)),
  ...hazards.map((h) => h?.image),
].filter(isText)
for (const image of new Set(usedImages)) {
  if (!credited.has(image)) errors.push(`credits.json: aucune ligne de crédit pour ${image}`)
}

// ---------- information (does not fail the check) ----------
const perTheme = new Map([...themeIds].map((id) => [id, 0]))
for (const q of questions) if (perTheme.has(q?.theme)) perTheme.set(q.theme, perTheme.get(q.theme) + 1)
const thin = [...perTheme].filter(([, n]) => n < 10)
if (thin.length > 0) warnings.push(`${thin.length} thème(s) avec moins de 10 questions`)
const unverified = questions.filter((q) => q?.verified === false).length
if (unverified > 0) warnings.push(`${unverified} question(s) à vérifier (verified: false)`)
const lessonThemes = new Set(lessons.map((l) => l?.theme))
const noLesson = [...themeIds].filter((id) => !lessonThemes.has(id)).length
if (noLesson > 0) warnings.push(`${noLesson} thème(s) sans fiche`)

console.log(
  `Données : ${themes.length} thèmes, ${questions.length} questions ` +
    `(${questions.filter((q) => q?.grave).length} graves), ${lessons.length} fiches, ` +
    `${glossary.length} mots de glossaire, ${hazards.length} situations de danger, ${new Set(usedImages).size} images.`,
)
for (const w of warnings) console.log(`  À noter : ${w}`)

if (errors.length > 0) {
  console.error(`\n${errors.length} erreur(s) dans les données :`)
  for (const e of errors) console.error(`  ✗ ${e}`)
  process.exit(1)
}
console.log('✓ Données valides.')
