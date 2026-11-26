// Journal des exécutions : une ligne par document dans journal/AAAA-MM.csv (ouvrable dans Excel).
import fs from 'node:fs';
import path from 'node:path';

const ENTETE = 'date;tache;numero;fichier;statut;message\n';
const cellule = (v) => `"${String(v ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;

export function creerJournal(dossier, tache) {
  fs.mkdirSync(dossier, { recursive: true });
  const maintenant = new Date();
  const fichier = path.join(dossier, `${maintenant.toISOString().slice(0, 7)}.csv`);
  if (!fs.existsSync(fichier)) fs.writeFileSync(fichier, '﻿' + ENTETE, 'utf8');
  return {
    fichier,
    ecrire({ numero, fichier: nom, statut, message }) {
      const ligne = [new Date().toISOString(), tache, numero, nom, statut, message].map(cellule).join(';');
      fs.appendFileSync(fichier, ligne + '\n', 'utf8');
    },
  };
}
