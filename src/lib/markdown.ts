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
  allowedSchemes: ["http", "https", "data"],
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

export function getMarkdownTeaser(markdownText: string, paragraphCount = 2) {
  const trimmed = (markdownText || "").trim();
  if (!trimmed) return "";

  const blocks = trimmed.split(/\n\s*\n/);
  return blocks.slice(0, paragraphCount).join("\n\n");
}

export function markdownToPlainText(markdownText: string) {
  const html = renderMarkdownToHtml(markdownText || "");
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
}
