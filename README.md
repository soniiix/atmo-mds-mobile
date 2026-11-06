# Confort d'une pièce

Une pièce connectée et simulée : un ESP32 sur Wokwi mesure la température et l'humidité, et une app React Native affiche les mesures, alerte au seuil et pilote une fenêtre et une VMC. Les messages passent par un broker MQTT EMQX Cloud.

```
ESP32 (Wokwi)  <--MQTT-->  EMQX Cloud    <--MQTT-->  App React Native
                                |
                                +--> Back-end (historique des mesures)
```

## Organisation du dépôt

| Dossier | Contenu | Responsable | État |
| --- | --- | --- | --- |
| [`mobile/`](mobile/) | App React Native (Expo) | Quentin | Écran d'accueil, valeurs factices |
| [`firmware/`](firmware/) | Simulation Wokwi de l'ESP32 | Keyrhan | À faire |
| [`backend/`](backend/) | Historique des mesures (Node.js, SQLite) | Raphaël | Fait, testé avec un broker local |
| [`broker/`](broker/guide-emqx.md) | Mise en place d'EMQX : comptes, droits par topic, TLS | Raphaël | Guide prêt, compte à créer |
| [`docs/`](docs/) | Contrat MQTT, [dossier sécu](docs/securite/dossier-securite.md), [fiches](docs/fiches/) | Tous | Contrat v0.2 à valider |
| [`outils/`](outils/verif-secrets.mjs) | Contrôle des secrets en dur et connexions non chiffrées | Raphaël | `node outils/verif-secrets.mjs` |

Chaque dossier est indépendant, avec sa propre techno et ses propres dépendances. Le lien entre les briques est le [contrat MQTT](docs/contrat-mqtt.md).

## Changement de broker : HiveMQ → EMQX

L'offre gratuite de HiveMQ Cloud (Serverless) n'est plus vendue depuis le 30/09/2026 et s'arrête le 31/12/2026. On passe sur **EMQX Cloud Serverless** (gratuit, TLS, droits par topic). Les topics ne changent pas. Explications : [broker/guide-emqx.md](broker/guide-emqx.md#0-pourquoi-emqx-et-plus-hivemq).

## Travailler à plusieurs

1. Créer une branche par tâche depuis `main`, par exemple `firmware/dht22` ou `mobile/mqtt`.
2. Rester dans le dossier de sa brique autant que possible.
3. Ouvrir une pull request vers `main`.

Toute modification de `docs/contrat-mqtt.md` touche les trois briques : elle passe par une pull request validée par les deux autres. Les seuils existent à la fois dans l'app et dans le firmware, donc il faut changer les deux en même temps.

## Lancer l'app

Il faut Node.js et l'application Expo Go sur le téléphone, connecté au même réseau Wi-Fi que l'ordinateur.

```bash
cd mobile
npm install
npx expo start
```

Scanner ensuite le QR code affiché avec Expo Go. Sur un réseau qui isole les appareils, comme le Wi-Fi du campus, lancer plutôt `npx expo start --tunnel`.

## Règle sur les secrets

Aucun identifiant ne doit être commité ni écrit en dur dans le code : ni mot de passe du broker, ni URL contenant un compte.

- Avant de commiter : `node outils/verif-secrets.mjs` depuis la racine.
- Seuls les fichiers modèles (`*.example`, `secrets.example.h`) sont commités. Les vrais `.env` et `secrets.h` sont ignorés par Git.
- Un projet Wokwi partagé par lien montre ses fichiers : le mot de passe de l'objet ne doit pas s'y retrouver.
- Les variables `EXPO_PUBLIC_*` sont intégrées à l'app : elles conviennent pour l'adresse du broker, pas pour un mot de passe.
