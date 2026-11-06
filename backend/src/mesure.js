// Lit un message du topic piece/mesures (format : docs/contrat-mqtt.md).
// Renvoie { temperature, humidite }, ou null si le message est invalide :
// JSON cassé, champ manquant, NaN du DHT22, ou valeur hors de la plage du capteur.
export function lireMesure(contenu) {
  let message
  try {
    message = JSON.parse(String(contenu))
  } catch {
    return null
  }
  const { temperature, humidite } = message ?? {}
  const valide =
    Number.isFinite(temperature) && temperature >= -40 && temperature <= 80 &&
    Number.isFinite(humidite) && humidite >= 0 && humidite <= 100
  return valide ? { temperature, humidite } : null
}
