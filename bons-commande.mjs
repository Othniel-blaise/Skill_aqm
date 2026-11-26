// Ancienne commande conservée : équivaut à « node aqm.mjs bons-commande ... »
process.argv.splice(2, 0, 'bons-commande');
await import('./aqm.mjs');
