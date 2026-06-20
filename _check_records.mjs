import puppeteer from 'puppeteer'
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
const page = await browser.newPage()
const errors = []
page.on('console', msg => {
  if (msg.type() === 'error') {
    errors.push({ text: msg.text(), stack: msg.stackTrace() })
  }
})
page.on('pageerror', err => errors.push({ text: err.message, stack: err.stack }))
await page.setViewport({ width: 1280, height: 900 })
await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 15000 })
await new Promise(r => setTimeout(r, 1500))

const clickText = async (text) => {
  const buttons = await page.$$('button')
  for (const b of buttons) {
    const txt = await b.evaluate(el => el.textContent)
    if (txt && txt.includes(text)) { await b.click(); return true }
  }
  return false
}

await clickText('Finance')
await new Promise(r => setTimeout(r, 500))
await clickText('Records')
await new Promise(r => setTimeout(r, 1000))

console.log('--- ERRORS ---')
for (const e of errors) {
  console.log(JSON.stringify(e, null, 2))
}

const bodyText = await page.evaluate(() => document.body.innerText)
console.log('--- Body Text ---')
console.log(bodyText.slice(0, 2000))

await page.screenshot({ path: 'screenshot.png' })
console.log('screenshot.png saved')
await browser.close()
