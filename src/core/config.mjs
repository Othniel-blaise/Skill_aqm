// Chargement et validation de la configuration du site et des tâches.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Les valeurs propres à l'entreprise (adresse du site, libellés de rapports) restent dans .env :
// dans un JSON, « ${NOM} » est remplacé par la variable d'environnement NOM.
const remplacerVariables = (valeur, fichier) => {
  if (typeof valeur === 'string') {
    return valeur.replace(/\$\{([A-Z0-9_]+)\}/g, (_, nom) => {
      const v = process.env[nom];
      if (!v) throw new Error(`Variable ${nom} manquante dans erp-aqm/.env (utilisée par ${path.relative(RACINE, fichier)}, voir .env.example)`);
      return v;
    });
  }
  if (Array.isArray(valeur)) return valeur.map((v) => remplacerVariables(v, fichier));
  if (valeur && typeof valeur === 'object') {
    return Object.fromEntries(Object.entries(valeur).map(([k, v]) => [k, remplacerVariables(v, fichier)]));
  }
  return valeur;
};

const lireJsonBrut = (fichier) => {
  try {
    return JSON.parse(fs.readFileSync(fichier, 'utf8'));
  } catch (e) {
    throw new Error(`Fichier de configuration illisible : ${path.relative(RACINE, fichier)} (${e.message})`);
  }
};

const lireJson = (fichier) => remplacerVariables(lireJsonBrut(fichier), fichier);

export function chargerSite() {
  return lireJson(path.join(RACINE, 'config', 'aqm.json'));
}

export function listerTaches() {
  const dossier = path.join(RACINE, 'taches');
  return fs
    .readdirSync(dossier)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const id = f.replace(/\.json$/, '');
      const t = lireJsonBrut(path.join(dossier, f));
      return { id, nom: t.nom || id, modele: t.modele };
    });
}

// Champs obligatoires par modèle : une tâche mal remplie est refusée avant d'ouvrir le navigateur.
const OBLIGATOIRES = {
  'liste-vers-pdf': ['ecran', 'fiche', 'colonneNumero', 'rapport', 'nomFichier'],
};

export function chargerTache(id) {
  const fichier = path.join(RACINE, 'taches', `${id}.json`);
  if (!fs.existsSync(fichier)) {
    const dispo = listerTaches().map((t) => t.id).join(', ') || 'aucune';
    throw new Error(`Tâche « ${id} » inconnue. Tâches disponibles : ${dispo}`);
  }
  const tache = { id, filtres: {}, colonnes: {}, maxDocuments: 100, parallele: 1, ...lireJson(fichier) };
  const manquants = (OBLIGATOIRES[tache.modele] || []).filter((k) => !tache[k]);
  if (!OBLIGATOIRES[tache.modele]) throw new Error(`Tâche « ${id} » : modèle « ${tache.modele} » inconnu`);
  if (manquants.length) throw new Error(`Tâche « ${id} » : champs manquants ${manquants.join(', ')}`);
  return tache;
}

export const urlComplete = (site, chemin) => new URL(chemin, site.site).href;
