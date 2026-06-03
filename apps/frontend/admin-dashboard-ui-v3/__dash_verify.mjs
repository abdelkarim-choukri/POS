import { chromium } from "playwright"

const BASE = "http://localhost:3001"
const EMAIL = "testowner@pos.local"
const PASS = "Test1234!"

const browser = await chromium.launch()
const ctx = await browser.newContext()
const page = await ctx.newPage()

const pageErrors = []
const apiCalls = []
const fourxx = []
page.on("pageerror", (e) => pageErrors.push(String(e)))
page.on("response", async (res) => {
  const u = res.url()
  if (u.includes("/api/business/reports/")) {
    apiCalls.push({ url: u.replace(BASE, ""), status: res.status() })
    if (res.status() >= 400) {
      let body = ""
      try { body = (await res.text()).slice(0, 300) } catch {}
      fourxx.push({ url: u, status: res.status(), body })
    }
  }
})

// ── Login ──
await page.goto(BASE, { waitUntil: "networkidle" })
await page.getByPlaceholder("admin@example.com").fill(EMAIL)
await page.getByPlaceholder("••••••••").fill(PASS)
await page.getByRole("button", { name: /Sign in as Business Admin/i }).click()

// Wait for dashboard to render (KPI card "Total Revenue")
await page.getByText("Total Revenue").first().waitFor({ timeout: 15000 })
await page.waitForTimeout(2500) // let queries settle

// ── Read rendered KPIs ──
async function kpiValue(title) {
  const card = page.locator("div", { hasText: new RegExp(`^${title}`) }).first()
  // value is the sibling <p> with font-mono
  return await card.evaluate((el) => {
    const p = el.querySelector("p.font-mono")
    return p ? p.textContent.trim() : null
  }).catch(() => null)
}

const revenue = await page.locator("p:has-text('Total Revenue')").locator("xpath=following-sibling::p").first().textContent().catch(() => null)
const txns = await page.locator("p:has-text('Transactions')").locator("xpath=following-sibling::p").first().textContent().catch(() => null)
const customers = await page.locator("p:has-text('Customers')").locator("xpath=following-sibling::p").first().textContent().catch(() => null)
const avg = await page.locator("p:has-text('Avg Order')").locator("xpath=following-sibling::p").first().textContent().catch(() => null)

// Recent transactions table — count data rows and read first txn number
const txnRows = await page.locator("table tbody tr").count()
const firstTxnCell = await page.locator("table tbody tr").first().locator("td").first().textContent().catch(() => null)

// Top products first entry
const topProductText = await page.locator("text=No product sales yet").count()

// Switch period to "Year" and confirm refetch
await page.getByRole("button", { name: "Year" }).click()
await page.waitForTimeout(1500)
const revenueYear = await page.locator("p:has-text('Total Revenue')").locator("xpath=following-sibling::p").first().textContent().catch(() => null)

// Quick action wiring: click "View Reports" → should navigate to Reports page
await page.getByText("View Reports").click().catch(() => {})
await page.waitForTimeout(1200)
const onReports = await page.locator("text=Analytics and insights").count()

await page.screenshot({ path: "/tmp/dash_verify.png", fullPage: true })

console.log(JSON.stringify({
  pageErrors,
  apiCalls,
  fourxx,
  kpis: { revenue, txns, customers, avg, revenueYear },
  recentTxn: { rowCount: txnRows, firstCell: firstTxnCell },
  topProductsEmpty: topProductText > 0,
  quickActionNavigatedToReports: onReports > 0,
}, null, 2))

await browser.close()
