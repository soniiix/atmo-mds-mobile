// Faux objet pour tester la chaîne sans Wokwi (broker, back-end, app de Quentin).
// Publie une mesure toutes les 10 s, obéit aux commandes et applique un mode auto simple.
// Usage : npm run simulateur           (comptes dans .env.outils)
//         npm run simulateur -- --chaud   (la température monte : pour voir l'alerte et le mode auto)
import mqtt from 'mqtt'

const { MQTT_URL, OBJET_USERNAME, OBJET_PASSWORD } = process.env
const aRemplir = ['MQTT_URL', 'OBJET_USERNAME', 'OBJET_PASSWORD']
  .filter((nom) => !process.env[nom] || process.env[nom].includes('xxxxxxxx'))
if (aRemplir.length) {
  console.error(`À remplir dans .env.outils : ${aRemplir.join(', ')}`)
  process.exit(1)
}

const SEUIL_TEMPERATURE = 26
const SEUIL_HUMIDITE = 65
const chaud = process.argv.includes('--chaud')
const etat = { fenetre: 'fermee', vmc: 'coupee', mode: 'manuel' }
let temperature = 22
let humidite = 50

// Commandes du contrat MQTT : topic -> contenu -> [champ de l'état, nouvelle valeur]
const ORDRES = {
  'piece/fenetre/commande': { ouvrir: ['fenetre', 'ouverte'], fermer: ['fenetre', 'fermee'] },
  'piece/vmc/commande': { allumer: ['vmc', 'allumee'], couper: ['vmc', 'coupee'] },
  'piece/mode': { auto: ['mode', 'auto'], manuel: ['mode', 'manuel'] },
}

const client = mqtt.connect(MQTT_URL, {
  username: OBJET_USERNAME,
  password: OBJET_PASSWORD,
  clientId: 'objet-simulateur',
  // Testament : si le simulateur disparaît, le broker annonce lui-même « hors_ligne ».
  will: { topic: 'piece/objet/statut', payload: 'hors_ligne', qos: 1, retain: true },
})

function changer(champ, valeur) {
  if (etat[champ] === valeur) return
  etat[champ] = valeur
  client.publish('piece/etat', JSON.stringify(etat), { qos: 1, retain: true })
  console.log('État :', JSON.stringify(etat))
}

client.on('connect', () => {
  console.log(`Simulateur connecté${chaud ? ' (mode --chaud)' : ''}`)
  client.publish('piece/objet/statut', 'en_ligne', { qos: 1, retain: true })
  client.publish('piece/etat', JSON.stringify(etat), { qos: 1, retain: true })
  client.subscribe(Object.keys(ORDRES), { qos: 1 })
})
client.on('error', (err) => console.error('MQTT :', err.message))

client.on('message', (topic, contenu) => {
  const ordre = String(contenu)
  const action = Object.hasOwn(ORDRES[topic] ?? {}, ordre) ? ORDRES[topic][ordre] : null
  if (!action) return console.log(`Ignoré : ${topic} « ${ordre} »`)
  if (etat.mode === 'auto' && action[0] !== 'mode') return console.log(`Mode auto : ${topic} ignoré`)
  changer(...action)
})

setInterval(() => {
  // Physique de bazar : la fenêtre ouverte rafraîchit, la VMC assèche, --chaud réchauffe.
  temperature += (chaud ? 0.4 : 0) - (etat.fenetre === 'ouverte' ? 0.5 : 0) + (Math.random() - 0.5) * 0.2
  humidite += (etat.vmc === 'allumee' ? -1 : 0.3) + (Math.random() - 0.5)
  temperature = Math.min(40, Math.max(10, temperature))
  humidite = Math.min(95, Math.max(20, humidite))

  if (etat.mode === 'auto') {
    // Avec un écart (hystérésis) pour que la fenêtre ne batte pas autour du seuil.
    if (temperature > SEUIL_TEMPERATURE) changer('fenetre', 'ouverte')
    if (temperature < SEUIL_TEMPERATURE - 1) changer('fenetre', 'fermee')
    if (humidite > SEUIL_HUMIDITE) changer('vmc', 'allumee')
    if (humidite < SEUIL_HUMIDITE - 5) changer('vmc', 'coupee')
  }

  const mesure = { temperature: Math.round(temperature * 10) / 10, humidite: Math.round(humidite * 10) / 10 }
  client.publish('piece/mesures', JSON.stringify(mesure))
  console.log('Mesure :', JSON.stringify(mesure))
}, 10_000)
