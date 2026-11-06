import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { ouvrirStockage } from '../src/stockage.js'
import { creerApi } from '../src/api.js'

const HEURE = 3600 * 1000
const debut = 472_222 * HEURE // un début d'heure fixe (novembre 2023)
const stockage = ouvrirStockage(':memory:')
let api
let base

before(async () => {
  stockage.ajouter({ temperature: 20, humidite: 40 }, debut)
  stockage.ajouter({ temperature: 21, humidite: 50 }, debut + 10_000)
  stockage.ajouter({ temperature: 22, humidite: 60 }, debut + 20_000)
  stockage.ajouter({ temperature: 30, humidite: 70 }, debut + HEURE)
  api = creerApi(stockage, { mqtt: 'connecte' }).listen(0, '127.0.0.1')
  await once(api, 'listening')
  base = `http://127.0.0.1:${api.address().port}`
})
after(() => api.close())

const lire = async (chemin) => {
  const reponse = await fetch(base + chemin)
  return { code: reponse.status, corps: await reponse.json() }
}

test('liste les mesures brutes, de la plus ancienne à la plus récente', async () => {
  const { corps } = await lire('/api/mesures?depuis=0')
  assert.deepEqual(corps.map((m) => m.temperature), [20, 21, 22, 30])
  assert.equal(corps[0].ts, debut)
})

test('par défaut, seulement les dernières 24 h', async () => {
  assert.deepEqual((await lire('/api/mesures')).corps, [])
})

test('limite garde les plus récentes', async () => {
  const { corps } = await lire('/api/mesures?depuis=0&limite=2')
  assert.deepEqual(corps.map((m) => m.temperature), [22, 30])
})

test('pas regroupe les mesures en moyennes par créneau', async () => {
  const { corps } = await lire('/api/mesures?depuis=0&pas=3600')
  assert.deepEqual(corps, [
    { ts: debut, temperature: 21, humidite: 50 },
    { ts: debut + HEURE, temperature: 30, humidite: 70 },
  ])
})

test('dernière mesure et santé', async () => {
  assert.equal((await lire('/api/mesures/derniere')).corps.temperature, 30)
  assert.deepEqual((await lire('/api/sante')).corps, { mqtt: 'connecte', mesures: 4 })
})

test('lecture seule et routes inconnues', async () => {
  assert.equal((await fetch(base + '/api/mesures', { method: 'POST', body: '{}' })).status, 405)
  assert.equal((await lire('/api/rien')).code, 404)
  assert.equal((await lire('/api/mesures?limite=abc&depuis=-5')).code, 200) // paramètres invalides : valeurs par défaut
})

test('la purge efface les mesures trop vieilles', () => {
  const autre = ouvrirStockage(':memory:')
  autre.ajouter({ temperature: 20, humidite: 40 }, 1000)
  autre.ajouter({ temperature: 21, humidite: 41 }, 5000)
  assert.equal(autre.purger(2000), 1)
  assert.equal(autre.compter(), 1)
  autre.fermer()
})
