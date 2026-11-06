// Broker MQTT local (aedes) pour les tests, avec les mêmes comptes et droits que sur EMQX
// (tableau des droits de broker/guide-emqx.md). Aucun accès réseau extérieur.
import { createServer } from 'node:net'
import { once } from 'node:events'
import { Aedes } from 'aedes'

export const MOT_DE_PASSE = 'mot-de-passe-de-test' // factice, broker local -- verif-secrets: ignorer

export const DROITS = {
  objet: {
    publier: ['piece/mesures', 'piece/etat', 'piece/objet/statut'],
    abonner: ['piece/fenetre/commande', 'piece/vmc/commande', 'piece/mode'],
  },
  app: {
    publier: ['piece/fenetre/commande', 'piece/vmc/commande', 'piece/mode'],
    abonner: ['piece/mesures', 'piece/etat', 'piece/objet/statut'],
  },
  backend: { publier: [], abonner: ['piece/mesures'] },
}

export async function demarrerBroker() {
  const aedes = await Aedes.createBroker()
  aedes.authenticate = (client, utilisateur, motDePasse, rappel) => {
    const ok = Object.hasOwn(DROITS, utilisateur) && String(motDePasse) === MOT_DE_PASSE
    if (ok) client.compte = utilisateur
    rappel(null, ok)
  }
  aedes.authorizePublish = (client, paquet, rappel) =>
    rappel(!client || DROITS[client.compte].publier.includes(paquet.topic) ? null : new Error('publication refusée'))
  aedes.authorizeSubscribe = (client, abonnement, rappel) =>
    rappel(null, DROITS[client.compte].abonner.includes(abonnement.topic) ? abonnement : null)

  const serveur = createServer(aedes.handle).listen(0, '127.0.0.1')
  await once(serveur, 'listening')
  return {
    aedes,
    url: `mqtt://127.0.0.1:${serveur.address().port}`,
    arreter: () => new Promise((fin) => aedes.close(() => serveur.close(fin))),
  }
}
