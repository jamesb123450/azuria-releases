// Shared public presentation. Article text is always built with text nodes;
// HTML entered in the editor is never interpreted.
export function coverURL(base, path) {
  if (!/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.(png|jpg|webp)$/.test(path || ""))
    return "";
  try {
    const url = new URL(base);
    if (
      url.protocol !== "https:" ||
      !url.hostname.endsWith(".supabase.co") ||
      url.username ||
      url.password ||
      url.port
    )
      return "";
    return `${url.origin}/storage/v1/object/public/news-images/${path}`;
  } catch {
    return "";
  }
}
export function newsDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? ""
    : date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
}
export function newsBody(text, document = globalThis.document) {
  const fragment = document.createDocumentFragment();
  for (const block of String(text || "").split(/\n\s*\n/)) {
    if (!block.trim()) continue;
    const heading = /^(#{1,3})\s+(.+)$/.exec(block);
    const lines = block.split("\n");
    if (lines.every((line) => /^[-*] /.test(line))) {
      const list = document.createElement("ul");
      for (const line of lines) {
        const li = document.createElement("li");
        li.textContent = line.slice(2);
        list.append(li);
      }
      fragment.append(list);
    } else {
      const node = document.createElement(
        heading ? `h${heading[1].length + 1}` : "p",
      );
      node.textContent = heading ? heading[2] : block;
      fragment.append(node);
    }
  }
  return fragment;
}
export function newsArticle(
  post,
  base,
  { preview = false, document = globalThis.document } = {},
) {
  const article = document.createElement("article");
  article.className = "news-article";
  article.dataset.accent = ["pink", "blue", "violet"].includes(post.accent)
    ? post.accent
    : "pink";
  article.dataset.width =
    post.reading_width === "wide" ? "wide" : "comfortable";
  const image = document.createElement("img");
  image.className = "news-cover";
  image.src = coverURL(base, post.cover_path);
  image.alt = post.cover_alt || "";
  image.dataset.position = ["top", "center", "bottom"].includes(
    post.image_position,
  )
    ? post.image_position
    : "center";
  image.hidden = !image.getAttribute("src");
  const content = document.createElement("div");
  content.className = "news-reading";
  const title = document.createElement("h1");
  title.textContent = post.title || "Untitled story";
  const byline = document.createElement("p");
  byline.className = "news-byline";
  const date = document.createElement("time");
  if (post.published_at) {
    date.dateTime = post.published_at;
    date.textContent = newsDate(post.published_at);
  } else
    date.textContent = preview ? "Publication date appears when published" : "";
  const role = document.createElement("span");
  role.className = "news-admin";
  role.textContent = " (admin)";
  byline.append(date, ` · ${post.author_username || "Your username"}`, role);
  const body = document.createElement("div");
  body.className = "news-body";
  body.append(newsBody(post.body, document));
  content.append(title, byline, body);
  article.append(image, content);
  return article;
}
