import { coverURL, newsDate, newsArticle } from "./news-model.mjs";
const target = document.querySelector("[data-news-feed]");
if (target) initialise();
async function initialise() {
  const moduleBase = new URL("./", import.meta.url);
  const newsBase = new URL("news/", moduleBase);
  const page = target.dataset.newsFeed === "page";
  let config;
  function status(text) {
    const node = document.createElement("p");
    node.setAttribute("role", "status");
    node.textContent = text;
    target.replaceChildren(node);
  }
  function retry(text) {
    status(text);
    const button = document.createElement("button");
    button.className = "button secondary";
    button.textContent = "Try again";
    button.addEventListener("click", load);
    target.append(button);
  }
  async function load() {
    status("Loading news…");
    try {
      if (!config) {
        const response = await fetch(new URL("news-config.json", moduleBase), {
          cache: "no-store",
          signal: AbortSignal.timeout(12000),
        });
        if (!response.ok) throw new Error();
        config = await response.json();
      }
      if (!config.url || !config.key) {
        status("News will be available here soon.");
        return;
      }
      const slug = page
        ? new URL(location.href).searchParams.get("story")
        : null;
      if (slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
        status("This story could not be found.");
        return;
      }
      const rawOffset =
        page && !slug
          ? Number(new URL(location.href).searchParams.get("offset") || 0)
          : 0;
      const offset =
        Number.isSafeInteger(rawOffset) && rawOffset >= 0 && rawOffset <= 10000
          ? rawOffset
          : 0;
      const response = await fetch(`${config.url}/rest/v1/rpc/news_public`, {
        method: "POST",
        headers: { apikey: config.key, "Content-Type": "application/json" },
        body: JSON.stringify({ p_slug: slug, p_offset: offset }),
        signal: AbortSignal.timeout(12000),
        cache: "no-store",
      });
      if (!response.ok) throw new Error();
      const posts = await response.json();
      if (!Array.isArray(posts)) throw new Error();
      if (slug) {
        if (!posts.length) {
          status("This story is unavailable. It may have been unpublished.");
          return;
        }
        const post = posts[0];
        document.querySelector("[data-news-intro]")?.setAttribute("hidden", "");
        document.title = `${post.title} — Azuria News`;
        const back = document.createElement("a");
        back.href = newsBase.href;
        back.className = "text-link";
        back.textContent = "← All news";
        target.replaceChildren(back, newsArticle(post, config.url));
        return;
      }
      if (!posts.length) {
        status(
          offset
            ? "No more stories."
            : "No news yet. Check back for updates from Azuria Studios.",
        );
        if (!offset) return;
      }
      const grid = document.createElement("div");
      grid.className = "news-grid";
      for (const post of page ? posts : posts.slice(0, 3)) {
        const href = new URL(newsBase);
        href.searchParams.set("story", post.slug);
        const card = document.createElement("a");
        card.className = "news-card";
        card.href = href.href;
        const image = document.createElement("img");
        image.src = coverURL(config.url, post.cover_path);
        image.alt = post.cover_alt;
        image.loading = "lazy";
        image.dataset.position = post.image_position;
        const content = document.createElement("div");
        content.className = "news-card-content";
        const date = document.createElement("time");
        date.dateTime = post.published_at;
        date.textContent = newsDate(post.published_at);
        const title = document.createElement("h3");
        title.textContent = post.title;
        const summary = document.createElement("p");
        summary.textContent = post.summary;
        content.append(date, title, summary);
        card.append(image, content);
        grid.append(card);
      }
      target.replaceChildren(grid);
      if (page) {
        const pagination = document.createElement("nav");
        pagination.className = "news-pagination";
        pagination.setAttribute("aria-label", "News pages");
        for (const [label, number, show] of [
          ["Newer stories", Math.max(0, offset - 12), offset > 0],
          ["Older stories", offset + 12, posts.length === 12 && offset < 10000],
        ]) {
          if (!show) continue;
          const link = document.createElement("a");
          const href = new URL(newsBase);
          href.searchParams.set("offset", number);
          link.href = href.href;
          link.textContent = label;
          link.className = "button secondary";
          pagination.append(link);
        }
        target.append(pagination);
      }
    } catch {
      retry("News could not be loaded. Please try again.");
    }
  }
  await load();
}
