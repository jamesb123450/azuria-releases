document.documentElement.classList.add("js");
// The site is readable without JavaScript. This adds navigation and screenshot controls only.
const menuButton = document.querySelector("[data-menu-toggle]");
const menu = document.querySelector("#site-navigation");
function closeMenu() {
  menuButton?.setAttribute("aria-expanded", "false");
  menu?.classList.remove("is-open");
}
menuButton?.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(open));
  menu?.classList.toggle("is-open", open);
});
menu?.addEventListener("click", (event) => {
  if (event.target.closest("a")) closeMenu();
});
document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    menuButton?.getAttribute("aria-expanded") === "true"
  ) {
    closeMenu();
    menuButton.focus();
  }
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".site-header")) closeMenu();
});
const screenshot = document.querySelector("[data-theme-preview]");
for (const button of document.querySelectorAll("[data-preview-image]")) {
  button.addEventListener("click", () => {
    if (!screenshot) return;
    screenshot.src = button.dataset.previewImage;
    screenshot.alt = button.dataset.previewAlt;
    for (const option of document.querySelectorAll("[data-preview-image]"))
      option.setAttribute("aria-pressed", String(option === button));
    const caption = document.querySelector("[data-preview-caption]");
    if (caption) caption.textContent = button.dataset.previewCaption;
  });
}

function updateDownloadLinks(installer) {
  for (const anchor of document.querySelectorAll("[data-download-link]")) {
    anchor.href =
      installer ||
      "https://github.com/jamesb123450/azuria-releases/releases/latest";
    const label = anchor.querySelector("[data-download-label]");
    if (label)
      label.textContent = installer
        ? "Download for Windows"
        : anchor.dataset.fallbackLabel;
  }
}

// Static content stays usable offline; successful API data refreshes the latest release only.
async function refreshLatestRelease() {
  const status = document.querySelector("[data-release-status]");
  try {
    const { latestReleaseAPI, parseRelease, releaseSummary } =
      await import("./release-data.mjs");
    const response = await fetch(latestReleaseAPI, {
      headers: { Accept: "application/vnd.github+json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Release lookup unavailable");
    const latest = parseRelease(await response.json());
    if (!latest) throw new Error("Unexpected release metadata");
    updateDownloadLinks(latest.installer);
    const date = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(latest.published));
    for (const node of document.querySelectorAll("[data-latest-version]"))
      node.textContent = latest.tag;
    for (const node of document.querySelectorAll("[data-latest-date]")) {
      node.textContent = date;
      if (node.tagName === "TIME") node.dateTime = latest.published;
    }
    const card = document.querySelector("[data-latest-card]");
    if (card) {
      card.querySelector(".update-cover > span").textContent = latest.tag;
      card.querySelector("h3").textContent = "What’s new";
      card.querySelector(".update-body p").textContent = releaseSummary(
        latest.notes,
      );
      const time = card.querySelector("time");
      time.textContent = date;
      time.dateTime = latest.published;
      for (const anchor of card.querySelectorAll("a")) anchor.href = latest.url;
      card
        .querySelector(".update-cover")
        .setAttribute("aria-label", `Read ${latest.tag} release notes`);
    }
    const notice = document.querySelector("[data-latest-notice]");
    const history = document.querySelector(".release-list");
    if (history && notice?.dataset.builtTag !== latest.tag) {
      // Build a new entry with textContent, never release-provided HTML.
      for (const badge of history.querySelectorAll(".outline-badge"))
        badge.remove();
      const entry = document.createElement("article");
      entry.className = "release-entry";
      const heading = document.createElement("h2");
      heading.textContent = latest.tag;
      const time = document.createElement("time");
      time.dateTime = latest.published;
      time.textContent = date;
      const notes = document.createElement("div");
      notes.className = "live-release-notes";
      notes.textContent = latest.notes;
      const anchor = document.createElement("a");
      anchor.className = "text-link";
      anchor.href = latest.url;
      anchor.textContent = "View release on GitHub";
      entry.append(heading, time, notes, anchor);
      history.prepend(entry);
    }
    if (notice) notice.dataset.builtTag = latest.tag;
    if (status)
      status.textContent =
        "Checked against the latest published GitHub release.";
  } catch {
    updateDownloadLinks(null);
    if (status)
      status.textContent =
        "Live release check unavailable. Use View latest release for the current download and notes.";
  }
}
let lastReleaseCheck = Date.now();
refreshLatestRelease();
setInterval(
  () => {
    if (document.visibilityState !== "visible") return;
    lastReleaseCheck = Date.now();
    refreshLatestRelease();
  },
  15 * 60 * 1000,
);
document.addEventListener("visibilitychange", () => {
  if (
    document.visibilityState === "visible" &&
    Date.now() - lastReleaseCheck > 5 * 60 * 1000
  ) {
    lastReleaseCheck = Date.now();
    refreshLatestRelease();
  }
});

// Indicate the current homepage section in the single navigation menu.
const sectionLinks = [
  ...document.querySelectorAll('#site-navigation a[href^="#"]'),
];
if (sectionLinks.length && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      for (const link of sectionLinks) {
        if (link.hash === `#${visible.target.id}`)
          link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      }
    },
    { rootMargin: "-15% 0px -45% 0px", threshold: [0, 0.25, 0.5] },
  );
  for (const link of sectionLinks) {
    const section = document.querySelector(link.hash);
    if (section) observer.observe(section);
  }
}

const panorama = document.querySelector("[data-panorama]");
if (panorama)
  import("./panorama.js")
    .then(({ mountPanorama }) => mountPanorama(panorama))
    .catch(() => {});
