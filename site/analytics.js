/* Basic consent mode: do not load Google or send pings before explicit consent. */
(() => {
  const config = document.querySelector("script[data-measurement-id]");
  const id = config.dataset.measurementId;
  const key = config.dataset.consentKey;
  const banner = document.querySelector(".analytics-banner");
  const maxAge = 180 * 86400000;
  let loaded = false;
  let returnFocus;
  const read = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      return saved &&
        saved.measurement === id &&
        ["accepted", "rejected"].includes(saved.choice) &&
        Number.isFinite(saved.at) &&
        saved.at <= Date.now() &&
        Date.now() - saved.at < maxAge
        ? saved.choice
        : null;
    } catch {
      return null;
    }
  };
  const clearCookies = () => {
    const hostParts = location.hostname.split(".");
    const paths = new Set(["/"]);
    const segments = location.pathname.split("/").filter(Boolean);
    for (let i = 1; i <= segments.length; i++) {
      paths.add("/" + segments.slice(0, i).join("/"));
      paths.add("/" + segments.slice(0, i).join("/") + "/");
    }
    for (const item of document.cookie.split(";")) {
      const name = item.trim().split("=")[0];
      if (!/^_ga(?:_|$)|^_gid$|^_gat(?:_|$)/.test(name)) continue;
      for (const path of paths) {
        const expired = `${name}=; Max-Age=0; path=${path}; SameSite=Lax`;
        document.cookie = expired;
        for (let i = 0; i < hostParts.length - 1; i++) {
          document.cookie = `${expired}; domain=${hostParts.slice(i).join(".")}`;
          document.cookie = `${expired}; domain=.${hostParts.slice(i).join(".")}`;
        }
      }
    }
  };
  const cleanUrl = (value) => {
    try {
      const url = new URL(value);
      return url.origin + url.pathname;
    } catch {
      return "";
    }
  };
  const enable = () => {
    if (!id || loaded) return;
    loaded = true;
    window[`ga-disable-${id}`] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      function () {
        window.dataLayer.push(arguments);
      };
    window.gtag("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    window.gtag("consent", "update", { analytics_storage: "granted" });
    window.gtag("js", new Date());
    window.gtag("config", id, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_expires: 180 * 86400,
      cookie_update: false,
      page_location: cleanUrl(location.href),
      page_referrer: cleanUrl(document.referrer),
    });
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.append(script);
  };
  const disable = () => {
    if (id) window[`ga-disable-${id}`] = true;
    clearCookies();
  };
  let choice = read();
  banner.hidden = Boolean(choice);
  if (choice === "accepted") enable();
  else disable();
  document.querySelectorAll(".cookie-settings").forEach((button) =>
    button.addEventListener("click", () => {
      returnFocus = button;
      banner.hidden = false;
      banner.querySelector("button").focus({ preventScroll: true });
    }),
  );
  banner.querySelectorAll("[data-analytics-choice]").forEach((button) =>
    button.addEventListener("click", () => {
      choice = button.dataset.analyticsChoice;
      try {
        localStorage.setItem(
          key,
          JSON.stringify({ choice, at: Date.now(), measurement: id }),
        );
      } catch {
        /* Consent works for this page even when storage is blocked. */
      }
      banner.hidden = true;
      returnFocus?.focus({ preventScroll: true });
      returnFocus = undefined;
      document.querySelector(".analytics-announcement").textContent =
        "Your analytics preferences have been saved.";
      if (choice === "accepted") enable();
      else {
        disable();
        if (loaded) location.reload();
      }
    }),
  );
  window.addEventListener("storage", (event) => {
    if (event.key !== key && event.key !== null) return;
    // Reload so a changed or withdrawn choice also applies to already-open tabs.
    if (read() !== choice) {
      disable();
      location.reload();
    }
  });
})();
