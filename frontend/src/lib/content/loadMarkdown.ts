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

export type MarkdownFile = {
  name: string;
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

export async function loadMarkdownCollection(
  relativeDirectory: string
): Promise<MarkdownFile[]> {
  const absoluteDir = path.resolve(process.cwd(), "..", "content", relativeDirectory);
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort();

  const collection = await Promise.all(
    files.map(async (name) => {
      const absolutePath = path.join(absoluteDir, name);
      const rawMarkdown = await fs.readFile(absolutePath, "utf-8");
      const { data, content } = matter(rawMarkdown);
      const processed = await remark().use(remarkHtml).process(content);
      return {
        name,
        frontmatter: data as Record<string, unknown>,
        html: processed.toString(),
        rawMarkdown,
      };
    })
  );

  return collection;
}
