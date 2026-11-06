// Chaîne complète en local : objet -> broker -> back-end -> API, et test des droits sur le même broker.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import mqtt from 'mqtt'
import { demarrerBroker, MOT_DE_PASSE } from './broker-local.js'
import { demarrer } from '../src/serveur.js'

const attendre = (ms) => new Promise((fin) => setTimeout(fin, ms))

test('une mesure publiée par l\'objet arrive dans l\'historique', async (t) => {
  const broker = await demarrerBroker()
  const objet = await mqtt.connectAsync(broker.url, { username: 'objet', password: MOT_DE_PASSE })

  // Vieille mesure retenue avant le démarrage du back-end : elle ne doit pas être datée d'aujourd'hui.
  await objet.publishAsync('piece/mesures', '{"temperature":10,"humidite":10}', { qos: 1, retain: true })

  const abonne = once(broker.aedes, 'subscribe')
  const service = demarrer({
    mqttUrl: broker.url, utilisateur: 'backend', motDePasse: MOT_DE_PASSE,
    fichierBase: ':memory:', retentionJours: 30, port: 0, hote: '127.0.0.1', journal: false,
  })
  t.after(async () => { await objet.endAsync(); await service.arreter(); await broker.arreter() })
  await abonne
  await attendre(200) // laisse passer le message retenu

  await objet.publishAsync('piece/mesures', '{"temperature":23.4,"humidite":51.2}', { qos: 1 })
  await objet.publishAsync('piece/mesures', 'pas du json', { qos: 1 })
  await objet.publishAsync('piece/mesures', '{"temperature":null,"humidite":50}', { qos: 1 })
  await attendre(300)

  const reponse = await fetch(`http://127.0.0.1:${service.api.address().port}/api/mesures`)
  const mesures = await reponse.json()
  assert.equal(mesures.length, 1)
  assert.equal(mesures[0].temperature, 23.4)
  assert.equal(mesures[0].humidite, 51.2)
  assert.ok(Date.now() - mesures[0].ts < 5000)
})

test('le script de test des droits détecte les règles appliquées', async () => {
  const broker = await demarrerBroker()
  const env = {
    ...process.env,
    MQTT_URL: broker.url,
    OBJET_USERNAME: 'objet', OBJET_PASSWORD: MOT_DE_PASSE,
    APP_USERNAME: 'app', APP_PASSWORD: MOT_DE_PASSE,
    BACKEND_USERNAME: 'backend', BACKEND_PASSWORD: MOT_DE_PASSE,
  }
  const sortie = await promisify(execFile)(process.execPath, ['outils/test-droits.js'], { env })
    .catch((err) => err) // code de sortie 1 attendu : le broker de test n'est pas en TLS
  await broker.arreter()

  const lignes = sortie.stdout.split('\n').filter((l) => /^( OK  |ÉCHEC)/.test(l))
  assert.equal(lignes.length, 11, sortie.stdout + sortie.stderr)
  // Seul échec attendu : la connexion en clair, puisque ce broker local n'a pas de TLS.
  assert.deepEqual(lignes.filter((l) => l.startsWith('ÉCHEC')), [
    'ÉCHEC  Connexion non chiffrée (mqtt:// port 1883) : accepté (attendu : refusé)',
  ])
})
