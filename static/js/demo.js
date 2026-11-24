export function clipAsset(group, index) {
  if (
    !/^[a-z0-9_/]+$/.test(group.folder) ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= Number(group.count)
  ) {
    throw new Error("Choose an existing demo clip.");
  }
  const stem = `${group.folder}/video${Number(group.offset) + index + 1}`;
  return {
    source: `media/${stem}.mp4`,
    poster: `static/images/demos/${stem}.webp`,
  };
}

export function demoSelection(search, groups) {
  const params = new URLSearchParams(search);
  const group =
    groups.find((item) => item.value === params.get("demo")) ?? groups[0];
  const clip = params.get("clip") ?? "1";
  const index = /^[1-9]\d*$/.test(clip) ? Number(clip) - 1 : 0;
  return {
    group,
    index:
      index < Number(group.count) && Number.isSafeInteger(index) ? index : 0,
  };
}

export function demoPermalink(href, group, index) {
  clipAsset(group, index);
  const url = new URL(href);
  // Share only the clip selection, never unrelated query parameters.
  url.search = new URLSearchParams({
    demo: group.value,
    clip: String(index + 1),
  });
  url.hash = "demos";
  return url.href;
}

export function initDemos() {
  const group = document.querySelector("#demo-group");
  const video = document.querySelector("#demo-video");
  const play = document.querySelector("#demo-play");
  const clips = document.querySelector("#demo-clips");
  const status = document.querySelector("#demo-status");
  const previous = document.querySelector("#demo-previous");
  const next = document.querySelector("#demo-next");
  const groups = [...group.options].map((option) => ({
    value: option.value,
    ...option.dataset,
  }));
  let selectedIndex = 0;
  let selectionVersion = 0;
  let attemptVersion = 0;
  let selectedSource;

  const chooseClip = (index, updateURL = true) => {
    const data = groups.find((item) => item.value === group.value);
    const { source, poster } = clipAsset(data, index);
    selectedIndex = index;
    selectedSource = source;
    selectionVersion++;
    video.pause();
    video.removeAttribute("src");
    video.controls = false;
    video.load();
    video.poster = poster;
    play.hidden = false;
    play.setAttribute("aria-label", `Play ${data.title}, clip ${index + 1}`);
    video.setAttribute("aria-label", `${data.title}, clip ${index + 1}`);
    document.querySelector("#demo-title").textContent = data.title;
    document.querySelector("#demo-description").textContent = data.description;
    document.querySelector("#demo-kind").textContent = data.kind.toUpperCase();
    document.querySelector("#demo-counter").textContent =
      `CLIP ${String(index + 1).padStart(2, "0")} / ${String(data.count).padStart(2, "0")}`;
    document.querySelector("#demo-download").href = source;
    const permalink = demoPermalink(location.href, data, index);
    document.querySelector("#demo-share").href = permalink;
    previous.disabled = index === 0;
    next.disabled = index === Number(data.count) - 1;
    status.textContent = "Preview frame only. Press play to load this clip.";
    clips.querySelectorAll("button").forEach((button, position) => {
      button.setAttribute("aria-pressed", String(position === index));
      button.tabIndex = position === index ? 0 : -1;
    });
    if (updateURL) {
      const url = new URL(permalink);
      url.hash = location.hash;
      try {
        history.replaceState(null, "", url);
      } catch {
        // The explicit permalink still works when history changes are denied.
      }
    }
  };

  const chooseGroup = (index = 0, updateURL = true) => {
    const data = groups.find((item) => item.value === group.value);
    clips.replaceChildren();
    clips.style.setProperty("--clip-count", data.count);
    for (let position = 0; position < Number(data.count); position++) {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute(
        "aria-label",
        `Clip ${position + 1} of ${data.count}`,
      );
      const image = document.createElement("img");
      image.src = clipAsset(data, position).poster;
      image.alt = "";
      image.width = 160;
      image.height = 100;
      image.loading = "lazy";
      image.decoding = "async";
      const number = document.createElement("span");
      number.textContent = String(position + 1).padStart(2, "0");
      button.append(image, number);
      button.addEventListener("click", () => chooseClip(position));
      clips.append(button);
    }
    chooseClip(index, updateURL);
  };
  const restoreSelection = () => {
    const selected = demoSelection(location.search, groups);
    group.value = selected.group.value;
    chooseGroup(selected.index, false);
  };
  group.disabled = false;
  previous.hidden = next.hidden = false;
  document.querySelector("#demo-share").hidden = false;
  group.addEventListener("change", () => chooseGroup());
  previous.addEventListener("click", () => chooseClip(selectedIndex - 1));
  next.addEventListener("click", () => chooseClip(selectedIndex + 1));
  clips.addEventListener("keydown", (event) => {
    const count = clips.children.length;
    const positions = {
      ArrowLeft: (selectedIndex + count - 1) % count,
      ArrowRight: (selectedIndex + 1) % count,
      Home: 0,
      End: count - 1,
    };
    if (!(event.key in positions)) return;
    event.preventDefault();
    chooseClip(positions[event.key]);
    clips.children[selectedIndex].focus({ preventScroll: true });
  });
  window.addEventListener("popstate", restoreSelection);
  restoreSelection();

  const failed = () => {
    play.hidden = false;
    status.textContent =
      "Playback unavailable. Retry with Play or open the original video below.";
  };
  play.addEventListener("click", async () => {
    const version = selectionVersion;
    attemptVersion = version;
    play.hidden = true;
    video.controls = true;
    video.src = selectedSource;
    video.focus();
    status.textContent = "Loading the selected video...";
    try {
      await video.play();
      if (version === selectionVersion)
        status.textContent = "Use the video controls to pause or seek.";
    } catch {
      // A late rejection from a previous selection must not change the new clip.
      if (version === selectionVersion) failed();
    }
  });
  video.addEventListener("error", () => {
    if (video.error && attemptVersion === selectionVersion) failed();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) video.pause();
  });
}
