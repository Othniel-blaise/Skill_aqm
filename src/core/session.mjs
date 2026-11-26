// Navigateur + connexion à l'ERP. Une seule session pour toute l'exécution.
import path from 'node:path';
import { chromium } from 'playwright';
import { RACINE, urlComplete } from './config.mjs';

export function lireIdentifiants() {
  const { AQM_USER, AQM_PASSWORD } = process.env;
  if (!AQM_USER || !AQM_PASSWORD) {
    throw new Error('AQM_USER et AQM_PASSWORD manquent dans erp-aqm/.env (voir .env.example)');
  }
  return { utilisateur: AQM_USER.trim(), motDePasse: AQM_PASSWORD };
}

export async function ouvrirSession(site, { visible = false } = {}) {
  const nav = site.navigateur || {};
  const contexte = await chromium.launchPersistentContext(path.join(RACINE, '.session'), {
    channel: nav.canal || 'chrome',
    headless: !visible,
    acceptDownloads: true,
    viewport: { width: nav.largeur || 1600, height: nav.hauteur || 1000 },
  });
  const identifiants = lireIdentifiants();
  const sel = site.connexion;

  const estPageConnexion = (page) => page.locator(sel.identifiant).isVisible().catch(() => false);

  // Écran DevExpress : l'identifiant est une liste qui se filtre quand on tape
  // (taper ses initiales ne laisse que « XX (NOM PRÉNOM) »), et le vrai champ mot de passe
  // est caché derrière un champ factice « Mot de passe ».
  async function seConnecter(page) {
    console.log("Connexion à l'ERP...");
    const { utilisateur, motDePasse } = identifiants;
    const cherche = utilisateur.toLowerCase();
    const combo = page.locator(sel.identifiant);
    await combo.click();
    await combo.fill('');
    await combo.pressSequentially(utilisateur, { delay: 80 });
    await page.waitForTimeout(1000);
    const choix = page.locator(sel.listeUtilisateurs).filter({ hasText: utilisateur });
    const libelles = await choix.allInnerTexts();
    const i = libelles.findIndex((t) => {
      const x = t.trim().toLowerCase();
      return x === cherche || x.startsWith(cherche + ' ');
    });
    if (i >= 0) await choix.nth(i).click();
    else if (libelles.length) await choix.first().click();
    else throw new Error(`Utilisateur « ${utilisateur} » absent de la liste de connexion`);
    await page.waitForTimeout(500);
    console.log('  utilisateur : ' + (await combo.inputValue()));

    await page.locator(sel.motDePasseFactice).click().catch(() => {});
    const mdp = page.locator(sel.motDePasse);
    await mdp.waitFor({ state: 'visible', timeout: 5000 });
    await mdp.fill(motDePasse);
    await page.locator(sel.boutonConnexion).click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2000);
    if (await estPageConnexion(page)) throw new Error('Connexion refusée : vérifie AQM_USER et AQM_PASSWORD dans .env');
    console.log('  connecté');
  }

  // Une seule connexion à la fois, même si plusieurs onglets la demandent ensemble.
  let connexionEnCours = null;
  async function ouvrir(page, chemin) {
    const url = urlComplete(site, chemin);
    await page.goto(url, { waitUntil: 'networkidle' });
    if (await estPageConnexion(page)) {
      connexionEnCours ??= seConnecter(page).finally(() => { connexionEnCours = null; });
      await connexionEnCours;
      await page.goto(url, { waitUntil: 'networkidle' });
    }
    return page;
  }

  const pagePrincipale = contexte.pages()[0] ?? (await contexte.newPage());
  return {
    contexte,
    page: pagePrincipale,
    ouvrir,
    nouvellePage: () => contexte.newPage(),
    fermer: () => contexte.close(),
  };
}
