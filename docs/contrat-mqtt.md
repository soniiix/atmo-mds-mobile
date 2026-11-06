# Contrat MQTT — proposition v0.2 (à valider à trois)

Ce fichier fixe les **noms des topics**, **qui a le droit d'y publier** et le **format exact des messages**.
L'objet (Keyrhan), l'app (Quentin) et le back-end (Raphaël) s'y conforment ; les droits du broker
(voir [broker/guide-emqx.md](../broker/guide-emqx.md)) en sont la traduction directe.

> Changement depuis la v0.1 du plan : le broker est **EMQX Cloud Serverless** et non plus HiveMQ Cloud
> (l'offre gratuite de HiveMQ Cloud n'est plus en vente depuis le 30/09/2026 et s'arrête le 31/12/2026).
> Les topics, eux, ne changent pas.

## Les topics

| Topic | Publie | S'abonne | QoS | Retenu | Contenu |
|---|---|---|---|---|---|
| `piece/mesures` | objet | app, back-end | 0 | non | JSON `{"temperature": 23.4, "humidite": 51.2}` |
| `piece/fenetre/commande` | app | objet | 1 | non | texte `ouvrir` ou `fermer` |
| `piece/vmc/commande` | app | objet | 1 | non | texte `allumer` ou `couper` |
| `piece/mode` | app | objet | 1 | **oui** | texte `auto` ou `manuel` |
| `piece/etat` | objet | app | 1 | **oui** | JSON `{"fenetre": "ouverte", "vmc": "coupee", "mode": "auto"}` |
| `piece/objet/statut` *(ajout proposé)* | objet (via le testament MQTT) | app | 1 | **oui** | texte `en_ligne` ou `hors_ligne` |

### Détail des messages

**`piece/mesures`** — toutes les 10 secondes.

```json
{"temperature": 23.4, "humidite": 51.2}
```

- `temperature` en °C, `humidite` en % d'humidité relative, nombres avec une décimale.
- Pas d'horodatage : le back-end date la mesure à sa réception (pas besoin de NTP sur l'ESP32).
- Si le DHT22 renvoie une erreur de lecture (`NaN`), **ne rien publier** pour ce cycle.
- Le back-end rejette toute mesure hors de la plage du DHT22 (−40 à 80 °C, 0 à 100 %).

**Commandes** (`piece/fenetre/commande`, `piece/vmc/commande`, `piece/mode`) — texte brut, en minuscules,
sans guillemets ni retour à la ligne. Côté ESP32 : `String msg((char*)payload, length); if (msg == "ouvrir") …`

- L'objet **ignore** tout contenu inconnu (le script de test des droits publie `test-droits`).
- En mode `auto`, une commande manuelle de fenêtre ou de VMC est ignorée par l'objet (sinon le mode auto
  la défait au cycle suivant). À confirmer avec Keyrhan.
- `piece/mode` est retenu : quand l'ESP32 redémarre, il reçoit tout de suite le dernier mode choisi.

**`piece/etat`** — publié par l'objet à chaque changement (commande reçue ou décision du mode auto) et au démarrage.

```json
{"fenetre": "ouverte", "vmc": "coupee", "mode": "auto"}
```

Valeurs possibles : `fenetre` = `ouverte` | `fermee`, `vmc` = `allumee` | `coupee`, `mode` = `auto` | `manuel`.
Retenu : l'app affiche l'état réel dès sa connexion, sans attendre un changement.

**`piece/objet/statut`** *(ajout proposé, utile pour le mode hors ligne de l'app)* — l'ESP32 se connecte avec un
testament (*Last Will*) `hors_ligne` retenu sur ce topic, puis publie `en_ligne` retenu juste après la connexion.
Si l'ESP32 disparaît (simulation Wokwi arrêtée), le broker publie `hors_ligne` à sa place. L'app peut afficher
« objet hors ligne » au lieu de garder des valeurs figées.

## Règles communes

- **Identifiant de client unique** par connexion : `objet-esp32`, `backend-historique`, et pour l'app
  `app-` suivi d'un suffixe aléatoire. Deux clients avec le même identifiant s'éjectent mutuellement.
- **S'abonner topic par topic**, jamais à `piece/#` : les droits du broker n'autorisent que les topics listés
  ci-dessus, un abonnement générique est refusé.
- **Connexion chiffrée uniquement** : `mqtts://<adresse>:8883` (ESP32, back-end) ou
  `wss://<adresse>:8084/mqtt` (app React Native). EMQX Serverless n'accepte pas le MQTT en clair.
- Un compte par brique : `objet`, `app`, `backend`. Personne ne se connecte avec le compte d'un autre.

## Seuils

| Grandeur | Seuil | Action de l'objet en mode auto | Alerte dans l'app |
|---|---|---|---|
| Température | 28 °C | ouvrir la fenêtre | « Trop chaud » |
| Humidité | 70 % | allumer la VMC | « Trop humide » |

Valeurs de départ, identiques côté objet et côté app (`mobile/src/config.ts`).

## Points encore ouverts

- Les seuils du mode auto sont-ils fixés dans le firmware, ou réglables depuis l'app
  (il faudrait alors un topic `piece/seuils`, publié par l'app et retenu) ?
- Le back-end garde-t-il aussi l'historique de `piece/etat` (ouvertures de fenêtre, VMC) ? Pour l'instant : non,
  uniquement les mesures.
