import fs from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";
import { remark } from "remark";
import remarkHtml from "remark-html";

export type MarkdownContent = {
  frontmatter: Record<string, unknown>;
  html: string;
  rawMarkdown: string;
};

export async function loadMarkdown(relativePath: string): Promise<MarkdownContent> {
  const absolutePath = path.resolve(process.cwd(), "..", "content", relativePath);
  const rawMarkdown = await fs.readFile(absolutePath, "utf-8");
  const { data, content } = matter(rawMarkdown);
  const processed = await remark().use(remarkHtml).process(content);
  return {
    frontmatter: data as Record<string, unknown>,
    html: processed.toString(),
    rawMarkdown,
  };
}
