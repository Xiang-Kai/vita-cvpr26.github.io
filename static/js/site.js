import { recipePlan } from "./recipe.js";
import { initDemos } from "./demo.js";

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
  document.addEventListener("pointerdown", (event) => {
    if (!nav.contains(event.target)) closeMenu();
  });
  document.addEventListener("focusin", (event) => {
    if (!nav.contains(event.target)) closeMenu();
  });
  window.matchMedia("(min-width: 761px)").addEventListener("change", closeMenu);
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

  initDemos();

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
