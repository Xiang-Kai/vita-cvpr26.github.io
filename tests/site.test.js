import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { recipePlan, recipeSelection, recipeURL } from "../static/js/recipe.js";
import { recipeContract } from "../static/js/recipe-contract.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(resolve(root, "index.html"), "utf8");
const text = html.replace(/\s+/g, " ");

test("homepage retains all 36 original demonstration sources without autoplay", () => {
  const videos = [
    ...new Set(
      [...html.matchAll(/media\/[a-z0-9_/]+\.mp4/g)].map((match) => match[0]),
    ),
  ];
  const expected = [
    ...Array.from({ length: 6 }, (_, i) => `media/ur5e/video${i + 1}.mp4`),
    ...[
      "ur5e/long1",
      "ur5e/long2",
      "ur5e/long3",
      "calvin",
      "libero",
      "google_robot",
    ].flatMap((folder) =>
      Array.from({ length: 5 }, (_, i) => `media/${folder}/video${i + 1}.mp4`),
    ),
  ];
  assert.deepEqual(videos.sort(), expected.sort());
  const enhanced = html.replace(/<noscript>[\s\S]*?<\/noscript>/g, "");
  assert.equal((enhanced.match(/<video\b/g) ?? []).length, 1);
  assert.doesNotMatch(enhanced.match(/<video\b[^>]*>/)?.[0] ?? "", /\bsrc=/);
  assert.match(html, /id="demo-fallback"/);
  assert.match(html, /preload="none"/);
  assert.doesNotMatch(html, /\bautoplay\b(?=[^<>]*>)/);
  assert.match(text, /research demonstration videos/);
});

test("interactive task groups resolve to the complete original video archive", () => {
  const groups = [...html.matchAll(/<option\b[^>]*data-folder="[^"]+"[^>]*>/g)];
  assert.equal(groups.length, 8);
  const sources = groups.flatMap(([tag]) => {
    const data = Object.fromEntries(
      [...tag.matchAll(/data-([a-z]+)="([^"]*)"/g)].map((match) => [
        match[1],
        match[2],
      ]),
    );
    assert.ok(data.title && data.description && data.kind);
    return Array.from(
      { length: Number(data.count) },
      (_, index) =>
        `media/${data.folder}/video${Number(data.offset) + index + 1}.mp4`,
    );
  });
  const archive = [
    ...new Set(
      [...html.matchAll(/href="(media\/[^"]+\.mp4)"/g)].map(
        (match) => match[1],
      ),
    ),
  ];
  assert.equal(sources.length, 36);
  assert.equal(new Set(sources).size, 36);
  assert.deepEqual(sources.sort(), archive.sort());
});

test("local fragment targets are unique and resolvable", () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const [, id] of html.matchAll(/href="#([^"]+)"/g))
    assert.ok(ids.includes(id), id);
});

test("resources are first-party local files and legacy template requests are removed", () => {
  for (const [, file] of html.matchAll(/(?:src|href)="(static\/[^"]+)"/g)) {
    assert.ok(existsSync(resolve(root, file)), file);
  }
  assert.doesNotMatch(html, /jquery|bulma|youtube|nerfies|fontawesome/i);
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<title>VITA/);
  assert.match(html, /href="https:\/\/github.com\/Xiang-Kai\/VITA"/);
  assert.match(text, /No paper-level performance claim/);
});

test("the no-script command matches the default interactive smoke plan", () => {
  const command = html.match(/<code id="recipe-command">([^<]+)<\/code>/)?.[1];
  assert.equal(command, recipePlan("smoke", 2).command);
  const plan = recipePlan("smoke", 2);
  assert.equal(
    html
      .match(/id="batch-description"[^>]*>([^<]+)</)?.[1]
      .trim()
      .replace(/\s+/g, " "),
    plan.description,
  );
  for (const stage of plan.stages) {
    const card = html.match(
      new RegExp(`<article data-stage="${stage.name}">([\\s\\S]*?)</article>`),
    )?.[1];
    for (const field of [
      "updates",
      "effectiveBatch",
      "accumulation",
      "microsteps",
    ])
      assert.equal(
        Number(card.match(new RegExp(`data-field="${field}">([^<]+)</`))?.[1]),
        stage[field],
      );
  }
});

