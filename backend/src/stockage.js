// Historique des mesures dans un fichier SQLite (module node:sqlite intégré à Node, aucune dépendance).
import { DatabaseSync } from 'node:sqlite'

export function ouvrirStockage(fichier) {
  const db = new DatabaseSync(fichier)
  db.exec(`
    CREATE TABLE IF NOT EXISTS mesures (
      ts INTEGER NOT NULL,      -- date de réception, en millisecondes depuis le 01/01/1970 UTC
      temperature REAL NOT NULL,
      humidite REAL NOT NULL
    );
    CREATE INDEX IF NOT EXISTS mesures_ts ON mesures (ts);
  `)

  const inserer = db.prepare('INSERT INTO mesures (ts, temperature, humidite) VALUES (?, ?, ?)')
  const derniere = db.prepare('SELECT ts, temperature, humidite FROM mesures ORDER BY ts DESC LIMIT 1')
  const compter = db.prepare('SELECT COUNT(*) AS n FROM mesures')
  const purger = db.prepare('DELETE FROM mesures WHERE ts < ?')
  // Les `limite` créneaux les plus récents depuis `depuis`, rendus du plus ancien au plus récent.
  // Chaque créneau dure `pas` ms et vaut la moyenne de ses mesures (pas = 1 : mesures brutes).
  const lister = db.prepare(`
    SELECT debut AS ts, temperature, humidite FROM (
      SELECT ts - ts % $pas AS debut,
             ROUND(AVG(temperature), 1) AS temperature,
             ROUND(AVG(humidite), 1) AS humidite
      FROM mesures WHERE ts >= $depuis
      GROUP BY debut ORDER BY debut DESC LIMIT $limite
    ) ORDER BY ts
  `)

  return {
    ajouter: ({ temperature, humidite }, ts) => inserer.run(ts, temperature, humidite),
    derniere: () => derniere.get() ?? null,
    compter: () => compter.get().n,
    lister: ({ depuis, pas, limite }) => lister.all({ depuis, pas, limite }),
    purger: (avant) => purger.run(avant).changes,
    fermer: () => db.close(),
  }
}
