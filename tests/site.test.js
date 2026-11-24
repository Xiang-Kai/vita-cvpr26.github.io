import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { recipePlan } from "../static/js/recipe.js";

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
  assert.equal((html.match(/<video\b/g) ?? []).length, 1);
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
});
