import { loadSystemPrompt, loadUserTemplate, fillUserTemplate } from './templateLoader';
import { writeFile, mkdir, rm } from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const testDataDir = path.join(os.tmpdir(), 'test-data-' + Date.now());
const testDataSet = 'test-dataset';

beforeAll(async () => {
  await mkdir(path.join(testDataDir, testDataSet), { recursive: true });
});

afterAll(async () => {
  await rm(testDataDir, { recursive: true, force: true });
});

describe('loadSystemPrompt', () => {
  test('loads system prompt with frontmatter stripped', async () => {
    const content = `---
description: "Test system prompt"
---

You are a helpful assistant specializing in test topics.`;

    await mkdir(path.join(testDataDir, 'data', testDataSet), { recursive: true });
    await writeFile(path.join(testDataDir, 'data', testDataSet, 'system-prompt.md'), content);

    const originalCwd = process.cwd;
    process.cwd = () => testDataDir;

    try {
      const prompt = await loadSystemPrompt(testDataSet);
      expect(prompt).toBe('You are a helpful assistant specializing in test topics.');
    } finally {
      process.cwd = originalCwd;
    }
  });

  test('loads system prompt without frontmatter', async () => {
    const content = 'You are a test assistant.';

    await mkdir(path.join(testDataDir, 'data', testDataSet), { recursive: true });
    await writeFile(path.join(testDataDir, 'data', testDataSet, 'system-prompt.md'), content);

    const originalCwd = process.cwd;
    process.cwd = () => testDataDir;

    try {
      const prompt = await loadSystemPrompt(testDataSet);
      expect(prompt).toBe('You are a test assistant.');
    } finally {
      process.cwd = originalCwd;
    }
  });
});

describe('loadUserTemplate', () => {
  test('loads user template with frontmatter stripped', async () => {
    const content = `---
description: "Test user template"
---

Context: {{context}}

Question: {{question}}`;

    await mkdir(path.join(testDataDir, 'data', testDataSet), { recursive: true });
    await writeFile(path.join(testDataDir, 'data', testDataSet, 'user-template.md'), content);

    const originalCwd = process.cwd;
    process.cwd = () => testDataDir;

    try {
      const template = await loadUserTemplate(testDataSet);
      expect(template).toBe('Context: {{context}}\n\nQuestion: {{question}}');
    } finally {
      process.cwd = originalCwd;
    }
  });
});

describe('fillUserTemplate', () => {
  test('replaces context and question placeholders', () => {
    const template = 'Context: {{context}}\n\nQuestion: {{question}}';
    const context = 'This is test context.';
    const question = 'What is this about?';

    const result = fillUserTemplate(template, context, question);
    
    expect(result).toBe('Context: This is test context.\n\nQuestion: What is this about?');
  });

  test('handles templates without placeholders', () => {
    const template = 'Simple template without placeholders';
    const result = fillUserTemplate(template, 'context', 'question');
    
    expect(result).toBe('Simple template without placeholders');
  });

  test('handles empty context and question', () => {
    const template = 'Context: {{context}}\nQuestion: {{question}}';
    const result = fillUserTemplate(template, '', '');
    
    expect(result).toBe('Context: \nQuestion: ');
  });
});