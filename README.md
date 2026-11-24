# VITA Project Page

[Live website](https://xiang-kai.github.io/vita-cvpr26.github.io/) &#183;
[Public reference code](https://github.com/Xiang-Kai/VITA) &#183;
[Paper](https://arxiv.org/abs/2511.19859)

The research website for **Unifying Perception and Action: A Hybrid-Modality
Pipeline with Implicit Visual Chain-of-Thought for Robotic Action Generation**.
The public training/evaluation implementation lives in a separate repository.

## Run Locally

This is a static site. No framework, build pipeline or JavaScript dependency is
required for deployment. Start the loopback-only development server:

```bash
npm run dev
```

Visit `http://127.0.0.1:4173`. ES modules require HTTP rather than opening
`index.html` as a local file.

## Checks

Node.js 22.12 or newer is needed only for development checks and the preview server:

```bash
npm test
npm ci
npx playwright install chromium webkit
npm run test:browser
```

Tests verify the complete original video inventory, page anchors, local assets,
resource links, poster budgets, shareable selections and command-builder budgets.
Browser regressions cover Chromium and mobile WebKit: four viewport widths,
keyboard navigation, accessibility, no-JavaScript behavior, denied storage and
clipboard access, all clip selections and failed playback recovery. External
requests are blocked; playback failures are explicitly synthetic. Tests make no
model, robot or training calls. CI runs both suites with no automatic retries.

Browser dependencies are development-only and pinned in `package-lock.json`.
CI uses the matching official Playwright image pinned by its content digest,
including browsers and system libraries, rather than reinstalling OS packages
on every run. Update the workflow image together with `@playwright/test`.
Screenshots/traces remain ignored local diagnostics and are not uploaded by CI.
To use an existing Chromium installation, set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable when running the tests.

## Structure

- `index.html`: research content, accessible navigation and all original video links.
- `static/css/site.css`: responsive design tokens, light/dark themes and reduced-motion rules.
- `static/js/site.js`: progressive enhancement, copy controls and navigation.
- `static/js/demo.js`: on-demand video loading, preview navigation and shareable selection.
- `static/js/recipe.js`: tested configuration-only command generation.
- `static/js/theme-init.js`: optional persisted theme, with a storage-denied fallback.
- `media/`: unchanged original paper figures and 36 research demonstration videos.
- `static/images/demo-poster.jpg`: the legacy first-clip poster, retained but no longer loaded.
- `static/images/demos/`: 36 lightweight WebP preview frames from the original clips.
- `scripts/serve.mjs`: a loopback-only static preview server.
- `scripts/build-posters.mjs`: FFmpeg extraction of the original frames, without rewriting media.

The page no longer loads the old template's jQuery, carousel, icon or unrelated
interpolation-frame scripts. Original legacy assets remain in Git history;
they are not dependencies of the new page.

Videos never autoplay. The enhanced player's initial HTML has no media source;
the selected source is assigned only after an explicit play request, so even
an eager preload scanner cannot start the first clip. Without JavaScript, a
separate native player inside `noscript` uses `preload="none"`. Original-file
links remain available when JavaScript is disabled. The command builder only
prepares configuration; it cannot start a training job.

Each task group has a thumbnail strip, previous/next controls and a permanent
link such as `?demo=libero&clip=3#demos`. On the thumbnail strip, Left/Right
and Home/End select clips. Reloading a shared URL restores that clip without
autoplay. Browsing thumbnails loads only small images; MP4 loading still requires
an explicit play request. A failed play request leaves a retry button and an
original-file link available.

## Preview Provenance

All 36 WebP images are extracted at 0.2 seconds from the corresponding original
MP4, with width limited to 720 pixels, original aspect ratio and metadata removed.
They are navigation previews, not new research figures or independent results.
The tests enforce a combined budget below 750 KiB. With an existing FFmpeg
installation and the full `media/` checkout:

```bash
npm run posters -- --overwrite
```

Only derived WebP previews are replaced; the MP4 sources are never modified.
Omit `--overwrite` to refuse overwriting existing previews.

## Content And Attribution

The editorial layout takes visual direction from
[RoboDemo](https://robodemo-2027.github.io/): clear section numbering, generous
spacing and resource-first navigation. VITA retains its own branding, method,
figures and demonstrations. No RoboDemo results or method assets are reused.
Fonts are served by Google Fonts with readable local fallbacks.

Paper figures and original demonstration videos are research material, not
results of the independent public reference implementation. Keep that distinction
when editing release text. Do not infer success-rate measurements from selected
videos or from a configured training budget.

GitHub Pages publishes the root of `main`. Check desktop/mobile layouts, keyboard
navigation, theme changes and links before publishing.
