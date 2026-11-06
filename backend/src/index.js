// Point d'entrée : lit la configuration dans les variables d'environnement (fichier .env), jamais dans le code.
import { demarrer } from './serveur.js'

const manquantes = ['MQTT_URL', 'MQTT_USERNAME', 'MQTT_PASSWORD']
  .filter((nom) => !process.env[nom] || process.env[nom].includes('xxxxxxxx'))
if (manquantes.length) {
  console.error(`À remplir dans .env : ${manquantes.join(', ')} (modèle : .env.example).`)
  process.exit(1)
}
if (!process.env.MQTT_URL.startsWith('mqtts://')) {
  console.warn('Attention : MQTT_URL ne commence pas par mqtts:// : la connexion au broker ne sera pas chiffrée.')
}

const port = Number(process.env.PORT ?? 3000)
const service = demarrer({
  mqttUrl: process.env.MQTT_URL,
  utilisateur: process.env.MQTT_USERNAME,
  motDePasse: process.env.MQTT_PASSWORD,
  fichierCA: process.env.MQTT_CA_FILE || undefined,
  fichierBase: process.env.DB_FILE ?? 'historique.db',
  retentionJours: Number(process.env.RETENTION_JOURS ?? 30),
  port,
})
service.api.on('listening', () => console.log(`API d'historique sur http://localhost:${port}/api/mesures`))

process.on('SIGINT', async () => {
  await service.arreter()
  process.exit(0)
})
