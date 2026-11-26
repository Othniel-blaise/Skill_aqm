import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enParallele } from '../src/core/rapport.mjs';

test('traite tout et ne dépasse jamais n en même temps', async () => {
  let enCours = 0, pic = 0;
  const faits = [];
  await enParallele([1, 2, 3, 4, 5, 6, 7], 3, async (x) => {
    enCours++; pic = Math.max(pic, enCours);
    await new Promise((r) => setTimeout(r, 10));
    faits.push(x); enCours--;
  });
  assert.equal(faits.length, 7);
  assert.ok(pic <= 3);
});
