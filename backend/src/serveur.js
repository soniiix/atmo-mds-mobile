// Relie les trois morceaux : abonnement MQTT -> stockage SQLite -> API HTTP.
import { readFileSync } from 'node:fs'
import mqtt from 'mqtt'
import { lireMesure } from './mesure.js'
import { ouvrirStockage } from './stockage.js'
import { creerApi } from './api.js'

const JOUR = 24 * 3600 * 1000
const TOPIC = 'piece/mesures'

export function demarrer(config) {
  const stockage = ouvrirStockage(config.fichierBase)
  const etat = { mqtt: 'deconnecte' }

  const client = mqtt.connect(config.mqttUrl, {
    username: config.utilisateur,
    password: config.motDePasse,
    clientId: config.clientId ?? 'backend-historique',
    reconnectPeriod: 5000,
    // Certificat de l'autorité (fichier emqxsl-ca.crt), seulement si Node ne la connaît pas déjà.
    // La vérification du certificat du broker reste toujours active (rejectUnauthorized par défaut).
    ca: config.fichierCA ? readFileSync(config.fichierCA) : undefined,
  })

  client.on('connect', () => {
    etat.mqtt = 'connecte'
    console.log(`MQTT connecté, abonnement à ${TOPIC}`)
    client.subscribe(TOPIC, { qos: 0 }, (err, accordes) => {
      if (err || accordes?.[0]?.qos >= 128) console.error(`Abonnement à ${TOPIC} refusé : vérifier les droits du compte`)
    })
  })
  client.on('close', () => { etat.mqtt = 'deconnecte' })
  client.on('error', (err) => console.error('MQTT :', err.message))

  client.on('message', (topic, contenu, paquet) => {
    // Un message retenu est une vieille valeur rejouée par le broker à la connexion : on ne la date pas à maintenant.
    if (topic !== TOPIC || paquet.retain) return
    const mesure = lireMesure(contenu)
    if (!mesure) return console.warn('Mesure rejetée :', String(contenu).slice(0, 120))
    stockage.ajouter(mesure, Date.now())
    if (config.journal !== false) console.log(`Mesure enregistrée : ${mesure.temperature} °C, ${mesure.humidite} %`)
  })

  // Rétention simple : on efface ce qui a plus de N jours, au démarrage puis toutes les heures.
  const purger = () => stockage.purger(Date.now() - config.retentionJours * JOUR)
  purger()
  const minuteur = setInterval(purger, 3600 * 1000)
  minuteur.unref()

  const api = creerApi(stockage, etat).listen(config.port, config.hote)

  const arreter = async () => {
    clearInterval(minuteur)
    await client.endAsync()
    await new Promise((fin) => api.close(fin))
    stockage.fermer()
  }
  return { api, client, etat, arreter }
}
