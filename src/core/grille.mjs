// Pilotage d'une grille DevExpress (ASPxGridView) par son interface JavaScript :
// filtres par colonne, changement de page, clé interne et contenu de chaque ligne.
// Valable pour tous les écrans de liste de l'ERP qui utilisent cette grille.

export async function trouverGrille(page, idPrefere) {
  const id = await page.evaluate((idPrefere) => {
    const coll = window.ASPxClientControl?.GetControlCollection();
    if (!coll) return null;
    if (idPrefere && coll.Get(idPrefere)) return idPrefere;
    // sinon : première grille principale visible de l'écran
    const t = [...document.querySelectorAll('table[id$="_DXMainTable"]')].find(
      (e) => e.offsetParent !== null && /GridViewMaster/.test(e.id)
    );
    return t ? t.id.replace(/_DXMainTable$/, '') : null;
  }, idPrefere);
  if (!id) throw new Error("Grille introuvable sur cet écran (page d'accueil ou écran différent ?)");
  return id;
}

export async function attendre(page, G) {
  await page.waitForTimeout(300);
  await page.waitForFunction(
    (G) => {
      const g = window.ASPxClientControl?.GetControlCollection().Get(G);
      return g && !g.InCallback();
    },
    G,
    { timeout: 60000 }
  );
  await page.waitForTimeout(300);
}

// Colonnes visibles : titre affiché (minuscules) -> { champ technique, rang de cellule }
export async function colonnes(page, G) {
  return page.evaluate((G) => {
    const n = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const g = ASPxClientControl.GetControlCollection().Get(G);
    const res = {};
    for (let i = 0; i < g.GetColumnCount(); i++) {
      const c = g.GetColumn(i);
      const h = document.getElementById(G + '_col' + c.index);
      if (h && c.fieldName) res[n(h.innerText)] = { champ: c.fieldName, rang: h.cellIndex };
    }
    return res;
  }, G);
}

const cleTitre = (t) => t.replace(/\s+/g, ' ').trim().toLowerCase();

function exiger(cols, titre) {
  const c = cols[cleTitre(titre)];
  if (!c) throw new Error(`Colonne « ${titre} » introuvable dans la grille (masquée dans ta vue ou titre différent ?)`);
  return c;
}

export async function filtrer(page, G, filtres) {
  await attendre(page, G);
  const cols = await colonnes(page, G);
  for (const [titre, valeur] of Object.entries(filtres)) {
    const { champ } = exiger(cols, titre);
    console.log(`  filtre « ${titre} » = ${valeur}`);
    await page.evaluate(([G, f, v]) => ASPxClientControl.GetControlCollection().Get(G).AutoFilterByColumn(f, v), [G, champ, valeur]);
    await attendre(page, G);
  }
  return page.locator(`#${G} .dxp-summary`).first().innerText({ timeout: 2000 }).catch(() => '');
}

// Filtre une colonne sur une liste de valeurs en un seul appel : [Champ] In ('A', 'B', ...).
// Remplace tous les filtres de la grille, y compris ceux de la vue enregistrée.
export async function filtrerParListe(page, G, titre, valeurs) {
  await attendre(page, G);
  const { champ } = exiger(await colonnes(page, G), titre);
  const liste = valeurs.map((v) => `'${String(v).replace(/'/g, "''")}'`).join(', ');
  console.log(`  « ${titre} » parmi ${valeurs.length} numéro(s)`);
  await page.evaluate(([G, expr]) => ASPxClientControl.GetControlCollection().Get(G).ApplyFilter(expr), [G, `[${champ}] In (${liste})`]);
  await attendre(page, G);
  return page.locator(`#${G} .dxp-summary`).first().innerText({ timeout: 2000 }).catch(() => '');
}

// Lit toutes les pages. Retourne [{ cle, numero, valeurs: { alias: texte } }]
export async function lireLignes(page, G, { colonneNumero, motifNumero, colonnes: alias = {} }) {
  const cols = await colonnes(page, G);
  const rangNumero = exiger(cols, colonneNumero).rang;
  const rangs = Object.fromEntries(Object.entries(alias).map(([a, titre]) => [a, exiger(cols, titre).rang]));
  const nbPages = await page.evaluate((G) => ASPxClientControl.GetControlCollection().Get(G).GetPageCount(), G);

  const lignes = [];
  const vues = new Set();
  for (let pg = 0; pg < Math.max(nbPages, 1); pg++) {
    if (pg > 0) {
      await page.evaluate(([G, pg]) => ASPxClientControl.GetControlCollection().Get(G).GotoPage(pg), [G, pg]);
      await attendre(page, G);
    }
    const lot = await page.evaluate(
      ([G, rangNumero, rangs]) => {
        const g = ASPxClientControl.GetControlCollection().Get(G);
        const debut = g.GetTopVisibleIndex ? g.GetTopVisibleIndex() : 0;
        const out = [];
        for (let i = debut; i < debut + g.GetVisibleRowsOnPage(); i++) {
          const tr = document.getElementById(G + '_DXDataRow' + i);
          if (!tr) continue;
          const texte = (r) => (tr.cells[r] ? tr.cells[r].innerText.trim() : '');
          const valeurs = {};
          for (const [a, r] of Object.entries(rangs)) valeurs[a] = texte(r);
          out.push({ cle: String(g.GetRowKey(i)), numero: texte(rangNumero), valeurs });
        }
        return out;
      },
      [G, rangNumero, rangs]
    );
    for (const l of lot) {
      if (vues.has(l.cle) || !l.numero) continue;
      if (motifNumero && !new RegExp(motifNumero).test(l.numero)) continue;
      vues.add(l.cle);
      lignes.push(l);
    }
  }
  return lignes;
}
