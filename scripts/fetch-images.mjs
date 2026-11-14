// Fetches free-licence images for the questions that have an "image_query".
//
//   node scripts/fetch-images.mjs                  every question with a query and no image yet
//   node scripts/fetch-images.mjs --id <id>        one question, replacing its current image
//   node scripts/fetch-images.mjs --flagged <file> the questions flagged "image inadaptée" in a
//                                                  progress file exported from the app
//   --dry-run                                      show what would be done, change nothing
//
// For now it handles road signs: a query like "Belgian road sign C1" takes the
// official drawing from Wikimedia Commons. Street scenes come in a later step.
// Each image is converted to WebP 1280x720 in public/img, written into
// data/questions.json, and credited in data/credits.json.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const questionsPath = join(root, 'data', 'questions.json')
const creditsPath = join(root, 'data', 'credits.json')
const imageDir = join(root, 'public', 'img')

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php'
// Wikimedia asks automated clients to say who they are and how to reach them.
const USER_AGENT = 'permis-b-image-fetch/1.0 (https://github.com/OtoBorne2Play/permis-b)'
const WIDTH = 1280
const HEIGHT = 720
const BACKGROUND = '#f2f4f8'
const SIGN_QUERY = /^Belgian road sign\s+(\S+)$/i

// ---------------------------------------------------------------- arguments

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const valueOf = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined)
const onlyId = valueOf('--id')
const flaggedFile = valueOf('--flagged')

const questions = JSON.parse(readFileSync(questionsPath, 'utf8'))
let credits = JSON.parse(readFileSync(creditsPath, 'utf8'))

let flaggedIds = new Set()
if (flaggedFile) {
  const exported = JSON.parse(readFileSync(flaggedFile, 'utf8'))
  flaggedIds = new Set(exported.progress?.flaggedImages ?? [])
  for (const q of questions) if (flaggedIds.has(q.id)) q.image_flagged = true
  console.log(`${flaggedIds.size} question(s) signalée(s) « image inadaptée » dans ${flaggedFile}`)
}

const todo = questions.filter((q) => {
  if (!q.image_query) return false
  if (onlyId) return q.id === onlyId
  if (flaggedFile) return q.image_flagged === true
  return q.image === null
})

// ---------------------------------------------------------------- Wikimedia Commons

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** Fetch that waits and tries again when the server asks us to slow down. */
async function politeFetch(url) {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    if (response.status !== 429 && response.status < 500) return response
    if (attempt >= 5) return response
    const wait = Number(response.headers.get('retry-after')) || 5 * (attempt + 1)
    console.log(`  (serveur occupé, nouvelle tentative dans ${wait} s)`)
    await sleep(wait * 1000)
  }
}

async function commons(params) {
  await sleep(1000) // stay well under the rate limit
  const url = `${COMMONS_API}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`
  const response = await politeFetch(url)
  if (!response.ok) throw new Error(`Wikimedia Commons a répondu ${response.status}`)
  return response.json()
}

const stripHtml = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

/** Details of several Commons files in one request. Missing files are left out. */
async function commonsFiles(titles) {
  const found = new Map()
  for (let i = 0; i < titles.length; i += 40) {
    const data = await commons({
      action: 'query',
      titles: titles.slice(i, i + 40).join('|'),
      prop: 'imageinfo',
      iiprop: 'url|extmetadata|mime',
      iiextmetadatafilter: 'Artist|LicenseShortName',
    })
    // The API may rewrite a title (spaces, capitals): follow its "normalized" list.
    const asked = new Map((data.query.normalized ?? []).map((n) => [n.to, n.from]))
    for (const page of data.query.pages) {
      const info = page.imageinfo?.[0]
      if (!info) continue
      found.set(asked.get(page.title) ?? page.title, {
        title: page.title.replace(/^File:/, ''),
        downloadUrl: info.url,
        pageUrl: info.descriptionurl,
        author: stripHtml(info.extmetadata?.Artist?.value ?? '') || 'Inconnu',
        license: stripHtml(info.extmetadata?.LicenseShortName?.value ?? '') || 'Inconnue',
      })
    }
  }
  return found
}

