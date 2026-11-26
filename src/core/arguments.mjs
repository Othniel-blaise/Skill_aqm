// Lecture de la ligne de commande : node aqm.mjs <tache> [options]
export function lireArguments(argv) {
  const opt = {
    tache: null,
    liste: false,
    visible: false,
    capture: false,
    aide: false,
    taches: false,
    numeros: [],
    fichierNumeros: null,
    filtres: null,
    parallele: null,
    max: null,
  };
  const valeur = (i, nom) => {
    if (i >= argv.length || argv[i].startsWith('--')) throw new Error(`L'option ${nom} attend une valeur`);
    return argv[i];
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--liste': opt.liste = true; break;
      case '--visible': opt.visible = true; break;
      case '--capture': opt.capture = true; break;
      case '--aide': case '-h': case '--help': opt.aide = true; break;
      case '--taches': opt.taches = true; break;
      case '--numero': case '--bc': opt.numeros.push(...decouperNumeros(valeur(++i, a))); break;
      case '--fichier': opt.fichierNumeros = valeur(++i, a); break;
      case '--parallele': opt.parallele = entier(valeur(++i, a), a); break;
      case '--max': opt.max = entier(valeur(++i, a), a); break;
      case '--filtre': {
        const brut = valeur(++i, a);
        const pos = brut.indexOf('=');
        if (pos < 1) throw new Error(`Filtre invalide « ${brut} » : format attendu "Titre de colonne=valeur"`);
        opt.filtres ??= {};
        opt.filtres[brut.slice(0, pos).trim()] = brut.slice(pos + 1).trim();
        break;
      }
      default:
        if (a.startsWith('--')) throw new Error(`Option inconnue : ${a}`);
        if (opt.tache) throw new Error(`Une seule tâche à la fois (reçu « ${opt.tache} » et « ${a} »)`);
        opt.tache = a;
    }
  }
  opt.numeros = decouperNumeros(opt.numeros.join(' ')); // doublons entre plusieurs --numero
  return opt;
}

// Découpe une liste de numéros séparés par virgules, points-virgules, espaces ou retours à la ligne.
// Les doublons sont retirés, l'ordre est gardé.
export function decouperNumeros(texte) {
  const vus = new Set();
  return String(texte ?? '')
    .split(/[\s,;]+/)
    .map((n) => n.trim())
    .filter((n) => n && !vus.has(n.toUpperCase()) && vus.add(n.toUpperCase()));
}

function entier(v, nom) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new Error(`${nom} attend un nombre entier positif`);
  return n;
}

export const AIDE = `Usage : node aqm.mjs <tache> [options]

  --taches                 liste les tâches disponibles
  --liste                  affiche la liste filtrée sans rien télécharger
  --numero <N°,N°,...>     un ou plusieurs documents (répétable, alias : --bc)
  --fichier <liste.txt>    numéros lus dans un fichier texte (un par ligne)
  --filtre "Colonne=val"   remplace les filtres de la tâche (répétable)
  --parallele <n>          nombre de documents traités en même temps
  --max <n>                nombre maximal de documents
  --visible                montre le navigateur
  --capture                photo de la liste filtrée (liste.png)

Exemples :
  node aqm.mjs bons-commande --liste
  node aqm.mjs bons-commande --numero TO/BC-26-01548
  node aqm.mjs bons-commande --numero TO/BC-26-01548,TO/BC-26-01566
  node aqm.mjs demandes-prix --fichier liste.txt
  node aqm.mjs bons-commande --filtre "Statut=1100" --filtre "Jour(s) dans ce statut=2"`;
