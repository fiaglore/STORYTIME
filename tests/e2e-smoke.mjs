// Manual end-to-end smoke test for Chapter 1 ("The Grind") in its RPG-map
// play mode: plays the golden path from the title screen, through walking
// to each hotspot and interacting, to an ending — against a running
// `npm run preview` server. Not wired into `npm test` (needs a live server
// + a Chromium binary); run by hand with:
//   npm run build && npm run preview &
//   node tests/e2e-smoke.mjs
import { chromium } from "playwright";

const baseUrl = process.env.E2E_URL || "http://127.0.0.1:4173/STORYTIME/";
const executablePath = process.env.E2E_CHROMIUM || "/opt/pw-browsers/chromium";

const browser = await chromium.launch({ executablePath });
const page = await browser.newPage();
let hadError = false;
page.on("console", (msg) => {
  if (msg.type() === "error") {
    hadError = true;
    console.log("CONSOLE ERROR:", msg.text());
  }
});
page.on("pageerror", (err) => {
  hadError = true;
  console.log("PAGE ERROR:", err.message);
});

// Clicks the glowing active hotspot, waits for the choice sheet to open.
async function walkAndOpen() {
  await page.click(".rpg-hotspot--active");
  await page.waitForSelector(".rpg-sheet", { timeout: 5000 });
}

await page.goto(baseUrl);
await page.waitForSelector("text=I'm 16 or older");
await page.screenshot({ path: "/tmp/01-title.png" });
await page.click("text=I'm 16 or older");

await page.waitForSelector("text=Play the stories");
await page.click("text=Play the stories");

await page.waitForSelector("text=The Grind");
await page.screenshot({ path: "/tmp/02-map.png" });

await page.click("text=Play");
await page.waitForSelector("text=Story, story!");
await page.screenshot({ path: "/tmp/03-opening.png" });
await page.click("button:text-is('Story!')");
await page.waitForSelector("text=Once upon a time");
await page.click("button:text-is('Time, time!')");

// Arrive at the stall for the frying mini-scene.
await page.waitForSelector(".rpg-stage");
await page.screenshot({ path: "/tmp/04-rpg-map.png" });
await walkAndOpen();
await page.waitForSelector("text=How much do you fry this morning?");
await page.screenshot({ path: "/tmp/05-frying-scene.png" });
await page.click("text=Fry a standard batch");

// commute (road hotspot)
await walkAndOpen();
await page.waitForSelector("text=Take the long way round");
await page.click("text=Take the long way round");

// help_tailor
await walkAndOpen();
await page.waitForSelector("text=Stand beside Baba Issa");
await page.click("text=Stand beside Baba Issa");
// help_okra
await walkAndOpen();
await page.waitForSelector("text=Lend Aisha");
await page.click("text=Lend Aisha what she is short");
// help_mallam
await walkAndOpen();
await page.waitForSelector("text=Walk over and stand");
await page.click("text=Walk over and stand with him, saying nothing");

// jagaban_visit auto-continues into chidinma_call at the stall
await walkAndOpen();
await page.waitForSelector('text="Don\'t worry');
await page.screenshot({ path: "/tmp/06-midgame.png" });
await page.click('text="Don\'t worry');

// afternoon changemaking scene, auto-continues into confrontation
await walkAndOpen();
await page.waitForSelector("text=Quick — how much change");
await page.screenshot({ path: "/tmp/07-changemaking.png" });
await page.click("text=₦650");

await page.waitForSelector("text=Call the traders to stand with you");
await page.screenshot({ path: "/tmp/08-confrontation.png" });
await page.click("text=Call the traders to stand with you");

await page.waitForSelector("text=The Market Stands");
await page.screenshot({ path: "/tmp/09-ending.png" });

await browser.close();

if (hadError) {
  console.log("SMOKE TEST FAILED: console/page errors were logged above");
  process.exit(1);
}
console.log("SMOKE TEST PASSED");
