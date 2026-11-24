try {
  const preference = localStorage.getItem("vita-theme");
  if (preference === "light" || preference === "dark") {
    document.documentElement.dataset.theme = preference;
  }
} catch {
  // Storage may be unavailable; the readable light theme remains the default.
}
