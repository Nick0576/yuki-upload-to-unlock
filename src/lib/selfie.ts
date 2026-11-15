import { emotionImage } from './emotions'
import { location } from './locations'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`could not load ${src}`))
    img.src = src
  })
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = w
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

/** Composites her expression over a location into a "selfie" the app can keep. */
export async function makeSelfie(opts: {
  locationId: string
  emotionId: string
  caption: string
}): Promise<string> {
  const loc = location(opts.locationId)
  const expr = emotionImage(opts.emotionId, true)

  const W = 900
  const H = 1350
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unavailable')

  const [bg, her] = await Promise.all([
    loadImage(loc.image).catch(() => null),
    expr ? loadImage(expr).catch(() => null) : Promise.resolve(null),
  ])

  ctx.fillStyle = '#170d1a'
  ctx.fillRect(0, 0, W, H)

  if (bg) {
    const scale = Math.max(W / bg.width, H / bg.height)
    const w = bg.width * scale
    const h = bg.height * scale
    ctx.drawImage(bg, (W - w) / 2, (H - h) / 2, w, h)
  }

  if (her) {
    const targetH = H * 0.74
    const scale = targetH / her.height
    const w = her.width * scale
    ctx.drawImage(her, (W - w) / 2, H - targetH - 70, w, targetH)
  }

  const grad = ctx.createLinearGradient(0, H * 0.55, 0, H)
  grad.addColorStop(0, 'rgba(12,6,14,0)')
  grad.addColorStop(0.55, 'rgba(12,6,14,0.55)')
  grad.addColorStop(1, 'rgba(12,6,14,0.94)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.font = '600 22px system-ui, sans-serif'
  ctx.fillText(`${loc.emoji} ${loc.name}`, 56, 86)

  ctx.font = '500 34px system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.96)'
  const lines = wrap(ctx, opts.caption || 'wish you were here…', W - 112).slice(0, 4)
  lines.forEach((line, i) => ctx.fillText(line, 56, H - 150 + i * 44))

  ctx.font = '600 24px system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255,180,215,0.95)'
  ctx.fillText('— Yuki', 56, H - 40)

  return canvas.toDataURL('image/jpeg', 0.86)
}
