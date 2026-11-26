// Construction des noms de fichiers à partir d'un modèle, ex. "{fournisseur}_{numero}".
// Variables : {numero}, {date} (AAAA-MM-JJ) et chaque alias déclaré dans "colonnes" de la tâche.

const INTERDITS = /[\\/:*?"<>|\u0000-\u001f]/g; // caractères refusés par Windows
const LONGUEUR_MAX = 150;

export function nettoyer(texte) {
  return String(texte ?? '')
    .replace(/\s+/g, ' ')
    .replace(INTERDITS, '-')
    .trim()
    .replace(/[. ]+$/, '');
}

export function construireNom(modele, valeurs, extension = '.pdf') {
  const date = new Date().toISOString().slice(0, 10);
  const remplace = modele.replace(/\{(\w+)\}/g, (_, cle) => {
    if (cle === 'date') return date;
    const v = nettoyer(valeurs[cle]);
    return v || 'INCONNU';
  });
  let nom = nettoyer(remplace);
  if (nom.length > LONGUEUR_MAX) nom = nom.slice(0, LONGUEUR_MAX).trim();
  return (nom || 'document') + extension;
}
