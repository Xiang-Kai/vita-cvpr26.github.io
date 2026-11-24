// Extract website previews from original videos. No generated research imagery.
import { mkdir, readFile, stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = await readFile(resolve(root, "index.html"), "utf8");
const sources = [
  ...new Set(
    [...html.matchAll(/href="(media\/[a-z0-9_/]+\.mp4)"/g)].map(
      (match) => match[1],
    ),
  ),
];
if (sources.length !== 36) throw new Error("Expected all 36 original videos.");
const overwrite = process.argv.includes("--overwrite");
for (const source of sources) {
  const input = resolve(root, source);
  await stat(input);
  const output = resolve(
    root,
    source
      .replace(/^media\//, "static/images/demos/")
      .replace(/\.mp4$/, ".webp"),
  );
  await mkdir(dirname(output), { recursive: true });
  const result = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-nostdin",
      overwrite ? "-y" : "-n",
      "-ss",
      "0.2",
      "-i",
      input,
      "-frames:v",
      "1",
      "-vf",
      "scale=w='min(720,iw)':h=-2",
      "-map_metadata",
      "-1",
      "-c:v",
      "libwebp",
      "-quality",
      "74",
      "-compression_level",
      "6",
      output,
    ],
    { stdio: "inherit" },
  );
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`Poster extraction failed: ${source}`);
}
console.log(
  `Extracted ${sources.length} previews at 0.2 seconds; originals unchanged.`,
);
