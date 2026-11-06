# Back-end d'historique

S'abonne à `piece/mesures` sur le broker avec le compte `backend` (abonnement seul, aucun droit de publier),
enregistre chaque mesure valide dans un fichier SQLite, et sert l'historique en HTTP, en lecture seule.
Node.js 22.13 ou plus, une seule dépendance (`mqtt`) ; SQLite est intégré à Node.

## Lancer

```bash
npm install
```

Copier `.env.example` en `.env` et le remplir (adresse du broker, mot de passe du compte `backend`), puis :

```bash
npm start
```

Le téléphone doit être sur le même Wi-Fi que le PC : l'app appelle `http://<adresse IP du PC>:3000`.

## API (pour l'écran d'historique de l'app)

| Route | Réponse |
|---|---|
| `GET /api/mesures` | Mesures des dernières 24 h, de la plus ancienne à la plus récente : `[{"ts": 1762425600000, "temperature": 23.4, "humidite": 51.2}, …]` |
| `GET /api/mesures?depuis=<ms>` | Depuis cette date (millisecondes depuis 1970, comme `Date.now()`) |
| `GET /api/mesures?pas=600` | Moyennes par créneau de 600 s (10 min) : pratique pour un graphe sur 24 h (144 points au lieu de 8 640) |
| `GET /api/mesures?limite=100` | Les 100 points les plus récents (défaut 1000, maximum 5000) |
| `GET /api/mesures/derniere` | La dernière mesure, ou 404 s'il n'y en a pas |
| `GET /api/sante` | `{"mqtt": "connecte", "mesures": 1234}` |

`ts` est la date de **réception** par le back-end. Exemple côté app :

```js
const reponse = await fetch(`${API}/api/mesures?depuis=${Date.now() - 24 * 3600e3}&pas=600`)
const points = await reponse.json() // [{ ts, temperature, humidite }]
```

## Choix

- **Les messages retenus sont ignorés** : le broker les rejoue à la connexion, ce sont de vieilles valeurs.
- **Mesures invalides rejetées** (JSON cassé, `NaN` du DHT22, hors plage −40…80 °C / 0…100 %).
- **Rétention simple** : tout ce qui a plus de `RETENTION_JOURS` (30) jours est effacé, au démarrage puis
  toutes les heures.
- **Aucune route d'écriture** : les mesures n'arrivent que par MQTT, depuis le compte `objet`.

## Outils et tests

| Commande | Rôle |
|---|---|
| `npm test` | Tests automatiques avec un broker MQTT local (aucun accès réseau) |
| `npm run simulateur` | Faux objet sur le vrai broker : mesures toutes les 10 s, obéit aux commandes (`-- --chaud` pour faire monter la température) |
| `npm run test-droits` | Vérifie TLS, mots de passe et droits par topic sur le vrai broker |

Les deux derniers lisent `.env.outils` (modèle : `.env.outils.example`), qui contient les trois comptes :
à garder sur le PC de Raphaël uniquement.
