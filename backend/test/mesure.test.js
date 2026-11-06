import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lireMesure } from '../src/mesure.js'

test('accepte une mesure conforme au contrat', () => {
  assert.deepEqual(lireMesure(Buffer.from('{"temperature":23.4,"humidite":51.2}')), { temperature: 23.4, humidite: 51.2 })
})

test('ignore les champs en trop', () => {
  assert.deepEqual(lireMesure('{"temperature":-5,"humidite":0,"autre":1}'), { temperature: -5, humidite: 0 })
})

test('rejette les messages invalides', () => {
  for (const message of [
    'pas du json',
    'null',
    '42',
    '{"temperature":23.4}', // humidité manquante
    '{"temperature":null,"humidite":50}', // NaN du DHT22, sérialisé en null par ArduinoJson
    '{"temperature":"23","humidite":50}', // texte au lieu d'un nombre
    '{"temperature":999,"humidite":50}', // hors plage du DHT22
    '{"temperature":20,"humidite":-1}',
    '{"temperature":20,"humidite":100.1}',
  ]) {
    assert.equal(lireMesure(message), null, message)
  }
})
