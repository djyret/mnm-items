// Körs med sharp tillgängligt, t.ex. i en mapp med 'npm i sharp':
//   node scripts/flamma-morf.mjs scripts/flamma-faser.webp web/public/bilder/flamma-ark.webp 3
// flamma-faser.webp är de 8 målade faserna (ChatGPT, se flamma-ark.webp.json).
// Räknar fram mellanbilder mellan flipbokens målade faser (morf per rad):
// varje låga beskrivs per höjdnivå u (0 = foten, 1 = spetsen) av mitt och halvbredd. En mellanbild
// får mitt, bredd och höjd interpolerade, och färgen hämtas från båda faserna på motsvarande punkt.
// Användning: node morf.mjs <ark 8 rutor> <ut-ark> <mellanbilder per par> [förhandsvisning.png]
import sharp from 'sharp'
const [src, out, betweenArg, preview] = process.argv.slice(2)
const between = Number(betweenArg)
const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true })
const CW = 96, CH = 192, N = Math.round(info.width / CW)
const lum = (r, g, b) => 0.3 * r + 0.59 * g + 0.11 * b
const THR = 28

// Rutor som egna bildbuffertar (float RGB)
const frames = []
for (let f = 0; f < N; f++) {
  const px = new Float32Array(CW * CH * 3)
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const i = (y * info.width + f * CW + x) * 3, o = (y * CW + x) * 3
    px[o] = data[i]; px[o + 1] = data[i + 1]; px[o + 2] = data[i + 2]
  }
  // Profil: per rad mitt (ljusviktad) och halvbredd (tröskel), samt topp och fot
  const center = new Float32Array(CH).fill(NaN), half = new Float32Array(CH).fill(NaN)
  let top = CH, base = 0
  for (let y = 0; y < CH; y++) {
    let sw = 0, sx = 0, l = -1, r = -1
    for (let x = 0; x < CW; x++) {
      const o = (y * CW + x) * 3, L = lum(px[o], px[o + 1], px[o + 2])
      if (L > THR) { if (l < 0) l = x; r = x; sw += L; sx += L * x }
    }
    if (l >= 0) { center[y] = sx / sw; half[y] = Math.max(1, (r - l + 1) / 2); top = Math.min(top, y); base = Math.max(base, y) }
  }
  // Fyll hål i profilen (rader utan låga inne i lågan) från grannarna
  for (let y = top; y <= base; y++) if (Number.isNaN(center[y])) { center[y] = center[y - 1]; half[y] = half[y - 1] }
  frames.push({ px, center, half, top, base })
}

// Profil vid höjdnivå u (0 fot, 1 spets), linjärt mellan rader
function prof(F, u) {
  const yf = F.base - u * (F.base - F.top)
  const y0 = Math.max(F.top, Math.min(F.base, Math.floor(yf))), y1 = Math.min(F.base, y0 + 1), k = yf - y0
  return { y: yf, c: F.center[y0] * (1 - k) + F.center[y1] * k, h: F.half[y0] * (1 - k) + F.half[y1] * k }
}
function sample(F, x, y) {
  if (x < 0 || y < 0 || x > CW - 1 || y > CH - 1) return [0, 0, 0]
  const x0 = Math.floor(x), y0 = Math.floor(y), x1 = Math.min(CW - 1, x0 + 1), y1 = Math.min(CH - 1, y0 + 1)
  const fx = x - x0, fy = y - y0, P = F.px, res = [0, 0, 0]
  for (let c = 0; c < 3; c++) {
    const a = P[(y0 * CW + x0) * 3 + c] * (1 - fx) + P[(y0 * CW + x1) * 3 + c] * fx
    const b = P[(y1 * CW + x0) * 3 + c] * (1 - fx) + P[(y1 * CW + x1) * 3 + c] * fx
    res[c] = a * (1 - fy) + b * fy
  }
  return res
}
// Lågan sträcker sig något över topp och fot (glöd); u utanför [0,1] extrapoleras med kantens profil
function morph(A, B, t) {
  const out = new Float32Array(CW * CH * 3)
  const top = A.top * (1 - t) + B.top * t, base = A.base * (1 - t) + B.base * t, H = base - top
  for (let y = 0; y < CH; y++) {
    const u = (base - y) / H
    const uc = Math.max(0, Math.min(1, u))
    const pa = prof(A, uc), pb = prof(B, uc)
    // Rader ovanför spetsen/under foten: samma förskjutning i höjdled som för u
    const ya = A.base - u * (A.base - A.top), yb = B.base - u * (B.base - B.top)
    const c = pa.c * (1 - t) + pb.c * t, h = pa.h * (1 - t) + pb.h * t
    for (let x = 0; x < CW; x++) {
      const v = (x - c) / h
      const sa = sample(A, pa.c + v * pa.h, ya), sb = sample(B, pb.c + v * pb.h, yb)
      const o = (y * CW + x) * 3
      for (let k = 0; k < 3; k++) out[o + k] = sa[k] * (1 - t) + sb[k] * t
    }
  }
  return out
}

const seq = []
for (let f = 0; f < N; f++) {
  const A = frames[f], B = frames[(f + 1) % N]
  seq.push(A.px)
  for (let i = 1; i <= between; i++) seq.push(morph(A, B, i / (between + 1)))
}
const M = seq.length
const sheet = Buffer.alloc(M * CW * CH * 3)
seq.forEach((px, f) => {
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const o = (y * CW + x) * 3, i = (y * M * CW + f * CW + x) * 3
    for (let c = 0; c < 3; c++) { const v = Math.round(px[o + c]); sheet[i + c] = v < 6 ? 0 : Math.min(255, v) }
  }
})
await sharp(sheet, { raw: { width: M * CW, height: CH, channels: 3 } }).webp({ lossless: true }).toFile(out)
if (preview) {
  // Förhandsvisning: de första 9 rutorna (en målad fas, tre mellanbilder, nästa fas ...) i 2x
  await sharp(sheet, { raw: { width: M * CW, height: CH, channels: 3 } }).extract({ left: 0, top: 0, width: 9 * CW, height: CH })
    .resize(9 * CW * 2, CH * 2).png().toFile(preview)
}
console.log('rutor', M, 'ark', M * CW, 'x', CH, frames.map((F) => `${F.top}-${F.base}`).join(' '))
