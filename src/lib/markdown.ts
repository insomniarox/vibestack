import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
});

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    "img",
    "h1",
    "h2",
    "h3",
    "pre",
    "code",
    "blockquote",
    "hr",
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ["src", "alt", "title", "width", "height"],
    a: ["href", "name", "target", "rel"],
  },
  allowedSchemes: ["http", "https"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", {
      rel: "noopener noreferrer",
      target: "_blank",
    }),
  },
};

export function renderMarkdownToHtml(markdownText: string) {
  const html = markdown.render(markdownText || "");
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

export function getMarkdownTeaser(markdownText: string, paragraphCount = 2, maxWords = 300) {
  const trimmed = (markdownText || "").trim();
  if (!trimmed) return "";

  const tokens = markdown.parse(trimmed, {});
  let paragraphsSeen = 0;
  let endIndex = -1;

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token.type === "paragraph_open") {
      paragraphsSeen += 1;
    }
    if (paragraphsSeen >= paragraphCount && token.type === "paragraph_close") {
      endIndex = i;
      break;
    }
  }

  const teaserTokens = endIndex >= 0 ? tokens.slice(0, endIndex + 1) : tokens;
  const html = markdown.renderer.render(teaserTokens, markdown.options, {});
  const sanitized = sanitizeHtml(html, SANITIZE_OPTIONS);

  if (!maxWords || maxWords <= 0) return sanitized;

  const plain = sanitizeHtml(sanitized, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
  const words = plain ? plain.split(" ") : [];

  if (words.length <= maxWords) return sanitized;

  const truncated = words.slice(0, maxWords).join(" ") + "...";
  const truncatedHtml = markdown.render(truncated);
  return sanitizeHtml(truncatedHtml, SANITIZE_OPTIONS);
}

export function markdownToPlainText(markdownText: string) {
  const html = renderMarkdownToHtml(markdownText || "");
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
}