test("all paper-plan microbatches match the actual single-device training budget", () => {
  for (const batch of [1, 2, 4, 8, 16, 32, 64]) {
    const paper = recipePlan("paper", batch);
    assert.equal(paper.updates, 360000);
    assert.deepEqual(paper.effectiveBatch, [1024, 192]);
    assert.deepEqual(
      paper.accumulation.map((count) => count * batch),
      [1024, 192],
    );
    assert.match(paper.command, /libero_recipe prepare/);
    assert.doesNotMatch(paper.command, /--smoke|--stage|--device/);
    assert.match(
      paper.command,
      new RegExp(`--microbatch ${batch} --memory-gib 16`),
    );
    const smoke = recipePlan("smoke", batch);
    assert.equal(smoke.updates, 6);
    assert.deepEqual(smoke.effectiveBatch, [batch, batch]);
    assert.match(smoke.command, /--episodes-per-task 1 --max-tasks 1/);
    assert.equal(smoke.command.split("\\\n").length, 3);
  }
});

test("command builder rejects invalid and injectable choices", () => {
  for (const batch of [
    0,
    -1,
    3,
    1.5,
    true,
    "2",
    NaN,
    Infinity,
    "2; echo invalid",
  ]) {
    assert.throws(() => recipePlan("paper", batch));
  }
  assert.throws(() => recipePlan("unsupported", 2));
  for (const suite of [
    "",
    "unknown",
    "__proto__",
    ["libero_object"],
    "libero_object; echo invalid",
  ])
    assert.throws(() => recipePlan("smoke", 2, suite));
});

test("all 70 plans expose consistent stage microsteps and simulation requests", () => {
  let count = 0;
  for (const mode of ["smoke", "paper"]) {
    for (const batch of recipeContract.microbatches) {
      for (const suite of ["all", ...recipeContract.suites]) {
        const plan = recipePlan(mode, batch, suite);
        assert.deepEqual(
          plan.suites,
          suite === "all" ? recipeContract.suites : [suite],
        );
        assert.equal(plan.stages.length, 3);
        assert.equal(
          plan.stages.reduce((sum, stage) => sum + stage.updates, 0),
          plan.updates,
        );
        assert.equal(
          plan.stages.reduce((sum, stage) => sum + stage.microsteps, 0),
          plan.microsteps,
        );
        for (const stage of plan.stages) {
          assert.equal(stage.microsteps, stage.updates * stage.accumulation);
          assert.equal(stage.effectiveBatch, batch * stage.accumulation);
        }
        assert.equal(
          plan.evaluation.trials,
          (suite === "all" ? 4 : 1) * (mode === "smoke" ? 1 : 500),
        );
        if (suite !== "all")
          assert.ok(plan.command.endsWith(`--suites ${suite}`));
        assert.doesNotMatch(plan.command, /--stage|--device|libero_recipe run/);
        count++;
      }
    }
  }
  assert.equal(count, 70);
  assert.equal(recipePlan("paper", 16).microsteps, 19920000);
  assert.equal(recipePlan("smoke", 64).microsteps, 6);
});

test("shareable plans use validated canonical choices and omit unrelated query values", () => {
  const href = recipeURL(
    "https://example.invalid/project/?unrelated=value&demo=calvin#demos",
    "paper",
    16,
    "libero_goal",
  );
  assert.equal(
    href,
    "https://example.invalid/project/?plan=paper&batch=16&suite=libero_goal#code",
  );
  assert.deepEqual(recipeSelection(new URL(href).search), {
    mode: "paper",
    batch: 16,
    suite: "libero_goal",
  });
  for (const query of [
    "?plan=invalid",
    "?batch=3",
    "?batch=2.0",
    "?batch=1e0",
    "?batch=",
    "?batch=Infinity",
    "?suite=unknown",
    "?suite=libero_goal%3Becho",
  ])
    assert.deepEqual(recipeSelection(query), {
      mode: "smoke",
      batch: 2,
      suite: "all",
    });
  assert.deepEqual(recipeSelection(""), {
    mode: "smoke",
    batch: 2,
    suite: "all",
  });
});
