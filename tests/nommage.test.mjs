import { test } from 'node:test';
import assert from 'node:assert/strict';
import { construireNom, nettoyer } from '../src/core/nommage.mjs';

test('fournisseur_numero, le / du numéro devient -', () => {
  assert.equal(construireNom('{fournisseur}_{numero}', { fournisseur: 'ALPHA NEGOCE', numero: 'XX/BC-26-00001' }), 'ALPHA NEGOCE_XX-BC-26-00001.pdf');
});
test('caractères spéciaux du fournisseur conservés sauf interdits Windows', () => {
  assert.equal(construireNom('{fournisseur}_{numero}', { fournisseur: 'BETA & FILS', numero: 'BC-26-1' }), 'BETA & FILS_BC-26-1.pdf');
  assert.equal(construireNom('{fournisseur}_{numero}', { fournisseur: 'A:B*C?', numero: 'BC-26-1' }), 'A-B-C-_BC-26-1.pdf');
});
test('point final retiré (GAMMA CI S.A.)', () => {
  assert.equal(nettoyer('GAMMA CI S.A.'), 'GAMMA CI S.A');
});
test('valeur absente -> INCONNU', () => {
  assert.equal(construireNom('{fournisseur}_{numero}', { numero: 'BC-26-1' }), 'INCONNU_BC-26-1.pdf');
});
test('espaces multiples et retours à la ligne aplatis', () => {
  assert.equal(construireNom('{fournisseur}_{numero}', { fournisseur: ' ALPHA   NEGOCE\n', numero: 'BC-26-1' }), 'ALPHA NEGOCE_BC-26-1.pdf');
});
test('nom trop long tronqué à 150 caractères', () => {
  const nom = construireNom('{fournisseur}', { fournisseur: 'X'.repeat(400) });
  assert.equal(nom.length, 150 + '.pdf'.length);
});
test('variable {date} au format AAAA-MM-JJ', () => {
  assert.match(construireNom('{numero}_{date}', { numero: 'BC-1' }), /^BC-1_\d{4}-\d{2}-\d{2}\.pdf$/);
});
