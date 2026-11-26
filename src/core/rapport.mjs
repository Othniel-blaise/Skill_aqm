// Ouvre une fiche (bon, facture...) et télécharge le rapport PDF du menu « Rapports ».
export async function telechargerRapport(session, { chemin, rapport, cible, delai = 90000 }) {
  const page = await session.nouvellePage();
  try {
    await session.ouvrir(page, chemin);
    const lien = page.getByText(rapport, { exact: true }).first();
    try {
      await lien.waitFor({ timeout: 30000 });
    } catch {
      throw new Error(`Rapport « ${rapport} » absent de la fiche`);
    }
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: delai }), lien.click()]);
    await dl.saveAs(cible);
  } finally {
    await page.close().catch(() => {});
  }
}

// Exécute les traitements avec au plus `n` en même temps.
export async function enParallele(elements, n, traiter) {
  let suivant = 0;
  const ouvriers = Array.from({ length: Math.min(n, elements.length) }, async () => {
    while (suivant < elements.length) {
      const i = suivant++;
      await traiter(elements[i], i);
    }
  });
  await Promise.all(ouvriers);
}
