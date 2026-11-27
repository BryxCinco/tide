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

  test('numbers consecutive numbered blocks by position', () => {
    assert.equal(serializeBlocks(parseBlocks('1. a\n1. b\ntext\n5. c')), '1. a\n2. b\ntext\n1. c');
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
