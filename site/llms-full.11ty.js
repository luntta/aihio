import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** /llms-full.txt: the prompt fragment, then every component page, in one file. */
export default class LlmsFull {
  data() {
    return { permalink: '/llms-full.txt', eleventyExcludeFromCollections: true };
  }

  render({ docs }) {
    const prompt = readFileSync(resolve(import.meta.dirname, '..', 'dist/aihio.prompt.md'), 'utf8');
    return [prompt.trim(), ...docs.components.map((component) => component.markdown.trim())].join('\n\n---\n\n') + '\n';
  }
}
