// Modèle « liste-vers-pdf » : écran de liste -> filtres -> pour chaque ligne, rapport PDF de la fiche.
// Toute tâche de ce type se décrit par un simple fichier taches/<nom>.json.
import fs from 'node:fs';
import path from 'node:path';
import * as grille from '../core/grille.mjs';
import { construireNom } from '../core/nommage.mjs';
import { telechargerRapport, enParallele } from '../core/rapport.mjs';
import { RACINE } from '../core/config.mjs';

export async function executer({ site, tache, opt, session, journal }) {
  const { page } = session;
  const numeros = opt.numeros || [];
  const filtres = opt.filtres ?? tache.filtres;
  const max = opt.max ?? tache.maxDocuments;
  const parallele = opt.parallele ?? tache.parallele;
  const dossier = path.join(RACINE, site.dossierSortie, tache.id);
  fs.mkdirSync(dossier, { recursive: true });

  await session.ouvrir(page, tache.ecran);
  const G = await grille.trouverGrille(page, tache.grille || site.grilleParDefaut);
  console.log('Filtres :');
  // Numéros donnés : on cherche exactement ceux-là, sans les filtres habituels.
  const resume = numeros.length
    ? await grille.filtrerParListe(page, G, tache.colonneNumero, numeros)
    : await grille.filtrer(page, G, filtres);
  if (resume) console.log('  ' + resume.trim());
  if (opt.capture) {
    await page.screenshot({ path: path.join(RACINE, 'liste.png'), fullPage: true });
    console.log('Capture de la liste filtrée : erp-aqm/liste.png');
  }

  let lignes = await grille.lireLignes(page, G, tache);
  if (numeros.length) {
    const voulus = new Set(numeros.map((n) => n.toUpperCase()));
    lignes = lignes.filter((l) => voulus.has(l.numero.toUpperCase()));
    const trouves = new Set(lignes.map((l) => l.numero.toUpperCase()));
    const absents = numeros.filter((n) => !trouves.has(n.toUpperCase()));
    if (absents.length) {
      console.log(`\nIntrouvable(s) dans l'ERP (${absents.length}) : ${absents.join(', ')}`);
      for (const n of absents) journal.ecrire({ numero: n, statut: 'introuvable' });
    }
  }
  if (lignes.length > max) {
    console.log(`\nAttention : ${lignes.length} documents, limités à ${max} (--max ou maxDocuments).`);
    lignes = lignes.slice(0, max);
  }
  const nom = (l) => construireNom(tache.nomFichier, { numero: l.numero, ...l.valeurs });

  console.log(`\n${lignes.length} document(s) trouvé(s) :`);
  lignes.forEach((l) => console.log('  - ' + nom(l).replace(/\.pdf$/, '')));
  if (opt.liste || !lignes.length) return { erreurs: 0 };

  console.log(`\nTéléchargement (rapport « ${tache.rapport} », ${parallele} à la fois) :`);
  const bilan = { ok: 0, deja: 0, erreur: 0 };
  await enParallele(lignes, parallele, async (l) => {
    const fichier = nom(l);
    const cible = path.join(dossier, fichier);
    if (fs.existsSync(cible)) {
      bilan.deja++;
      console.log(`  ${l.numero} : déjà présent, ignoré`);
      journal.ecrire({ numero: l.numero, fichier, statut: 'deja' });
      return;
    }
    try {
      await telechargerRapport(session, {
        chemin: tache.fiche.replace('{cle}', encodeURIComponent(l.cle)),
        rapport: tache.rapport,
        cible,
        delai: site.navigateur?.delaiTelechargement,
      });
      bilan.ok++;
      console.log(`  ${l.numero} -> ${fichier}`);
      journal.ecrire({ numero: l.numero, fichier, statut: 'ok' });
    } catch (e) {
      bilan.erreur++;
      const msg = e.message.split('\n')[0];
      console.log(`  ${l.numero} : ERREUR ${msg}`);
      journal.ecrire({ numero: l.numero, fichier, statut: 'erreur', message: msg });
    }
  });

  console.log(`\nBilan : ${bilan.ok} téléchargé(s), ${bilan.deja} déjà présent(s), ${bilan.erreur} erreur(s)`);
  console.log(`Dossier : ${dossier}`);
  return { erreurs: bilan.erreur };
}
