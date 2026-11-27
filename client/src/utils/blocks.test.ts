import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { hasMeaningfulContent, parseBlocks, serializeBlocks, todoProgress, toPlainPreview } from './blocks.ts';

const RICH = '# Hi\n- [x] done\n- [ ] not\n- item\n1. one\n> q\n---\nplain';

describe('parseBlocks', () => {
  test('maps every markdown marker to its block type', () => {
    const blocks = parseBlocks(RICH);
    assert.deepEqual(
      blocks.map((b) => b.type),
      ['h1', 'todo', 'todo', 'bullet', 'numbered', 'quote', 'divider', 'text'],
    );
    assert.equal(blocks[1].checked, true);
    assert.equal(blocks[2].checked, false);
    assert.deepEqual(
      blocks.map((b) => b.text),
      ['Hi', 'done', 'not', 'item', 'one', 'q', '', 'plain'],
    );
  });

  test('h2 and h3 are recognised', () => {
    assert.deepEqual(parseBlocks('## a\n### b').map((b) => b.type), ['h2', 'h3']);
  });

  test('empty input gives one empty text block', () => {
    const blocks = parseBlocks('');
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].type, 'text');
    assert.equal(blocks[0].text, '');
  });

  test('every block gets a unique id', () => {
    const ids = parseBlocks(RICH).map((b) => b.id);
    assert.equal(new Set(ids).size, ids.length);
  });
});

describe('serializeBlocks', () => {
  test('round-trips rich markdown', () => {
    assert.equal(serializeBlocks(parseBlocks(RICH)), RICH);
  });

  test('round-trips legacy plain text with blank lines', () => {
    const legacy = 'line one\n\nline three';
    assert.equal(serializeBlocks(parseBlocks(legacy)), legacy);
  });

  test('numbers a list by position; a stray "5. " after prose stays prose', () => {
    assert.equal(serializeBlocks(parseBlocks('1. a\n1. b\ntext\n5. c')), '1. a\n2. b\ntext\n5. c');
  });
});

describe('toPlainPreview', () => {
  test('strips markers and drops dividers', () => {
    assert.equal(toPlainPreview('# Title\n- [ ] buy milk\n---\nok'), 'Title buy milk ok');
  });

  test('leaves legacy prose untouched', () => {
    assert.equal(toPlainPreview('Today was good.'), 'Today was good.');
  });
});

describe('todoProgress', () => {
  test('counts checked and total todos', () => {
    assert.deepEqual(todoProgress('- [x] a\n- [ ] b\n- [x] c'), { done: 2, total: 3 });
  });
});

describe('hasMeaningfulContent', () => {
  test('a divider alone counts as content', () => {
    assert.equal(hasMeaningfulContent(parseBlocks('---')), true);
  });

  test('blank lines do not count', () => {
    assert.equal(hasMeaningfulContent(parseBlocks('\n\n')), false);
  });
});

// ── Editing operations ────────────────────────────────────────────────────────
import { mergeWithPrevious, setBlockType, splitBlock, toggleTodo, updateBlockText, type Block } from './blocks.ts';

const mk = (type: Block['type'], text: string, extra: Partial<Block> = {}): Block => ({ id: `${type}-${text}`, type, text, ...extra });

describe('updateBlockText', () => {
  test('updateBlockText keeps id', () => {
    const blocks = [mk('text', 'hel')];
    const next = updateBlockText(blocks, 0, 'hello');
    assert.equal(next[0].id, blocks[0].id);
    assert.equal(next[0].text, 'hello');
  });

  for (const [typed, type] of [
    ['# ', 'h1'],
    ['## ', 'h2'],
    ['### ', 'h3'],
    ['[] ', 'todo'],
    ['- ', 'bullet'],
    ['* ', 'bullet'],
    ['1. ', 'numbered'],
    ['> ', 'quote'],
  ] as const) {
    test(`shortcut "${typed}" converts a text block to ${type}`, () => {
      const next = updateBlockText([mk('text', '')], 0, typed);
      assert.equal(next[0].type, type);
      assert.equal(next[0].text, '');
    });
  }

  test('"---" becomes a divider followed by a new empty text block', () => {
    const next = updateBlockText([mk('text', '')], 0, '---');
    assert.deepEqual(next.map((b) => b.type), ['divider', 'text']);
    assert.equal(next[1].text, '');
  });

  test('shortcuts only fire on text blocks', () => {
    const next = updateBlockText([mk('h1', '')], 0, '- ');
    assert.equal(next[0].type, 'h1');
    assert.equal(next[0].text, '- ');
  });
});

