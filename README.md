# Confort d'une pièce

Une pièce connectée et simulée : un ESP32 sur Wokwi mesure la température et l'humidité, et une app React Native affiche les mesures, alerte au seuil et pilote une fenêtre et une VMC. Les messages passent par un broker MQTT HiveMQ Cloud.

```
ESP32 (Wokwi)  <--MQTT-->  HiveMQ Cloud  <--MQTT-->  App React Native
                                |
                                +--> Back-end (historique des mesures)
```

## Organisation du dépôt

| Dossier | Contenu | Responsable | État |
| --- | --- | --- | --- |
| [`mobile/`](mobile/) | App React Native (Expo) | Quentin | Écran d'accueil, valeurs factices |
| [`firmware/`](firmware/) | Simulation Wokwi de l'ESP32 | Keyrhan | À faire |
| [`backend/`](backend/) | Historique des mesures | Raphaël | À faire |
| [`docs/`](docs/) | Contrat MQTT, doc technique, dossier sécu, fiches | Tous | Contrat en brouillon |

Chaque dossier est indépendant, avec sa propre techno et ses propres dépendances. Le lien entre les briques est le [contrat MQTT](docs/contrat-mqtt.md).

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

Aucun identifiant ne doit être commité ni écrit en dur dans le code : ni mot de passe HiveMQ, ni URL contenant un compte.

- Seuls les fichiers modèles (`.env.example`, `secrets.example.h`) sont commités. Les vrais `.env` et `secrets.h` sont ignorés par Git.
- Un projet Wokwi partagé par lien montre ses fichiers : le mot de passe de l'objet ne doit pas s'y retrouver.
- Les variables `EXPO_PUBLIC_*` sont intégrées à l'app : elles conviennent pour l'adresse du broker, pas pour un mot de passe.
