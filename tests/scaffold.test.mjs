import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";
import { chromium } from "playwright";

test("production serves the Plus One starter and its assets under /plus-one", async (t) => {
  const listener = createServer().listen(0, "127.0.0.1");
  await once(listener, "listening");
  const { port } = listener.address();
  listener.close();
  await once(listener, "close");
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, [
    "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port),
  ], { stdio: "inherit", env: {
    ...process.env, NEXT_TELEMETRY_DISABLED: "1",
    NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
    SZOCIAL_PUBLIC_ORIGIN: "", PLUS_ONE_DATABASE_URL: "", PLUS_ONE_DISCOVER_DEMO: "",
  } });
  t.after(async () => {
    if (server.exitCode === null) {
      const stopped = once(server, "exit");
      server.kill();
      await stopped;
    }
  });

  let health;
  for (let attempt = 0; attempt < 50 && server.exitCode === null; attempt++) {
    health = await fetch(`${base}/plus-one/api/health`, {
      signal: AbortSignal.timeout(1000),
    }).catch(() => undefined);
    if (health?.ok) break;
    await delay(200);
  }
  assert.ok(health?.ok, "The prefixed health route should be ready");
  assert.deepEqual(await health.json(), { status: "ok" });
  assert.match(health.headers.get("server-timing"), /^app;dur=\d+\.\d{2}$/);
  assert.equal((await fetch(base)).status, 404);

  const browser = await chromium.launch(process.env.CHROMIUM_PATH
    ? { executablePath: process.env.CHROMIUM_PATH }
    : { channel: "chrome" });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const failed = [];
  const pageErrors = [];
  const styles = [];
  page.on("requestfailed", (request) => {
    if (request.failure()?.errorText !== "net::ERR_ABORTED") failed.push(request.url());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    const request = response.request();
    if (request.resourceType() === "stylesheet") styles.push(response);
    if (!response.ok() && response.status() >= 400) failed.push(response.url());
  });
  const response = await page.goto(`${base}/plus-one`, { waitUntil: "load" });
  assert.equal(response.status(), 200);
  const heading = page.getByRole("heading", { name: "Find a Plus One", exact: true });
  assert.ok(await heading.isVisible());
  assert.equal(await heading.evaluate((el) => getComputedStyle(el).fontSize), "36px");
  assert.ok(styles.length > 0, "The browser should fetch a stylesheet");
  assert.ok(styles.every((asset) => new URL(asset.url()).pathname.startsWith("/plus-one/_next/")));
  assert.deepEqual(failed, []);
  assert.deepEqual(pageErrors, []);

  const prefix = base + "/plus-one";
  const nav = page.getByRole("navigation", { name: "Plus One navigation" });

  await t.test("mobile first visit, keyboard focus, and returning browser", async () => {
    assert.equal(await nav.evaluate((el) => getComputedStyle(el).position), "fixed");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    assert.ok(await skip.evaluate((el) => document.activeElement === el));
    assert.ok(await skip.isVisible());
    await page.keyboard.press("Enter");
    assert.equal(await page.evaluate(() => document.activeElement.id), "main-content");
    await page.setViewportSize({ width: 320, height: 780 });
    assert.ok(await page.evaluate(() =>
      document.documentElement.scrollWidth <= document.documentElement.clientWidth
    ));

    const redirect = page.waitForResponse((res) =>
      res.url() === prefix + "/start" && res.status() === 303
    );
    await page.getByRole("button", { name: "Explore Plus One" }).click();
    assert.equal((await redirect).headers().location, "/plus-one/dashboard");
    await page.waitForURL(prefix + "/dashboard");
    await page.getByRole("heading", { name: "Find your kind of company." }).waitFor();
    assert.equal(await nav.getByRole("link", { name: "Home" }).getAttribute("aria-current"), "page");
    const photo = page.getByRole("img", { name: "Two friends laughing over coffee at an outdoor Mumbai café" });
    await photo.evaluate((img) => img.decode());
    assert.ok((await photo.getAttribute("src")).startsWith("/plus-one/"));
    const selectedPhoto = new URL(await photo.evaluate((img) => img.currentSrc));
    assert.ok(selectedPhoto.pathname.startsWith("/plus-one/_next/static/media/"));
    assert.match(selectedPhoto.pathname, /mumbai-cafe-640\..+\.webp$/);
    assert.equal((await photo.getAttribute("srcset")).split(",").length, 3);
    assert.deepEqual(failed, []);
    assert.deepEqual(pageErrors, []);
    const preference = (await page.context().cookies()).find(
      (cookie) => cookie.name === "plus-one-starter-complete"
    );
    assert.equal(preference?.path, "/plus-one");
    assert.equal(preference?.httpOnly, true);
    assert.equal(preference?.secure, true);

    await page.goto(prefix);
    await page.waitForURL(prefix + "/dashboard");
    await page.getByRole("link", { name: "How Plus One works" }).click();
    await page.waitForURL((url) =>
      url.origin === base && url.pathname === "/plus-one" && url.searchParams.get("intro") === "1"
    );
    await heading.waitFor();
  });

  await t.test("dashboard fits mobile and desktop and exposes working shortcuts", async () => {
    await page.goto(prefix + "/dashboard");
    const main = page.getByRole("main");
    for (const width of [320, 390, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "No horizontal overflow at " + width);
      assert.ok(await main.getByRole("link", { name: "Explore team members", exact: true }).isVisible());
      assert.equal(await nav.evaluate((element) => getComputedStyle(element).position), width < 768 ? "fixed" : "static");
    }
    await main.getByRole("link", { name: "Explore team members", exact: true }).click();
    await page.getByRole("heading", { name: "No bookable team members yet" }).waitFor();
    await nav.getByRole("link", { name: "Home" }).click();
    await main.getByRole("link", { name: /^Bookings/ }).click();
    await page.getByRole("heading", { name: "No bookings yet" }).waitFor();
    await nav.getByRole("link", { name: "Home" }).click();
    await main.getByRole("link", { name: /^Private chats/ }).click();
    await page.getByRole("heading", { name: "No chats yet" }).waitFor();
    await page.getByRole("link", { name: "Szocial Plus One home" }).click();
    await main.getByRole("link", { name: "Check application status" }).click();
    await page.getByRole("heading", { name: "Application status" }).waitFor();

    const highDensity = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    try {
      await highDensity.goto(prefix + "/dashboard");
      const selected = await highDensity.getByRole("img", { name: /outdoor Mumbai café/ }).evaluate(async (img) => {
        await img.decode();
        return new URL(img.currentSrc).pathname;
      });
      assert.match(selected, /\/mumbai-cafe\.[^.]+\.webp$/);
    } finally {
      await highDensity.close();
    }
  });

  await t.test("desktop navigation, direct links, and missing-page recovery", async () => {
    const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    try {
      await desktop.goto(prefix + "/bookings");
      await desktop.getByRole("heading", { name: "No bookings yet" }).waitFor();
      const desktopNav = desktop.getByRole("navigation", { name: "Plus One navigation" });
      assert.equal(await desktopNav.evaluate((el) => getComputedStyle(el).position), "static");
      assert.equal(await desktopNav.getByRole("link", { name: "Bookings" }).getAttribute("aria-current"), "page");
      assert.deepEqual(await desktop.context().cookies(), []);

      await desktopNav.getByRole("link", { name: "Chats" }).click();
      await desktop.waitForURL(prefix + "/chats");
      await desktop.getByRole("heading", { name: "No chats yet" }).waitFor();
      assert.equal(await desktopNav.getByRole("link", { name: "Chats" }).getAttribute("aria-current"), "page");

      await desktopNav.getByRole("link", { name: "Discover" }).click();
      await desktop.waitForURL(prefix + "/discover");
      await desktop.getByRole("heading", { name: "No bookable team members yet" }).waitFor();

      assert.equal((await desktop.goto(prefix + "/missing-page")).status(), 404);
      await desktop.getByRole("heading", { name: "Page not found" }).waitFor();
      await desktop.getByRole("link", { name: "Go to Discover" }).click();
      await desktop.waitForURL(prefix + "/discover");
      await desktop.getByRole("heading", { name: "Discover", exact: true }).waitFor();
    } finally {
      await desktop.close();
    }
  });

  await t.test("the starter works without browser JavaScript", async () => {
    const noScript = await browser.newPage({ javaScriptEnabled: false });
    try {
      await noScript.goto(prefix);
      await noScript.getByRole("button", { name: "Explore Plus One" }).click();
      await noScript.waitForURL(prefix + "/dashboard");
      await noScript.goto(prefix);
      await noScript.waitForURL(prefix + "/dashboard");
    } finally {
      await noScript.close();
    }
  });
});
