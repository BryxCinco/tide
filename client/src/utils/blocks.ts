/**
 * Notion-style blocks for journal entries.
 *
 * Entry `content` is still a plain string on the server (it's word-counted and embedded for
 * the AI), so blocks are stored as markdown, one block per line. Anything that isn't a
 * recognised marker is a `text` block, so entries written before blocks existed open
 * unchanged, as paragraphs.
 *
 * Pure module with no imports: unit-tested with `node --test` (see blocks.test.ts).
 */

export type BlockType = 'text' | 'h1' | 'h2' | 'h3' | 'todo' | 'bullet' | 'numbered' | 'quote' | 'divider';

export interface Block {
  id: string;
  type: BlockType;
  text: string;
  checked?: boolean;
}

let idCounter = 0;
export function newBlockId(): string {
  idCounter += 1;
  return `b${Date.now().toString(36)}${idCounter.toString(36)}`;
}

function parseLine(line: string): Omit<Block, 'id'> {
  if (line === '---') return { type: 'divider', text: '' };
  if (line.startsWith('### ')) return { type: 'h3', text: line.slice(4) };
  if (line.startsWith('## ')) return { type: 'h2', text: line.slice(3) };
  if (line.startsWith('# ')) return { type: 'h1', text: line.slice(2) };
  if (line.startsWith('- [ ] ')) return { type: 'todo', text: line.slice(6), checked: false };
  if (line.startsWith('- [x] ') || line.startsWith('- [X] ')) return { type: 'todo', text: line.slice(6), checked: true };
  if (line.startsWith('- ')) return { type: 'bullet', text: line.slice(2) };
  if (line.startsWith('> ')) return { type: 'quote', text: line.slice(2) };
  const numbered = /^\d+\. /.exec(line);
  if (numbered) return { type: 'numbered', text: line.slice(numbered[0].length) };
  return { type: 'text', text: line };
}

/** Never returns an empty array: an empty string gives one empty text block. */
export function parseBlocks(md: string): Block[] {
  return md.split(/\r?\n/).map((line) => ({ id: newBlockId(), ...parseLine(line) }));
}

const PREFIX: Record<Exclude<BlockType, 'numbered' | 'todo' | 'divider'>, string> = {
  text: '',
  h1: '# ',
  h2: '## ',
  h3: '### ',
  bullet: '- ',
  quote: '> ',
};

/** Position of a numbered block within its run of consecutive numbered blocks (1-based). */
export function numberedIndex(blocks: Block[], index: number): number {
  let n = 1;
  for (let i = index - 1; i >= 0 && blocks[i].type === 'numbered'; i--) n++;
  return n;
}

export function serializeBlocks(blocks: Block[]): string {
  return blocks
    .map((block, i) => {
      if (block.type === 'divider') return '---';
      if (block.type === 'todo') return `- [${block.checked ? 'x' : ' '}] ${block.text}`;
      if (block.type === 'numbered') return `${numberedIndex(blocks, i)}. ${block.text}`;
      return PREFIX[block.type] + block.text;
    })
    .join('\n');
}

/** Markers stripped, dividers and blank lines dropped: for cards, search and word counts. */
export function toPlainPreview(md: string): string {
  return md
    .split(/\r?\n/)
    .map(parseLine)
    .filter((b) => b.type !== 'divider' && b.text.trim() !== '')
    .map((b) => b.text.trim())
    .join(' ');
}

export function todoProgress(md: string): { done: number; total: number } {
  const todos = md.split(/\r?\n/).map(parseLine).filter((b) => b.type === 'todo');
  return { done: todos.filter((b) => b.checked).length, total: todos.length };
}

/** True when there's anything worth saving: non-empty text, or a todo/divider block. */
export function hasMeaningfulContent(blocks: Block[]): boolean {
  return blocks.some((b) => b.text.trim() !== '' || b.type === 'todo' || b.type === 'divider');
}
