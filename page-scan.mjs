import puppeteer from 'puppeteer'
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 900 })
await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 })
await new Promise(r => setTimeout(r, 1500))

// Snapshot current view — no clicks, only what's visible
const title = await page.title()

const info = await page.evaluate(() => {
  const els = document.querySelectorAll('button, a, input, select, textarea, h1, h2, h3, h4, h5, h6, span, div, table, th, td, tr, label')
  const visible = []
  for (const el of els) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue
    if (r.bottom < 0 || r.top > window.innerHeight) continue
    const tag = el.tagName.toLowerCase()
    const txt = (el.textContent || '').trim().slice(0, 120)
    if (!txt && !['input', 'select', 'textarea'].includes(tag)) continue
    if (['script', 'style'].includes(tag)) continue
    visible.push({
      tag, txt,
      type: el.getAttribute('type') || '',
      placeholder: el.getAttribute('placeholder') || '',
      value: el.getAttribute('value') || '',
      y: Math.round(r.top), h: Math.round(r.height)
    })
  }
  return visible
})

// Print page title
console.log(`Page Title: ${title}`)

// Group by horizontal rows (36px slices) and show a compact view
const rows = {}
for (const item of info) {
  const ry = Math.round(item.y / 36) * 36
  if (!rows[ry]) rows[ry] = []
  rows[ry].push(item)
}
const sorted = Object.entries(rows).sort((a, b) => Number(a[0]) - Number(b[0]))

for (const [y, items] of sorted) {
  const labels = items.map(i => {
    let l = i.tag
    if (i.txt) {
      const t = i.txt.length > 80 ? i.txt.slice(0, 77) + '...' : i.txt
      l += `="${t}"`
    }
    if (i.type) l += `[${i.type}]`
    if (i.placeholder) l += `{${i.placeholder}}`
    return l
  })
  // Deduplicate consecutive same labels
  const unique = labels.filter((l, idx) => idx === 0 || l !== labels[idx - 1])
  console.log(`y=${String(y).padStart(4)} | ${unique.join('  ')}`)
}

// Also print all plain text for full context
const bodyText = await page.evaluate(() => document.body.innerText)
console.log('\n--- Body Text ---')
console.log(bodyText.slice(0, 3000))

await page.screenshot({ path: 'screenshot.png' })
console.log('\nscreenshot.png saved')
await browser.close()
