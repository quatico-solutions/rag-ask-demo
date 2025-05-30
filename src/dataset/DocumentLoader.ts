import { readFile } from 'fs/promises';
import { stripFrontmatter } from '../view/frontmatter';

export interface Doc {
  id: string;
  text: string;
  embedding?: number[];
}

export abstract class DocumentLoader {
  abstract loadDocuments(dataSet: string): Promise<Doc[]>;
}

export class MarkdownDocumentLoader extends DocumentLoader {
  async loadDocuments(dataSet: string): Promise<Doc[]> {
    const data = await readFile(
      `${process.cwd()}/data/${dataSet}/docs.md`,
      'utf-8'
    );
    const content = stripFrontmatter(data);
    // Split on markdown separator and trim
    const blocks = content.split(/^\*{3}$/m).map(b => b.trim()).filter(Boolean);
    return blocks.map((text, idx) => ({ id: (idx + 1).toString(), text }));
  }
}