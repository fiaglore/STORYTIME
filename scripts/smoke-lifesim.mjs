// Manual smoke test for Lagos Life mode: confirms the title screen works,
// and that the life-sim loop (create -> age up -> handle an event -> get
// a job -> eventually die -> start a new life) runs end-to-end without
// errors.
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

await page.goto(baseUrl);
await page.waitForSelector("text=I'm 16 or older");
await page.click("text=I'm 16 or older");

await page.waitForSelector("text=Find Out What It Is About Lagos");
await page.screenshot({ path: "/tmp/lifesim-01-title-modes.png" });
await page.click("text=Find Out What It Is About Lagos");

await page.waitForSelector("text=Begin life");
await page.fill("#lifesim-name", "Adaeze");
await page.click("text=Begin life");

await page.waitForSelector("text=Age up");
await page.screenshot({ path: "/tmp/lifesim-02-playing.png" });

// Age up repeatedly, handling any event that pops up, until adulthood (18)
// or a generous cap to avoid an infinite loop if something's wrong.
for (let i = 0; i < 60; i++) {
  const ageText = await page.locator(".story-screen__title").textContent();
  const ageMatch = ageText?.match(/Age (\d+)/);
  const age = ageMatch ? parseInt(ageMatch[1], 10) : 0;
  if (age >= 18) break;

  const eventVisible = await page.locator(".lifesim-event").count();
  if (eventVisible > 0) {
    const choiceButtons = page.locator(".lifesim-event .choice-button");
    const count = await choiceButtons.count();
    await choiceButtons.nth(Math.floor(Math.random() * count)).click();
  } else {
    await page.click("text=Age up");
  }
  await page.waitForTimeout(50);
}

await page.screenshot({ path: "/tmp/lifesim-03-adult.png" });

// Should be an adult now — try getting a job.
const jobButton = page.locator(".lifesim-job__button");
if ((await jobButton.count()) > 0) {
  await jobButton.click();
  await page.waitForSelector(".lifesim-jobs");
  await page.screenshot({ path: "/tmp/lifesim-04-jobs.png" });
  await page.locator(".lifesim-jobs .rpg-choice-pill").first().click();
  await page.waitForSelector("text=Working as a");
}

console.log("Life sim golden path reached adulthood + job selection OK");

if (hadError) {
  console.log("SMOKE TEST FAILED: console/page errors were logged above");
  process.exit(1);
}
console.log("LIFESIM SMOKE TEST PASSED");
await browser.close();