describe('splitBlock', () => {
  test('splits a bullet at the caret, continuing the list', () => {
    const r = splitBlock([mk('bullet', 'abcd')], 0, 2);
    assert.deepEqual(r.blocks.map((b) => [b.type, b.text]), [['bullet', 'ab'], ['bullet', 'cd']]);
    assert.equal(r.focusIndex, 1);
    assert.equal(r.caret, 0);
    assert.notEqual(r.blocks[0].id, r.blocks[1].id);
  });

  test('splitting a heading starts a text block', () => {
    const r = splitBlock([mk('h1', 'Title')], 0, 5);
    assert.equal(r.blocks[1].type, 'text');
  });

  test('splitting a todo starts an unchecked todo', () => {
    const r = splitBlock([mk('todo', 'milk', { checked: true })], 0, 4);
    assert.equal(r.blocks[1].type, 'todo');
    assert.equal(r.blocks[1].checked, false);
  });

  test('Enter on an empty list item turns it back into text', () => {
    const r = splitBlock([mk('bullet', 'a'), mk('bullet', '')], 1, 0);
    assert.equal(r.blocks.length, 2);
    assert.equal(r.blocks[1].type, 'text');
    assert.equal(r.focusIndex, 1);
  });
});

describe('mergeWithPrevious', () => {
  test('a non-text block reverts to text in place', () => {
    const r = mergeWithPrevious([mk('text', 'a'), mk('quote', 'b')], 1);
    assert.deepEqual(r.blocks.map((b) => [b.type, b.text]), [['text', 'a'], ['text', 'b']]);
    assert.equal(r.focusIndex, 1);
  });

  test('a text block joins the previous block', () => {
    const r = mergeWithPrevious([mk('h2', 'ab'), mk('text', 'cd')], 1);
    assert.deepEqual(r.blocks.map((b) => [b.type, b.text]), [['h2', 'abcd']]);
    assert.equal(r.focusIndex, 0);
    assert.equal(r.caret, 2);
  });

  test('a previous divider is removed instead', () => {
    const r = mergeWithPrevious([mk('text', 'a'), mk('divider', ''), mk('text', 'b')], 2);
    assert.deepEqual(r.blocks.map((b) => [b.type, b.text]), [['text', 'a'], ['text', 'b']]);
    assert.equal(r.focusIndex, 1);
    assert.equal(r.caret, 0);
  });

  test('mergeWithPrevious at index 0 reverts type only', () => {
    const asHeading = mergeWithPrevious([mk('h1', 'x')], 0);
    assert.deepEqual(asHeading.blocks.map((b) => [b.type, b.text]), [['text', 'x']]);
    const asText = mergeWithPrevious([mk('text', 'x')], 0);
    assert.equal(asText.blocks.length, 1);
    assert.equal(asText.focusIndex, 0);
  });
});

describe('setBlockType / toggleTodo', () => {
  test('setBlockType changes the type and keeps the text', () => {
    const r = setBlockType([mk('text', 'hi')], 0, 'todo');
    assert.equal(r.blocks[0].type, 'todo');
    assert.equal(r.blocks[0].checked, false);
    assert.equal(r.blocks[0].text, 'hi');
  });

  test('setBlockType to divider inserts a text block after it to keep typing', () => {
    const r = setBlockType([mk('text', '')], 0, 'divider');
    assert.deepEqual(r.blocks.map((b) => b.type), ['divider', 'text']);
    assert.equal(r.focusIndex, 1);
  });

  test('toggleTodo flips checked', () => {
    assert.equal(toggleTodo([mk('todo', 'a', { checked: false })], 0)[0].checked, true);
  });
});

// ── Review fixes ──────────────────────────────────────────────────────────────
describe('legacy numbered-looking prose', () => {
  test('a "2024. " line is prose, not a list item, and survives a round-trip', () => {
    const md = '2024. What a year';
    assert.equal(parseBlocks(md)[0].type, 'text');
    assert.equal(serializeBlocks(parseBlocks(md)), md);
  });

  test('a list that does not start at 1 keeps its numbers', () => {
    const md = 'Reasons:\n2. second\n3. third';
    assert.equal(serializeBlocks(parseBlocks(md)), md);
  });

  test('a list starting at 1 is still a numbered list', () => {
    assert.deepEqual(parseBlocks('1. a\n2. b').map((b) => b.type), ['numbered', 'numbered']);
  });
});

describe('trailing divider', () => {
  test('an entry ending in a divider gets a text block to type into', () => {
    assert.deepEqual(parseBlocks('---').map((b) => b.type), ['divider', 'text']);
  });

  test('that helper block is not saved back', () => {
    assert.equal(serializeBlocks(parseBlocks('---')), '---');
    assert.equal(serializeBlocks(parseBlocks('a\n---')), 'a\n---');
  });
});
