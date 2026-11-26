import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lireArguments } from '../src/core/arguments.mjs';

test('tâche et options simples', () => {
  const o = lireArguments(['bons-commande', '--liste', '--visible']);
  assert.equal(o.tache, 'bons-commande');
  assert.equal(o.liste, true);
  assert.equal(o.visible, true);
});
test('--bc est un alias de --numero', () => {
  assert.deepEqual(lireArguments(['bons-commande', '--bc', 'TO/BC-26-01548']).numeros, ['TO/BC-26-01548']);
});
test('filtres répétables, le = dans la valeur est gardé', () => {
  const o = lireArguments(['x', '--filtre', 'Statut=1100', '--filtre', 'Commentaire=a=b']);
  assert.deepEqual(o.filtres, { Statut: '1100', Commentaire: 'a=b' });
});
test('erreurs claires', () => {
  assert.throws(() => lireArguments(['x', '--inconnue']), /Option inconnue/);
  assert.throws(() => lireArguments(['x', '--numero']), /attend une valeur/);
  assert.throws(() => lireArguments(['x', '--parallele', '0']), /entier positif/);
  assert.throws(() => lireArguments(['x', '--filtre', 'sansegal']), /Filtre invalide/);
  assert.throws(() => lireArguments(['a', 'b']), /Une seule tâche/);
});

test('liste de numéros : virgules, espaces, répétition, doublons retirés', () => {
  const o = lireArguments(['bons-commande', '--numero', 'TO/BC-26-01548, TO/BC-26-01566;SO/BC-26-00500', '--bc', 'to/bc-26-01548']);
  assert.deepEqual(o.numeros, ['TO/BC-26-01548', 'TO/BC-26-01566', 'SO/BC-26-00500']);
});
test('--fichier mémorise le chemin', () => {
  assert.equal(lireArguments(['x', '--fichier', 'liste.txt']).fichierNumeros, 'liste.txt');
});
import { decouperNumeros } from '../src/core/arguments.mjs';
test('fichier texte : un numéro par ligne, lignes vides ignorées', () => {
  assert.deepEqual(decouperNumeros('AB/DP-26-00608\r\n\r\nAB/DP-26-00610\n'), ['AB/DP-26-00608', 'AB/DP-26-00610']);
});
