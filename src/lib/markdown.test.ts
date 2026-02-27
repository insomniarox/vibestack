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
});
