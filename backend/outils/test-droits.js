// Vérifie sur le vrai broker que TLS, les mots de passe et les droits par topic sont bien appliqués.
// C'est la preuve à montrer pour le chapitre 6 (sécurité) : « l'app ne peut pas publier de fausses mesures ».
// Usage : npm run test-droits   (adresse et comptes dans .env.outils)
// Après une modification des droits dans la console, attendre quelques minutes (cache du broker).
//
// Méthode : pour chaque publication, un « observateur » autorisé est abonné au topic, et on regarde si le
// message lui arrive. On ne se fie pas à la réponse du broker à l'émetteur : selon le broker et la version
// de MQTT, un refus est signalé, ignoré en silence, ou provoque une déconnexion.
import mqtt from 'mqtt'

const env = process.env
const URL_MQTT = env.MQTT_URL
const comptes = {
  objet: [env.OBJET_USERNAME, env.OBJET_PASSWORD],
  app: [env.APP_USERNAME, env.APP_PASSWORD],
  backend: [env.BACKEND_USERNAME, env.BACKEND_PASSWORD],
}
const aRemplir = ['MQTT_URL', 'OBJET_USERNAME', 'OBJET_PASSWORD', 'APP_USERNAME', 'APP_PASSWORD', 'BACKEND_USERNAME', 'BACKEND_PASSWORD']
  .filter((nom) => !env[nom] || env[nom].includes('xxxxxxxx'))
if (aRemplir.length) {
  console.error(`À remplir dans .env.outils : ${aRemplir.join(', ')}`)
  process.exit(1)
}

const attendre = (ms) => new Promise((fin) => setTimeout(fin, ms))

function connecter(url, [username, password], role) {
  return new Promise((resolve, reject) => {
    const client = mqtt.connect(url, {
      username,
      password,
      clientId: `test-droits-${role}-${Math.random().toString(16).slice(2, 8)}`,
      reconnectPeriod: 0,
      connectTimeout: 8000,
    })
    client.once('connect', () => { client.on('error', () => {}); resolve(client) })
    client.once('error', (err) => { client.end(true); reject(err) })
    client.once('close', () => reject(new Error('connexion fermée')))
  })
}

// Chaque essai sur une connexion neuve : un refus qui déconnecte le client ne fausse pas l'essai suivant.
async function avec(role, action) {
  const client = await connecter(URL_MQTT, comptes[role], role).catch((err) => {
    console.error(`Connexion impossible avec le compte « ${role} » : ${err.message}`)
    process.exit(1)
  })
  try {
    return await action(client)
  } finally {
    client.end(true)
  }
}

const peutSeConnecter = (url, compte) =>
  connecter(url, compte, 'essai').then((c) => (c.end(true), true), () => false)

// true si le broker accepte l'abonnement (un code >= 128 dans le SUBACK signifie un refus)
const abonner = (client, filtre) => new Promise((resolve) => {
  const delai = setTimeout(() => resolve(false), 5000)
  client.subscribe(filtre, { qos: 1 }, (err, accordes) => {
    clearTimeout(delai)
    resolve(!err && accordes?.[0]?.qos < 128)
  })
})

// true si le message publié par `role` arrive chez `observateur`, abonné au même topic avec son propre compte
function arrive(role, topic, observateur) {
  const message = topic === 'piece/mesures'
    ? JSON.stringify({ temperature: 999, humidite: -1, marque: `faux-${Date.now()}` }) // hors plage : rejetée par le back-end quoi qu'il arrive
    : `test-droits-${Date.now()}` // contenu inconnu : l'objet l'ignore, rien ne bouge
  return avec(observateur, async (obs) => {
    let recu = false
    obs.on('message', (t, contenu) => { if (t === topic && String(contenu) === message) recu = true })
    if (!(await abonner(obs, topic))) {
      console.error(`L'observateur « ${observateur} » n'a pas le droit de s'abonner à ${topic} : test impossible.`)
      process.exit(1)
    }
    await avec(role, (client) => new Promise((fin) => {
      client.publish(topic, message, { qos: 1 }, fin)
      setTimeout(fin, 2000) // pas d'accusé de réception : refus silencieux ou déconnexion
    }))
    await attendre(1500)
    return recu
  })
}

let echecs = 0
function verifier(description, obtenu, attendu) {
  const mot = (b) => (b ? 'accepté' : 'refusé')
  if (obtenu !== attendu) echecs++
  console.log(`${obtenu === attendu ? ' OK  ' : 'ÉCHEC'}  ${description} : ${mot(obtenu)} (attendu : ${mot(attendu)})`)
}

console.log(`Broker : ${URL_MQTT}\n`)

const enClair = URL_MQTT.replace(/^mqtts:/, 'mqtt:').replace(/:8883\b/, ':1883')
// Si MQTT_URL elle-même n'est pas en mqtts://, la connexion en clair marche forcément : échec direct.
const clairPossible = URL_MQTT.startsWith('mqtts:') ? await peutSeConnecter(enClair, comptes.app) : true
verifier('Connexion non chiffrée (mqtt:// port 1883)', clairPossible, false)
verifier('Connexion avec un mauvais mot de passe', await peutSeConnecter(URL_MQTT, [comptes.app[0], 'mauvais-mot-de-passe']), false)

verifier('app publie une fausse mesure sur piece/mesures', await arrive('app', 'piece/mesures', 'backend'), false)
verifier('app publie un faux état sur piece/etat', await arrive('app', 'piece/etat', 'app'), false)
verifier('app publie sur piece/fenetre/commande', await arrive('app', 'piece/fenetre/commande', 'objet'), true)
verifier('backend publie sur piece/vmc/commande', await arrive('backend', 'piece/vmc/commande', 'objet'), false)
verifier('objet publie sur piece/fenetre/commande', await arrive('objet', 'piece/fenetre/commande', 'objet'), false)
verifier('objet publie sur piece/mesures', await arrive('objet', 'piece/mesures', 'backend'), true)

verifier('app s\'abonne à piece/etat', await avec('app', (c) => abonner(c, 'piece/etat')), true)
verifier('app s\'abonne à tout (piece/#)', await avec('app', (c) => abonner(c, 'piece/#')), false)
verifier('backend s\'abonne à piece/fenetre/commande', await avec('backend', (c) => abonner(c, 'piece/fenetre/commande')), false)

console.log(echecs ? `\n${echecs} vérification(s) en échec.` : '\nToutes les règles sont appliquées.')
process.exit(echecs ? 1 : 0)
