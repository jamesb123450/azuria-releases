// Small progressive enhancements; content is never hidden pending JavaScript.
export async function preloadImage(source) {
  const image = new Image();
  image.decoding = "async";
  const loaded = new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });
  image.src = source;
  await loaded;
  if (image.decode) await image.decode();
}

export function createPreviewController({
  image,
  frame,
  buttons,
  caption,
  status,
  media,
  preload = preloadImage,
}) {
  let revision = 0;
  let animations = [];
  let previous = null;
  function finishMotion() {
    for (const animation of animations) animation.cancel();
    animations = [];
    previous?.remove();
    previous = null;
  }
  media?.addEventListener?.("change", () => {
    if (media.matches) finishMotion();
  });
  async function select(button) {
    const request = ++revision;
    finishMotion();
    if (status) status.textContent = "";
    const source = button.dataset.previewImage;
    if (!source || image.getAttribute("src") === source) {
      frame.removeAttribute("aria-busy");
      return false;
    }
    frame.setAttribute("aria-busy", "true");
    try {
      // Decode before replacing the screenshot: failures retain the visible theme.
      await preload(source);
      if (request !== revision) return false;
      const animated = !media?.matches && typeof image.animate === "function";
      if (animated) {
        previous = image.cloneNode(false);
        previous.removeAttribute("data-theme-preview");
        previous.setAttribute("aria-hidden", "true");
        previous.alt = "";
        previous.classList.add("preview-previous");
        frame.append(previous);
      }
      image.src = source;
      image.alt = button.dataset.previewAlt || "Azuria launcher appearance";
      if (caption) caption.textContent = button.dataset.previewCaption;
      for (const option of buttons)
        option.setAttribute("aria-pressed", String(option === button));
      if (animated) {
        const outgoing = previous;
        const timing = { duration: 420, easing: "cubic-bezier(.2,.7,.25,1)" };
        animations = [
          outgoing.animate([{ opacity: 1 }, { opacity: 0 }], timing),
          image.animate(
            [
              { opacity: 0.35, transform: "scale(.995)" },
              { opacity: 1, transform: "scale(1)" },
            ],
            timing,
          ),
        ];
        Promise.allSettled(
          animations.map((animation) => animation.finished),
        ).then(() => {
          outgoing.remove();
          if (previous === outgoing) {
            previous = null;
            animations = [];
          }
        });
      }
      return true;
    } catch {
      if (request === revision && status)
        status.textContent =
          "That preview could not load. Your current appearance is still shown; try again.";
      return false;
    } finally {
      if (request === revision) frame.removeAttribute("aria-busy");
    }
  }
  return { select, finishMotion };
}

export function mountMotion(root = document) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  const image = root.querySelector("[data-theme-preview]");
  const buttons = [...root.querySelectorAll("[data-preview-image]")];
  if (image) {
    const controller = createPreviewController({
      image,
      buttons,
      frame: image.parentElement,
      caption: root.querySelector("figcaption[data-preview-caption]"),
      status: root.querySelector("[data-preview-status]"),
      media,
    });
    for (const button of buttons)
      button.addEventListener("click", () => {
        void controller.select(button);
      });
  }
  if (!("IntersectionObserver" in window) || media.matches) return;
  const active = new Set();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        if (
          media.matches ||
          !entry.target.animate ||
          entry.target.contains(root.activeElement)
        )
          continue;
        const animation = entry.target.animate(
          [
            { opacity: 0.2, transform: "translateY(22px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { duration: 620, easing: "cubic-bezier(.2,.7,.25,1)" },
        );
        active.add(animation);
        animation.finished.then(
          () => active.delete(animation),
          () => active.delete(animation),
        );
      }
    },
    { threshold: 0.08 },
  );
  for (const element of root.querySelectorAll("[data-reveal]"))
    observer.observe(element);
  media.addEventListener("change", () => {
    if (!media.matches) return;
    observer.disconnect();
    for (const animation of active) animation.cancel();
    active.clear();
  });
}
