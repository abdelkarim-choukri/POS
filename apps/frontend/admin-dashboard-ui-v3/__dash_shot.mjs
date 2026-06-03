import { chromium } from "playwright"
const BASE = "http://localhost:3001"
const browser = await chromium.launch()
const page = await (await browser.newContext()).newPage()
const errs = []
page.on("pageerror", (e) => errs.push(String(e)))
await page.goto(BASE, { waitUntil: "networkidle" })
await page.getByPlaceholder("admin@example.com").fill("testowner@pos.local")
await page.getByPlaceholder("••••••••").fill("Test1234!")
await page.getByRole("button", { name: /Sign in as Business Admin/i }).click()
await page.getByText("Total Revenue").first().waitFor({ timeout: 15000 })
await page.getByRole("button", { name: "Year" }).click()
await page.waitForTimeout(2000)
await page.screenshot({ path: "/tmp/dash_year.png", fullPage: true })
console.log("pageErrors:", JSON.stringify(errs))
await browser.close()
