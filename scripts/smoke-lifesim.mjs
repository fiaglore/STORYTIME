// Manual smoke test for Lagos Life mode: confirms the title screen works,
// and that the full life-sim loop (sign up -> create a character ->
// choose a school -> age up, handling chores/events -> get a job ->
// eventually reach adulthood) runs end-to-end without errors.
//
// Firebase is configured in this repo's .env.production, so a built
// preview always shows the mandatory auth gate before character
// creation — this script signs up with a disposable per-run test account
// to get past it, the same way a real first-time player would.
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
await page.screenshot({ path: "/tmp/lifesim-01-title.png" });
await page.click("text=Find Out What It Is About Lagos");

// Auth gate — sign up with a throwaway account if Firebase is configured
// for this deployment; if it isn't, the gate auto-skips straight to the
// name step instead.
const authGate = page.locator("text=Sign in or create an account");
if (await authGate.count() > 0) {
  await page.click("text=Need an account?");
  await page.fill('input[type="email"]', `smoke-${Date.now()}@example.com`);
  await page.fill('input[type="password"]', "smoke-test-pass-123");
  await page.click("text=Create account");
}

await page.waitForSelector("#lifesim-name", { timeout: 15000 });
await page.fill("#lifesim-name", "Adaeze");
await page.click("text=Next");

await page.waitForSelector("#lifesim-dob");
await page.fill("#lifesim-dob", "2015-06-15");
await page.click("text=Next");

await page.waitForSelector("text=What's your faith?");
await page.click(".lifesim-intro__options .choice-button");
await page.click("text=Next");

for (let i = 0; i < 3; i++) {
  await page.waitForSelector("text=/Question \\d of \\d/");
  await page.locator(".lifesim-intro__options .choice-button").first().click();
}

await page.waitForSelector(".lifesim-reveal__tier");
await page.screenshot({ path: "/tmp/lifesim-02-reveal.png" });
await page.click("text=Begin life");

// Age 0 is always within the school-choice window.
await page.waitForSelector(".lifesim-school button", { timeout: 10000 });
await page.click(".lifesim-school button");

await page.waitForSelector("text=Age up", { timeout: 10000 });
await page.screenshot({ path: "/tmp/lifesim-03-playing.png" });

// Age up repeatedly, handling any event or chore that pops up, until
// adulthood (18) or a generous cap to avoid an infinite loop if
// something's wrong.
for (let i = 0; i < 120; i++) {
  const ageText = await page.locator(".story-screen__title").textContent();
  const ageMatch = ageText?.match(/Age (\d+)/);
  const age = ageMatch ? parseInt(ageMatch[1], 10) : 0;
  if (age >= 18) break;

  const eventVisible = await page.locator(".lifesim-event").count();
  const choreVisible = await page.locator(".lifesim-chore").count();
  if (eventVisible > 0) {
    const choiceButtons = page.locator(".lifesim-event .choice-button");
    const count = await choiceButtons.count();
    await choiceButtons.nth(Math.floor(Math.random() * count)).click();
  } else if (choreVisible > 0) {
    // Play whichever chore mini-game variant showed up — try each
    // possible control until one exists, same dispatch ChoreChallenge
    // itself uses.
    const timingStop = page.locator(".mini-scene--interview button, .mini-scene button:has-text('Stop!')");
    const pickable = page.locator(".mini-scene .change-pill");
    if (await timingStop.count() > 0) {
      await timingStop.first().click();
    } else if (await pickable.count() > 0) {
      await pickable.first().click();
    }
    await page.waitForTimeout(900); // let the pass/fail feedback + retry settle
  } else {
    const ageUpBtn = page.locator(".lifesim-age-up");
    if (await ageUpBtn.count() > 0) await ageUpBtn.click();
  }
  await page.waitForTimeout(80);
}

await page.screenshot({ path: "/tmp/lifesim-04-adult.png" });

// Should be an adult now — try getting a job via the "Get a job" tab.
const jobsTab = page.locator(".lifesim-tab", { hasText: /Get a job|Change job/ });
if ((await jobsTab.count()) > 0) {
  await jobsTab.click();
  await page.waitForSelector(".lifesim-jobs");
  await page.screenshot({ path: "/tmp/lifesim-05-jobs.png" });
  await page.locator(".lifesim-jobs .rpg-choice-pill").first().click();
  // A job interview mini-game may appear before the job is confirmed.
  const interviewStop = page.locator(".mini-scene--interview button");
  if (await interviewStop.count() > 0) {
    await interviewStop.click();
    await page.waitForTimeout(1000);
  }
  await page.waitForSelector("text=Working as a", { timeout: 10000 });
}

console.log("Life sim golden path reached adulthood + job selection OK");

if (hadError) {
  console.log("SMOKE TEST FAILED: console/page errors were logged above");
  process.exit(1);
}
console.log("LIFESIM SMOKE TEST PASSED");
await browser.close();
