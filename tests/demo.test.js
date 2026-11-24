import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { clipAsset, demoSelection, demoPermalink } from "../static/js/demo.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(resolve(root, "index.html"), "utf8");
const groups = [
  ...html.matchAll(/<option\b[^>]*data-folder="[^"]+"[^>]*>/g),
].map(([tag]) => ({
  value: tag.match(/value="([^"]+)"/)[1],
  ...Object.fromEntries(
    [...tag.matchAll(/data-([a-z]+)="([^"]*)"/g)].map((match) => [
      match[1],
      match[2],
    ]),
  ),
}));

test("every clip has a bounded WebP preview derived from an original video", () => {
  let count = 0,
    total = 0;
  for (const group of groups) {
    for (let index = 0; index < Number(group.count); index++) {
      const { source, poster } = clipAsset(group, index);
      assert.ok(html.includes(`href="${source}"`));
      const file = resolve(root, poster);
      const bytes = readFileSync(file);
      assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
      assert.equal(bytes.toString("ascii", 8, 12), "WEBP");
      assert.ok(statSync(file).size < 64 * 1024, poster);
      total += bytes.length;
      count++;
    }
  }
  assert.equal(count, 36);
  assert.ok(total < 750 * 1024, "Keep all preview assets under 750 KiB.");
});

test("shareable selections round-trip for every original clip", () => {
  for (const group of groups) {
    for (let index = 0; index < Number(group.count); index++) {
      const url = new URL(
        demoPermalink(
          "https://example.org/project/?unrelated=private#code",
          group,
          index,
        ),
      );
      assert.equal(url.pathname, "/project/");
      assert.equal(url.hash, "#demos");
      assert.equal(url.searchParams.has("unrelated"), false);
      assert.deepEqual(demoSelection(url.search, groups), { group, index });
    }
  }
});

test("invalid clip queries cannot escape the finite clip inventory", () => {
  for (const clip of [
    "0",
    "-1",
    "1.5",
    "NaN",
    "Infinity",
    "1;echo",
    "999999999999999999999",
    "6",
  ]) {
    const selection = demoSelection(
      `?demo=libero&clip=${encodeURIComponent(clip)}`,
      groups,
    );
    assert.equal(selection.group.value, "libero");
    assert.equal(selection.index, 0);
  }
  const defaultSelection = demoSelection("?demo=unknown&clip=-1", groups);
  assert.equal(defaultSelection.group.value, "color");
  assert.equal(defaultSelection.index, 0);
});

test("clip asset generation respects group offsets and rejects invalid input", () => {
  const plate = groups.find((group) => group.value === "plate");
  assert.equal(clipAsset(plate, 0).source, "media/ur5e/video4.mp4");
  for (const index of [-1, 3, 1.5, NaN, "1"])
    assert.throws(() => clipAsset(plate, index));
  assert.throws(() => clipAsset({ ...plate, folder: "../invalid" }, 0));
});
