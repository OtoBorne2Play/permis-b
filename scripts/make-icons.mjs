// Makes the PNG icons of the app from public/icon.svg.
// Run again only if the icon changes: node scripts/make-icons.mjs
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
for (const size of [192, 512]) {
  await sharp(join(publicDir, 'icon.svg'), { density: 300 })
    .resize(size, size)
    .png()
    .toFile(join(publicDir, `icon-${size}.png`))
  console.log(`icon-${size}.png`)
}
