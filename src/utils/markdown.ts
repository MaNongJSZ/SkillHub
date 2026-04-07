import DOMPurify from "dompurify";
import { marked } from "marked";

marked.setOptions({
  gfm: true,
  breaks: true,
});

function stripFrontmatter(content: string): string {
  const normalized = content.replace(/\r\n/g, "\n");

  if (!normalized.startsWith("---\n")) {
    return normalized;
  }

  const endIndex = normalized.indexOf("\n---\n", 4);
  if (endIndex === -1) {
    return normalized;
  }

  return normalized.slice(endIndex + 5).trimStart();
}

export async function renderMarkdown(content: string): Promise<string> {
  const body = stripFrontmatter(content);
  const parsed = marked.parse(body);
  const html = typeof parsed === "string" ? parsed : await parsed;

  return DOMPurify.sanitize(html);
}
