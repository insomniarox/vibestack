import { describe, expect, it } from "vitest";
import { getMarkdownTeaser, markdownToPlainText, renderMarkdownToHtml } from "./markdown";

describe("markdown utilities", () => {
  it("renders markdown and strips scripts", () => {
    const html = renderMarkdownToHtml("Hello<script>alert(1)</script>");
    expect(html).toContain("Hello");
    expect(html).not.toContain("<script>");
  });

  it("returns teaser paragraphs", () => {
    const teaser = getMarkdownTeaser("One\n\nTwo\n\nThree", 2);
    expect(teaser).toBe("<p>One</p>\n<p>Two</p>\n");
  });

  it("converts markdown to plain text", () => {
    const text = markdownToPlainText("**Hi** ![alt](https://example.com/x.png)");
    expect(text).toBe("Hi");
  });

  it("strips markdown syntax and long urls from plain text", () => {
    const longUrl = "https://cdn.example.com/" + "x".repeat(500);
    const markdown = `# Heading\n\n![img](${longUrl})\n\n[Read more](${longUrl})`;
    const text = markdownToPlainText(markdown);
    expect(text).toBe("Heading Read more");
    expect(text.length).toBeLessThan(40);
  });

  it("converts code fences into readable plain text", () => {
    const text = markdownToPlainText("```ts\nconst x = 1\n```\n\nFinal line");
    expect(text).toContain("const x = 1");
    expect(text).toContain("Final line");
  });
});
