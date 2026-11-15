import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const csp = (await fs.readFile("public/_headers", "utf8"))
  .split("Content-Security-Policy: ")[1]
  .trim();
await page.route("**/*", async (route) => {
  if (route.request().resourceType() === "document") {
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: { ...response.headers(), "content-security-policy": csp },
    });
  } else await route.continue();
});
await page.goto("http://127.0.0.1:4173");
await page.getByPlaceholder("Enter your name").fill("Production host");
await page.getByRole("button", { name: "Create a Game", exact: true }).click();
await page.waitForURL("**/room/**");
const code = page.url().split("/").pop();
const guestCtx = await browser.newContext();
const guest = await guestCtx.newPage();
await guest.goto(`http://127.0.0.1:4173/join/${code}`);
await guest.getByPlaceholder("Enter your name").fill("Production guest");
await guest
  .getByRole("button", { name: "Join this Game", exact: true })
  .click();
await page
  .getByText("Production guest", { exact: true })
  .waitFor({ timeout: 35000 });
await page.getByRole("button", { name: "Let’s play", exact: true }).click();
await guest.waitForURL("**/game/**");
for (const p of [page, guest]) {
  await p.locator(".candidate:enabled").first().click();
  await p.getByRole("button", { name: "Submit Vote" }).click();
}
await page.waitForURL("**/results/**");
await guest.waitForURL("**/results/**");
await page.locator(".ranking").first().waitFor();
await guest.locator(".ranking").first().waitFor();
const ranks = await page.locator(".ranking").allTextContents();
const guestRanks = await guest.locator(".ranking").allTextContents();
if (ranks.length !== 2 || JSON.stringify(ranks) !== JSON.stringify(guestRanks))
  throw Error("Production results differ");
const manifest = await (
  await ctx.request.get("http://127.0.0.1:4173/manifest.webmanifest")
).json();
if (manifest.start_url !== "/" || manifest.icons.length !== 2)
  throw Error("Invalid manifest");
await page.evaluate(() => navigator.serviceWorker.ready);
const registered = await page.evaluate(
  async () => !!(await navigator.serviceWorker.getRegistration()),
);
if (!registered) throw Error("Service worker missing");
// Another page verifies static history fallback and a cached shell without a network.
const offline = await ctx.newPage();
await offline.goto("http://127.0.0.1:4173/privacy");
await offline.getByRole("heading", { name: "Who can see a vote?" }).waitFor();
await offline.reload();
await offline.getByRole("heading", { name: "Who can see a vote?" }).waitFor();
await offline.evaluate(() => navigator.serviceWorker.ready);
await ctx.setOffline(true);
await offline.reload();
await offline.getByRole("heading", { name: "Who can see a vote?" }).waitFor();
if (errors.length) throw Error(errors.join("\n"));
console.log(
  "PASS: built static app, CSP-protected host, real production WebRTC round, matching tied results, manifest, service worker, direct route refresh, offline app shell.",
);
await browser.close();
