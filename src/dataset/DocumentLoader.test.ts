import { MarkdownDocumentLoader, DocumentLoader, Doc } from './DocumentLoader';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

const testDataDir = path.join(os.tmpdir(), 'test-data-' + Date.now());
const testDataSet = 'test-dataset';

beforeAll(async () => {
  await mkdir(path.join(testDataDir, testDataSet), { recursive: true });
});

afterAll(async () => {
  await rm(testDataDir, { recursive: true, force: true });
});

describe('MarkdownDocumentLoader', () => {
  let loader: MarkdownDocumentLoader;

  beforeEach(() => {
    loader = new MarkdownDocumentLoader();
  });

  test('loads documents from markdown file with frontmatter', async () => {
    const content = `---
description: "Test documents"
---

First document content here.

***

Second document with more text.

***

Third document.`;

    await mkdir(path.join(testDataDir, 'data', testDataSet), { recursive: true });
    await writeFile(path.join(testDataDir, 'data', testDataSet, 'docs.md'), content);

    const originalCwd = process.cwd;
    process.cwd = () => testDataDir;

    try {
      const docs = await loader.loadDocuments(testDataSet);
      
      expect(docs).toHaveLength(3);
      expect(docs[0]).toEqual({
        id: '1',
        text: 'First document content here.'
      });
      expect(docs[1]).toEqual({
        id: '2', 
        text: 'Second document with more text.'
      });
      expect(docs[2]).toEqual({
        id: '3',
        text: 'Third document.'
      });
    } finally {
      process.cwd = originalCwd;
    }
  });

  test('loads documents without frontmatter', async () => {
    const content = `First doc.

***

Second doc.`;

    await mkdir(path.join(testDataDir, 'data', testDataSet), { recursive: true });
    await writeFile(path.join(testDataDir, 'data', testDataSet, 'docs.md'), content);

    const originalCwd = process.cwd;
    process.cwd = () => testDataDir;

    try {
      const docs = await loader.loadDocuments(testDataSet);
      
      expect(docs).toHaveLength(2);
      expect(docs[0].text).toBe('First doc.');
      expect(docs[1].text).toBe('Second doc.');
    } finally {
      process.cwd = originalCwd;
    }
  });

  test('filters out empty blocks', async () => {
    const content = `Doc one.

***



***

Doc two.

***

`;

    await mkdir(path.join(testDataDir, 'data', testDataSet), { recursive: true });
    await writeFile(path.join(testDataDir, 'data', testDataSet, 'docs.md'), content);

    const originalCwd = process.cwd;
    process.cwd = () => testDataDir;

    try {
      const docs = await loader.loadDocuments(testDataSet);
      
      expect(docs).toHaveLength(2);
      expect(docs[0].text).toBe('Doc one.');
      expect(docs[1].text).toBe('Doc two.');
    } finally {
      process.cwd = originalCwd;
    }
  });
});

describe('Custom DocumentLoader', () => {
  test('can be extended for different data sources', async () => {
    class JsonDocumentLoader extends DocumentLoader {
      async loadDocuments(dataSet: string): Promise<Doc[]> {
        return [
          { id: 'json-1', text: 'Document from JSON source' },
          { id: 'json-2', text: 'Another JSON document' }
        ];
      }
    }

    const loader = new JsonDocumentLoader();
    const docs = await loader.loadDocuments('any-dataset');

    expect(docs).toHaveLength(2);
    expect(docs[0].id).toBe('json-1');
    expect(docs[1].text).toBe('Another JSON document');
  });
});