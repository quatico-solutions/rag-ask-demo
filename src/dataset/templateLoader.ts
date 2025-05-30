import { readFile } from 'fs/promises';
import { stripFrontmatter } from '../view/frontmatter';

export async function loadSystemPrompt(dataSet: string): Promise<string> {
  const rawSystem = await readFile(
    `${process.cwd()}/data/${dataSet}/system-prompt.md`,
    'utf-8'
  );
  return stripFrontmatter(rawSystem);
}

export async function loadUserTemplate(dataSet: string): Promise<string> {
  const rawTemplate = await readFile(
    `${process.cwd()}/data/${dataSet}/user-template.md`,
    'utf-8'
  );
  return stripFrontmatter(rawTemplate);
}

export function fillUserTemplate(template: string, context: string, question: string): string {
  return template
    .replace('{{context}}', context)
    .replace('{{question}}', question);
}