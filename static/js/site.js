import { recipePlan } from "./recipe.js";

(() => {
  "use strict";
  const root = document.documentElement;
  const nav = document.querySelector(".site-nav");
  const menu = document.querySelector(".menu-toggle");
  const theme = document.querySelector(".theme-toggle");
  const closeMenu = () => {
    nav.dataset.open = "false";
    menu.setAttribute("aria-expanded", "false");
  };
  menu.hidden = false;
  menu.addEventListener("click", () => {
    const open = menu.getAttribute("aria-expanded") !== "true";
    nav.dataset.open = String(open);
    menu.setAttribute("aria-expanded", String(open));
  });
  document
    .querySelectorAll("#nav-links a")
    .forEach((link) => link.addEventListener("click", closeMenu));
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      menu.getAttribute("aria-expanded") === "true"
    ) {
      closeMenu();
      menu.focus();
    }
  });
  const updateTheme = () => {
    const dark = root.dataset.theme === "dark";
    theme.querySelector(".theme-label").textContent = dark ? "Light" : "Dark";
    theme.setAttribute(
      "aria-label",
      `Switch to ${dark ? "light" : "dark"} theme`,
    );
    document.querySelector('meta[name="theme-color"]').content = dark
      ? "#221f1e"
      : "#fffaf5";
  };
  theme.hidden = false;
  updateTheme();
  theme.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem("vita-theme", root.dataset.theme);
    } catch {
      /* Session-only theme. */
    }
    updateTheme();
  });
  root.classList.add("enhanced");

  const group = document.querySelector("#demo-group");
  const video = document.querySelector("#demo-video");
  const play = document.querySelector("#demo-play");
  const clips = document.querySelector("#demo-clips");
  const status = document.querySelector("#demo-status");
  const poster = video.getAttribute("poster");
  let selectedSource;
  const chooseClip = (index) => {
    const data = group.selectedOptions[0].dataset;
    const source = `media/${data.folder}/video${Number(data.offset) + index + 1}.mp4`;
    selectedSource = source;
    video.pause();
    // Withhold the source until an explicit play request, not just a preload hint.
    video.removeAttribute("src");
    video.controls = false;
    video.load();
    if (source === "media/ur5e/video1.mp4")
      video.setAttribute("poster", poster);
    else video.removeAttribute("poster");
    play.hidden = false;
    play.setAttribute("aria-label", `Play ${data.title}, clip ${index + 1}`);
    video.setAttribute("aria-label", `${data.title}, clip ${index + 1}`);
    document.querySelector("#demo-title").textContent = data.title;
    document.querySelector("#demo-description").textContent = data.description;
    document.querySelector("#demo-kind").textContent = data.kind.toUpperCase();
    document.querySelector("#demo-counter").textContent =
      `CLIP ${String(index + 1).padStart(2, "0")} / ${String(data.count).padStart(2, "0")}`;
    document.querySelector("#demo-download").href = source;
    status.textContent = "Press play to load the selected video. No autoplay.";
    clips.querySelectorAll("button").forEach((button, position) => {
      button.setAttribute("aria-pressed", String(position === index));
    });
  };
  const chooseGroup = () => {
    const data = group.selectedOptions[0].dataset;
    clips.replaceChildren();
    for (let index = 0; index < Number(data.count); index++) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = String(index + 1).padStart(2, "0");
      button.setAttribute("aria-label", `Clip ${index + 1} of ${data.count}`);
      button.addEventListener("click", () => chooseClip(index));
      clips.append(button);
    }
    chooseClip(0);
  };
  group.disabled = false;
  group.addEventListener("change", () => chooseGroup());
  chooseGroup();
  play.addEventListener("click", async () => {
    const source = selectedSource;
    play.hidden = true;
    video.controls = true;
    video.src = source;
    video.focus();
    status.textContent = "Loading the selected video...";
    try {
      await video.play();
      if (source === selectedSource)
        status.textContent = "Use the video controls to pause or seek.";
    } catch {
      if (source === selectedSource)
        status.textContent =
          "Playback did not start. Use the video controls or open the original video.";
    }
  });
  video.addEventListener("error", () => {
    status.textContent =
      "This video could not load. Try the original video link below.";
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) video.pause();
  });

  const mode = document.querySelector("#recipe-mode");
  const microbatch = document.querySelector("#microbatch");
  const command = document.querySelector("#recipe-command");
  const updateRecipe = () => {
    const plan = recipePlan(mode.value, Number(microbatch.value));
    command.textContent = plan.command;
    document.querySelector("#batch-description").textContent = plan.description;
  };
  mode.disabled = microbatch.disabled = false;
  mode.addEventListener("change", updateRecipe);
  microbatch.addEventListener("change", updateRecipe);
  updateRecipe();

  let toastTimer;
  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.hidden = false;
    button.addEventListener("click", async () => {
      const source = document.getElementById(button.dataset.copy);
      const toast = document.querySelector("#copy-status");
      try {
        await navigator.clipboard.writeText(source.textContent);
        toast.textContent =
          button.dataset.copy === "bibtex"
            ? "Citation copied."
            : "Command copied. This does not start a run.";
      } catch {
        const range = document.createRange();
        range.selectNodeContents(source);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        toast.textContent =
          "Clipboard unavailable. Text selected; use your browser's Copy command.";
      }
      toast.hidden = false;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toast.hidden = true;
      }, 6000);
    });
  });
  if ("IntersectionObserver" in window) {
    const sections = document.querySelectorAll("#top, main > section[id]");
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (!visible) return;
        document.querySelectorAll("#nav-links a").forEach((link) => {
          if (link.hash === `#${visible.target.id}`)
            link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
  }
})();
