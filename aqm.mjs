// Point d'entrée unique de l'automatisation de l'ERP AQM.
//   node aqm.mjs --taches                  liste des tâches
//   node aqm.mjs <tache> [options]         exécute une tâche (voir --aide)
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { lireArguments, decouperNumeros, AIDE } from './src/core/arguments.mjs';
import { chargerSite, chargerTache, listerTaches, RACINE } from './src/core/config.mjs';
import { ouvrirSession } from './src/core/session.mjs';
import { creerJournal } from './src/core/journal.mjs';

// Modèles disponibles : ajouter ici chaque nouveau modèle de src/modeles/
const MODELES = {
  'liste-vers-pdf': () => import('./src/modeles/liste-vers-pdf.mjs'),
};

export async function lancer(argv) {
  let opt;
  try {
    opt = lireArguments(argv);
  } catch (e) {
    console.error('ERREUR : ' + e.message + '\n\n' + AIDE);
    return 1;
  }
  if (opt.aide) { console.log(AIDE); return 0; }
  if (opt.taches || !opt.tache) {
    console.log('Tâches disponibles :');
    for (const t of listerTaches()) console.log(`  ${t.id.padEnd(22)} ${t.nom}`);
    if (!opt.taches) console.log('\n' + AIDE);
    return 0;
  }

  let session;
  try {
    if (opt.fichierNumeros) {
      const chemin = path.resolve(opt.fichierNumeros);
      if (!fs.existsSync(chemin)) throw new Error(`Fichier de numéros introuvable : ${chemin}`);
      opt.numeros = decouperNumeros([...opt.numeros, fs.readFileSync(chemin, 'utf8')].join('\n'));
      if (!opt.numeros.length) throw new Error(`Aucun numéro dans ${chemin}`);
      console.log(`${opt.numeros.length} numéro(s) lu(s) dans ${path.basename(chemin)}`);
    }
    const site = chargerSite();
    const tache = chargerTache(opt.tache);
    const modele = await MODELES[tache.modele]();
    console.log(`== ${tache.nom} ==`);
    const journal = creerJournal(path.join(RACINE, site.dossierJournal), tache.id);
    session = await ouvrirSession(site, { visible: opt.visible });
    const { erreurs } = await modele.executer({ site, tache, opt, session, journal });
    return erreurs ? 2 : 0;
  } catch (e) {
    console.error('ERREUR : ' + e.message.split('\n')[0]);
    if (session) {
      await session.page.screenshot({ path: path.join(RACINE, 'erreur.png') }).catch(() => {});
      console.error("Capture d'écran : erp-aqm/erreur.png");
    }
    return 1;
  } finally {
    await session?.fermer().catch(() => {});
  }
}

process.exit(await lancer(process.argv.slice(2)));
