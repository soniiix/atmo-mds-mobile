// Cherche dans le dépôt les secrets écrits en dur et les connexions non chiffrées (chapitre 6, sécurité).
// Usage, depuis la racine du dépôt : node outils/verif-secrets.mjs
// Dans un dépôt Git, seuls les fichiers qui seraient commités sont lus (les fichiers ignorés ne comptent pas).
// Pour accepter une ligne volontairement (ex. mot de passe factice d'un test), y ajouter : verif-secrets: ignorer
// N'affiche jamais la valeur trouvée, seulement le fichier et la ligne.
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, basename } from 'node:path'

const racine = process.argv[2] ?? process.cwd()
const DOSSIERS_IGNORES = new Set(['node_modules', '.git', '.expo', 'dist', 'build', 'Pods', '.gradle'])

const REGLES = [
  ['mot de passe ou clé écrit en dur', /(pass(word|wd)?|pwd|mot_?de_?passe|secret|token|api_?key)["']?\s*[:=]\s*["'`][^"'`\s]{4,}["'`]/i],
  ['mot de passe ou clé écrit en dur', /#define\s+\w*(PASS|PWD|SECRET|TOKEN|KEY)\w*\s+"[^"]{4,}"/i],
  ['identifiants dans une URL', /\b(mqtts?|wss?|https?):\/\/[^\s:/@"'`]+:[^\s@/"'`]+@/i],
  ['clé privée', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  // Ces règles ne visent que le code : la doc a le droit de citer ce qu'il ne faut pas faire.
  ['secret dans une variable EXPO_PUBLIC_ (copiée en clair dans l\'app)', /EXPO_PUBLIC_\w*(PASS|SECRET|TOKEN|KEY)/i, 'code'],
  ['connexion MQTT ou WebSocket non chiffrée', /\b(mqtt|ws):\/\/(?!localhost|127\.0\.0\.1)[\w-]+\.[\w.-]+/i, 'code'],
  ['vérification TLS désactivée', /setInsecure\s*\(|rejectUnauthorized\s*:\s*false/, 'code'],
]

function fichiers() {
  try {
    // Fichiers suivis + nouveaux fichiers non ignorés = ce qu'un « git add . » ajouterait.
    const sortie = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: racine, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    return sortie.split('\0').filter(Boolean).map((f) => join(racine, f))
  } catch {
    console.log('(pas de dépôt Git : lecture de tous les fichiers, sauf .env et secrets.h)')
    const liste = []
    const parcourir = (dossier) => {
      for (const nom of readdirSync(dossier)) {
        const chemin = join(dossier, nom)
        if (statSync(chemin).isDirectory()) { if (!DOSSIERS_IGNORES.has(nom)) parcourir(chemin) }
        else if (nom !== 'secrets.h' && (!/^\.env(\.|$)/.test(nom) || nom.endsWith('.example'))) liste.push(chemin)
      }
    }
    parcourir(racine)
    return liste
  }
}

let trouves = 0
const signaler = (fichier, ligne, raison) => {
  trouves++
  console.log(`${relative(racine, fichier)}${ligne ? `:${ligne}` : ''}  ${raison}`)
}

for (const fichier of fichiers()) {
  const nom = basename(fichier)
  if (/^\.env(\.|$)/.test(nom) && !nom.endsWith('.example')) signaler(fichier, 0, 'fichier .env qui serait commité (l\'ajouter au .gitignore)')
  if (nom === 'secrets.h') signaler(fichier, 0, 'secrets.h qui serait commité (l\'ajouter au .gitignore)')
  if (statSync(fichier).size > 1_000_000 || nom === 'package-lock.json') continue // lockfile généré : faux positifs (« minipass »)
  const contenu = readFileSync(fichier)
  if (contenu.subarray(0, 8000).includes(0)) continue // fichier binaire
  const doc = nom.endsWith('.md')
  contenu.toString('utf8').split('\n').forEach((texte, i) => {
    if (texte.includes('verif-secrets: ignorer')) return
    for (const [raison, motif, portee] of REGLES) {
      if (!(doc && portee === 'code') && motif.test(texte)) signaler(fichier, i + 1, raison)
    }
  })
}

console.log(trouves ? `\n${trouves} problème(s) trouvé(s).` : 'Aucun secret en dur ni connexion non chiffrée trouvés.')
process.exit(trouves ? 1 : 0)
