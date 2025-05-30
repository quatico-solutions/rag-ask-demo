import { readFile } from 'fs/promises';
import { stripFrontmatter } from '../view/frontmatter';

/**
 * Load the system prompt for a dataset from `data/{dataSet}/system-prompt.md`.
 * Automatically strips YAML frontmatter if present.
 * 
 * @param dataSet - The dataset name/identifier
 * @returns Promise resolving to the system prompt text
 * 
 * @example
 * ```typescript
 * const prompt = await loadSystemPrompt('example-fruits');
 * // Returns: "You are a helpful assistant specializing in fruit knowledge..."
 * ```
 */
export async function loadSystemPrompt(dataSet: string): Promise<string> {
  const rawSystem = await readFile(
    `${process.cwd()}/data/${dataSet}/system-prompt.md`,
    'utf-8'
  );
  return stripFrontmatter(rawSystem);
}

/**
 * Load the user message template for a dataset from `data/{dataSet}/user-template.md`.
 * Automatically strips YAML frontmatter if present.
 * Template should contain {{context}} and {{question}} placeholders.
 * 
 * @param dataSet - The dataset name/identifier 
 * @returns Promise resolving to the user template text
 * 
 * @example
 * ```typescript
 * const template = await loadUserTemplate('example-fruits');
 * // Returns: "Context:\n{{context}}\n\nQuestion: {{question}}"
 * ```
 */
export async function loadUserTemplate(dataSet: string): Promise<string> {
  const rawTemplate = await readFile(
    `${process.cwd()}/data/${dataSet}/user-template.md`,
    'utf-8'
  );
  return stripFrontmatter(rawTemplate);
}

/**
 * Fill a user template with context and question values.
 * Replaces {{context}} and {{question}} placeholders in the template.
 * 
 * @param template - The template string with placeholders
 * @param context - The context text to insert
 * @param question - The user's question to insert
 * @returns The filled template string
 * 
 * @example
 * ```typescript
 * const filled = fillUserTemplate(
 *   "Context: {{context}}\nQuestion: {{question}}", 
 *   "Apples are fruits.", 
 *   "What color are apples?"
 * );
 * // Returns: "Context: Apples are fruits.\nQuestion: What color are apples?"
 * ```
 */
export function fillUserTemplate(template: string, context: string, question: string): string {
  return template
    .replace('{{context}}', context)
    .replace('{{question}}', question);
}