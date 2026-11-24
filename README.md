# VITA Project Page

[Live website](https://xiang-kai.github.io/vita-cvpr26.github.io/) &#183;
[Public reference code](https://github.com/Xiang-Kai/VITA) &#183;
[Paper](https://arxiv.org/abs/2511.19859)

The research website for **Unifying Perception and Action: A Hybrid-Modality
Pipeline with Implicit Visual Chain-of-Thought for Robotic Action Generation**.
The public training/evaluation implementation lives in a separate repository.

## Run Locally

This is a static site. No framework, build pipeline or JavaScript dependency is
required for deployment. Serve the repository with any static HTTP server:

```bash
python3 -m http.server 8000
```

Visit `http://localhost:8000`. ES modules require HTTP rather than opening
`index.html` as a local file.

## Checks

Node.js 22 or newer is needed only for development checks:

```bash
npm test
node --check static/js/site.js
```

Tests verify the complete original video inventory, page anchors, local assets,
resource links and command-builder budgets. They make no model, robot or
training calls. GitHub Actions runs these checks on pushes and pull requests.

## Structure

- `index.html`: research content, accessible navigation and all original video links.
- `static/css/site.css`: responsive design tokens, light/dark themes and reduced-motion rules.
- `static/js/site.js`: progressive enhancement, video selection, copy controls and navigation.
- `static/js/recipe.js`: tested configuration-only command generation.
- `static/js/theme-init.js`: optional persisted theme, with a storage-denied fallback.
- `media/`: unchanged original paper figures and 36 research demonstration videos.
- `static/images/demo-poster.jpg`: a frame from the existing first UR5e clip, used only as a video-player poster.

The page no longer loads the old template's jQuery, carousel, icon or unrelated
interpolation-frame scripts. Original legacy assets remain in Git history;
they are not dependencies of the new page.

Videos never autoplay. With JavaScript, the selected source is assigned only
after an explicit play request; browsing clips does not fetch media. Without
JavaScript, the initial player uses `preload="none"`. Original-file
links remain available when JavaScript is disabled. The command builder only
prepares configuration; it cannot start a training job.

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
