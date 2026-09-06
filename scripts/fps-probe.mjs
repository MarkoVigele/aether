import puppeteer from 'puppeteer-core'

const url = process.argv[2] ?? 'http://127.0.0.1:45217/'
const seconds = Number(process.argv[3] ?? 90)
const chrome = process.env.CHROME ?? '/usr/local/bin/google-chrome'

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu-sandbox', '--window-size=1280,800'],
})

const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 })
await page.evaluateOnNewDocument(() => localStorage.clear())
await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 })

const samples = []
const started = Date.now()
while ((Date.now() - started) / 1000 < seconds) {
  await new Promise((r) => setTimeout(r, 5000))
  const fps = await page.evaluate(() => {
    const el = document.querySelector('[data-fps]')
    return el ? Number(el.getAttribute('data-fps')) : null
  })
  const t = Math.round((Date.now() - started) / 1000)
  samples.push({ t, fps })
  console.log(JSON.stringify({ t, fps }))
}

await browser.close()
const nums = samples.map((s) => s.fps).filter((n) => Number.isFinite(n))
const last = nums.at(-1)
const first = nums[0]
console.log(
  JSON.stringify({
    first,
    last,
    min: Math.min(...nums),
    max: Math.max(...nums),
    samples,
  }),
)
if (last != null && last < 12 && first != null && first >= 20) {
  process.exit(2)
}
