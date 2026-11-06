// API HTTP en lecture seule, pour l'écran d'historique de l'app.
// Aucune route d'écriture : les mesures n'arrivent que par MQTT, depuis le compte « objet ».
import { createServer } from 'node:http'

const JOUR = 24 * 3600 * 1000

// Entier positif lu dans l'URL, ou la valeur par défaut.
function entier(texte, defaut) {
  const n = Number(texte)
  return texte !== null && Number.isInteger(n) && n >= 0 ? n : defaut
}

export function creerApi(stockage, etat) {
  return createServer((req, res) => {
    const envoyer = (code, donnees) => {
      res.writeHead(code, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*', // données non sensibles, lisibles aussi depuis Expo web
      })
      res.end(JSON.stringify(donnees))
    }
    if (req.method !== 'GET') return envoyer(405, { erreur: 'API en lecture seule' })

    const url = new URL(req.url, 'http://localhost')
    const parametre = (nom) => url.searchParams.get(nom)

    switch (url.pathname) {
      case '/api/sante':
        return envoyer(200, { mqtt: etat.mqtt, mesures: stockage.compter() })

      case '/api/mesures/derniere': {
        const mesure = stockage.derniere()
        return mesure ? envoyer(200, mesure) : envoyer(404, { erreur: 'aucune mesure enregistrée' })
      }

      // ?depuis=<ms> (défaut : 24 h) &pas=<secondes> (défaut : mesures brutes) &limite=<n> (défaut 1000, max 5000)
      case '/api/mesures':
        return envoyer(200, stockage.lister({
          depuis: entier(parametre('depuis'), Date.now() - JOUR),
          pas: Math.max(1, entier(parametre('pas'), 0) * 1000),
          limite: Math.min(entier(parametre('limite'), 1000), 5000),
        }))

      default:
        return envoyer(404, { erreur: 'route inconnue' })
    }
  })
}
