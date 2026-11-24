import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Only the owned loopback preview server is contacted. Media failures and
// clipboard/storage denial below are synthetic browser fixtures, not rollouts.
test.beforeEach(async ({ context }) => {
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return url.origin === "http://127.0.0.1:4173"
      ? route.continue()
      : route.abort();
  });
});

for (const width of [320, 375, 768, 1440]) {
  test(`layout and accessibility at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.locator("#demo-group")).toBeEnabled();
    expect(
      (await page.locator("#demo-group").boundingBox()).height,
    ).toBeGreaterThanOrEqual(44);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBe(width);
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(audit.violations).toEqual([]);
    await expect(page.locator("h1")).toHaveCSS("animation-name", "none");
    expect(errors).toEqual([]);
  });
}

test("all 36 clips have previews, direct links and no media requests before play", async ({
  page,
}) => {
  const media = [];
  page.on("request", (request) => {
    if (request.url().endsWith(".mp4")) media.push(request.url());
  });
  await page.goto("/");
  await expect(page.locator("#demo-group")).toBeEnabled();
  const groups = await page
    .locator("#demo-group option")
    .evaluateAll((options) =>
      options.map((option) => ({ value: option.value, ...option.dataset })),
    );
  let count = 0;
  for (const group of groups) {
    await page.selectOption("#demo-group", group.value);
    for (let index = 0; index < Number(group.count); index++) {
      const button = page.locator("#demo-clips button").nth(index);
      await button.click();
      const stem = `${group.folder}/video${Number(group.offset) + index + 1}`;
      await expect(page.locator("#demo-video")).not.toHaveAttribute("src");
      await expect(page.locator("#demo-video")).toHaveAttribute(
        "poster",
        `static/images/demos/${stem}.webp`,
      );
      await expect
        .poll(() =>
          button
            .locator("img")
            .evaluate((image) => image.complete && image.naturalWidth > 0),
        )
        .toBe(true);
      await expect(page.locator("#demo-download")).toHaveAttribute(
        "href",
        `media/${stem}.mp4`,
      );
      await expect(page.locator("#demo-share")).toHaveAttribute(
        "href",
        new RegExp(`demo=${group.value}&clip=${index + 1}#demos$`),
      );
      await expect(
        page.locator('#demo-clips [aria-pressed="true"]'),
      ).toHaveCount(1);
      count++;
    }
  }
  expect(count).toBe(36);
  expect(media).toEqual([]);
});

test("deep links, reload and keyboard navigation preserve the selected clip", async ({
  page,
}) => {
  await page.goto("/?demo=libero&clip=3#demos");
  await expect(page.locator("#demo-group")).toHaveValue("libero");
  await expect(page.locator("#demo-counter")).toContainText("03 / 05");
  const selected = page.locator('#demo-clips [aria-pressed="true"]');
  await selected.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#demo-counter")).toContainText("04 / 05");
  await expect(page.locator('#demo-clips [tabindex="0"]')).toHaveCount(1);
  await page.keyboard.press("End");
  await expect(page.locator("#demo-next")).toBeDisabled();
  await page.reload();
  await expect(page.locator("#demo-counter")).toContainText("05 / 05");
  await page.locator("#demo-previous").click();
  await expect(page.locator("#demo-counter")).toContainText("04 / 05");
  await page.goto("/?demo=unknown&clip=-99#demos");
  await expect(page.locator("#demo-group")).toHaveValue("color");
  await expect(page.locator("#demo-counter")).toContainText("01 / 03");
});

test("failed media can be retried without losing the selected clip", async ({
  page,
}) => {
  await page.route("**/*.mp4", (route) => route.abort());
  await page.goto("/?demo=calvin&clip=2#demos");
  await page.locator("#demo-play").click();
  await expect(page.locator("#demo-status")).toContainText(
    "Playback unavailable",
  );
  await expect(page.locator("#demo-play")).toBeVisible();
  await expect(page.locator("#demo-download")).toHaveAttribute(
    "href",
    "media/calvin/video2.mp4",
  );
});

test("a late rejection cannot overwrite a newer selection of the same clip", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.syntheticPlayReject = null;
    HTMLMediaElement.prototype.play = function () {
      return new Promise((_, reject) => {
        window.syntheticPlayReject = reject;
      });
    };
  });
  await page.route("**/*.mp4", (route) => route.abort());
  await page.goto("/#demos");
  await page.locator("#demo-play").click();
  await page.locator("#demo-clips button").nth(1).click();
  await page.locator("#demo-clips button").nth(0).click();
  await page.evaluate(() =>
    window.syntheticPlayReject(new Error("Synthetic late playback failure")),
  );
  await expect(page.locator("#demo-status")).toHaveText(
    "Preview frame only. Press play to load this clip.",
  );
});

test("theme and clipboard fallbacks work with storage unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Synthetic storage denial", "SecurityError");
      },
    });
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: () =>
          Promise.reject(new Error("Synthetic clipboard denial")),
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.locator('[data-copy="recipe-command"]').click();
  await expect(page.locator("#copy-status")).toContainText(
    "Clipboard unavailable",
  );
  expect(await page.evaluate(() => getSelection().toString())).toBe(
    await page.locator("#recipe-command").textContent(),
  );
  await page.reload();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
});

test("mobile menu closes on Escape, outside click, focus exit and navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 950 });
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Menu", exact: true });
  for (const action of ["escape", "outside", "focus", "link"]) {
    await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    if (action === "escape") await page.keyboard.press("Escape");
    if (action === "outside") await page.locator("h1").click();
    if (action === "focus")
      await page.locator(".resource-buttons a").first().focus();
    if (action === "link")
      await page.locator('#nav-links a[href="#code"]').click();
    await expect(menu).toHaveAttribute("aria-expanded", "false");
  }
});

test("the selected theme is restored after reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("all recipe variants update, and copy never executes a command", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.syntheticClipboard = "";
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (text) => {
          window.syntheticClipboard = text;
        },
      },
    });
  });
  await page.goto("/");
  for (const mode of ["smoke", "paper"]) {
    await page.selectOption("#recipe-mode", mode);
    for (const batch of [1, 2, 4, 8, 16, 32, 64]) {
      await page.selectOption("#microbatch", String(batch));
      await expect(page.locator("#recipe-command")).toContainText(
        `--microbatch ${batch}`,
      );
      await page.locator('[data-copy="recipe-command"]').click();
      expect(await page.evaluate(() => window.syntheticClipboard)).toBe(
        await page.locator("#recipe-command").textContent(),
      );
    }
  }
  await page.locator('[data-copy="bibtex"]').click();
  expect(await page.evaluate(() => window.syntheticClipboard)).toBe(
    await page.locator("#bibtex").textContent(),
  );
});

test("paper and all video links remain usable without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 950 },
  });
  await context.route("**/*", (route) =>
    new URL(route.request().url()).origin === "http://127.0.0.1:4173"
      ? route.continue()
      : route.abort(),
  );
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/");
  await expect(page.locator("#nav-links")).toBeVisible();
  await expect(page.locator("#demo-group")).toBeDisabled();
  await expect(page.locator(".video-archive a")).toHaveCount(36);
  const nav = await page.locator(".site-nav").boundingBox();
  const hero = await page.locator(".hero-meta").boundingBox();
  expect(nav.y + nav.height).toBeLessThan(hero.y);
  await expect(page.locator("#recipe-command")).toContainText("--smoke");
  await context.close();
});
