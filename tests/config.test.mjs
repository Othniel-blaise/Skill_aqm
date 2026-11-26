import { test } from 'node:test';

// Valeurs factices : les vraies sont dans .env, jamais dans le dépôt.
process.env.AQM_SITE = 'https://erp.exemple.com';
process.env.AQM_RAPPORT_BONS_COMMANDE = 'Rapport exemple';
import assert from 'node:assert/strict';
import { chargerTache, listerTaches, chargerSite, urlComplete } from '../src/core/config.mjs';

test('toutes les tâches du dossier taches/ sont valides', () => {
  const taches = listerTaches();
  assert.ok(taches.length >= 1);
  for (const t of taches) assert.doesNotThrow(() => chargerTache(t.id), `tâche ${t.id}`);
});
test('tâche inconnue -> liste des tâches disponibles', () => {
  assert.throws(() => chargerTache('nexistepas'), /Tâches disponibles : .*bons-commande/);
});
test('les chemins relatifs sont complétés avec le site', () => {
  assert.equal(urlComplete(chargerSite(), '/Default.aspx'), 'https://erp.exemple.com/Default.aspx');
});

test('variable absente du .env -> message clair', () => {
  const avant = process.env.AQM_SITE;
  delete process.env.AQM_SITE;
  try {
    assert.throws(() => chargerSite(), /Variable AQM_SITE manquante/);
  } finally {
    process.env.AQM_SITE = avant;
  }
});
