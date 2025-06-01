import { stripFrontmatter } from './frontmatter';

describe('view/frontmatter', () => {
  it('removes YAML frontmatter from text', () => {
    const text = `---
foo: bar
---
Hello world`;
    expect(stripFrontmatter(text)).toBe('Hello world');
  });

  it('returns trimmed text when no frontmatter', () => {
    expect(stripFrontmatter('  Hello ')).toBe('Hello');
  });
});