/** The official drawings of Belgian road signs, by code (A1b, C43, F12a…). */
async function findSigns(codes) {
  const titleOf = (code) => `File:Belgian road sign ${code}.svg`
  const files = await commonsFiles(codes.map(titleOf))
  const signs = new Map()
  for (const code of codes) {
    const exact = files.get(titleOf(code))
    if (exact) {
      signs.set(code, exact)
      continue
    }
    // Some signs only exist with a variant letter (D1 -> D1a, D1b…): take the first one.
    const search = await commons({
      action: 'query',
      list: 'search',
      srnamespace: '6',
      srlimit: '20',
      srsearch: `intitle:"Belgian road sign ${code}"`,
    })
    const pattern = new RegExp(`^File:Belgian road sign ${code}[a-z0-9]*\\.svg$`, 'i')
    const title = search.query.search.map((r) => r.title).filter((t) => pattern.test(t)).sort()[0]
    if (title) {
      const variant = (await commonsFiles([title])).get(title)
      if (variant) signs.set(code, variant)
    }
  }
  return signs
}

// ---------------------------------------------------------------- images

/** Draws the sign in the middle of a light 1280x720 picture and saves it as WebP. */
async function saveSign(svg, file) {
  const sign = await sharp(svg, { density: 400 })
    .resize(WIDTH - 280, HEIGHT - 160, { fit: 'inside' })
    .png()
    .toBuffer()
  await sharp({ create: { width: WIDTH, height: HEIGHT, channels: 3, background: BACKGROUND } })
    .composite([{ input: sign, gravity: 'centre' }])
    .webp({ quality: 90 })
    .toFile(file)
}

/** Saved after every image, so an interrupted run loses nothing. */
function save() {
  credits.sort((a, b) => a.image.localeCompare(b.image))
  writeFileSync(questionsPath, JSON.stringify(questions, null, 2) + '\n')
  writeFileSync(creditsPath, JSON.stringify(credits, null, 2) + '\n')
}

// ---------------------------------------------------------------- main

if (!existsSync(imageDir)) mkdirSync(imageDir, { recursive: true })

let done = 0
let skipped = 0
const failed = []

const signCode = (question) => SIGN_QUERY.exec(question.image_query)?.[1]
const signs = await findSigns([...new Set(todo.map(signCode).filter(Boolean))])

for (const question of todo) {
  const code = signCode(question)
  if (!code) {
    skipped++
    continue
  }
  try {
    const found = signs.get(code)
    if (!found) {
      failed.push(`${question.id} : aucun fichier trouvé pour « ${question.image_query} »`)
      continue
    }
    const name = found.title.replace(/^Belgian road sign /, '').replace(/\.svg$/i, '')
    const image = `img/panneau-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.webp`
    console.log(`${question.id} ← ${found.title}`)
    if (dryRun) continue

    const file = join(root, 'public', image)
    if (!existsSync(file) || onlyId) {
      await sleep(1000)
      const response = await politeFetch(found.downloadUrl)
      if (!response.ok) throw new Error(`téléchargement refusé (${response.status})`)
      await saveSign(Buffer.from(await response.arrayBuffer()), file)
    }

    question.image = image
    delete question.image_flagged
    credits = credits.filter((c) => c.image !== image)
    credits.push({
      image,
      source: 'Wikimedia Commons',
      title: found.title,
      author: found.author,
      license: found.license,
      url: found.pageUrl,
    })
    done++
    save()
  } catch (error) {
    failed.push(`${question.id} : ${error.message}`)
  }
}


console.log(`\n${done} image(s) ajoutée(s), ${skipped} question(s) de scène laissée(s) pour plus tard.`)
if (failed.length > 0) {
  console.log(`${failed.length} échec(s) :`)
  for (const line of failed) console.log(`  ✗ ${line}`)
}
