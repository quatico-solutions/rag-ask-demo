export function stripFrontmatter(text: string): string {
  return text.replace(/^---\s*[\r\n]+[\s\S]*?[\r\n]+---\s*[\r\n]*/, '').trim();
}