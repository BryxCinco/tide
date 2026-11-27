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

// ── Editing operations ────────────────────────────────────────────────────────
// All pure: each returns a new array, and the structural ones also say which block to
// focus (and where to put the caret) so the editor component stays a thin shell.

export interface EditResult {
  blocks: Block[];
  focusIndex: number;
  caret?: number;
}

export const LIST_TYPES: BlockType[] = ['todo', 'bullet', 'numbered'];

/** Typed at the very start of a text block, followed by a space, converts its type. */
const SHORTCUTS: [string, BlockType][] = [
  ['### ', 'h3'],
  ['## ', 'h2'],
  ['# ', 'h1'],
  ['[] ', 'todo'],
  ['- ', 'bullet'],
  ['* ', 'bullet'],
  ['1. ', 'numbered'],
  ['> ', 'quote'],
];

function withType(block: Block, type: BlockType): Block {
  const next: Block = { ...block, type };
  if (type === 'todo') next.checked = block.checked ?? false;
  else delete next.checked;
  if (type === 'divider') next.text = '';
  return next;
}

function emptyText(): Block {
  return { id: newBlockId(), type: 'text', text: '' };
}

/** Sets a block's text, applying markdown shortcuts on text blocks. Keeps the block id. */
export function updateBlockText(blocks: Block[], index: number, text: string): Block[] {
  const block = blocks[index];
  const next = blocks.slice();
  if (block.type === 'text') {
    if (text === '---') {
      next.splice(index, 1, withType(block, 'divider'), emptyText());
      return next;
    }
    for (const [prefix, type] of SHORTCUTS) {
      if (text.startsWith(prefix)) {
        next[index] = { ...withType(block, type), text: text.slice(prefix.length) };
        return next;
      }
    }
  }
  next[index] = { ...block, text };
  return next;
}

/** Enter: split at the caret. Lists continue; headings and quotes are followed by text. */
export function splitBlock(blocks: Block[], index: number, caret: number): EditResult {
  const block = blocks[index];
  const next = blocks.slice();
  if (LIST_TYPES.includes(block.type) && block.text === '') {
    next[index] = withType(block, 'text');
    return { blocks: next, focusIndex: index, caret: 0 };
  }
  const continues = LIST_TYPES.includes(block.type);
  const after: Block = {
    id: newBlockId(),
    type: continues ? block.type : 'text',
    text: block.text.slice(caret),
    ...(block.type === 'todo' ? { checked: false } : {}),
  };
  next.splice(index, 1, { ...block, text: block.text.slice(0, caret) }, after);
  return { blocks: next, focusIndex: index + 1, caret: 0 };
}

/** Backspace at the start of a block. Never removes the first block. */
export function mergeWithPrevious(blocks: Block[], index: number): EditResult {
  const block = blocks[index];
  const next = blocks.slice();
  if (block.type !== 'text') {
    next[index] = withType(block, 'text');
    return { blocks: next, focusIndex: index, caret: 0 };
  }
  if (index === 0) return { blocks: next, focusIndex: 0, caret: 0 };
  const previous = blocks[index - 1];
  if (previous.type === 'divider') {
    next.splice(index - 1, 1);
    return { blocks: next, focusIndex: index - 1, caret: 0 };
  }
  next.splice(index - 1, 2, { ...previous, text: previous.text + block.text });
  return { blocks: next, focusIndex: index - 1, caret: previous.text.length };
}

/** Slash-menu choice. A divider gets a text block after it so typing can carry on. */
export function setBlockType(blocks: Block[], index: number, type: BlockType): EditResult {
  const next = blocks.slice();
  if (type === 'divider') {
    next.splice(index, 1, withType(blocks[index], 'divider'), emptyText());
    return { blocks: next, focusIndex: index + 1, caret: 0 };
  }
  next[index] = withType(blocks[index], type);
  return { blocks: next, focusIndex: index, caret: next[index].text.length };
}

export function toggleTodo(blocks: Block[], index: number): Block[] {
  const next = blocks.slice();
  next[index] = { ...blocks[index], checked: !blocks[index].checked };
  return next;
}
