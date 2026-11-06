# Firmware : simulation Wokwi

Responsable : Keyrhan.

ESP32 avec un capteur DHT22, un servomoteur pour la fenêtre et un relais avec une LED pour la VMC. Les topics et les formats de message sont définis dans le [contrat MQTT](../docs/contrat-mqtt.md).

## Fichiers attendus

| Fichier | Rôle |
| --- | --- |
| `sketch.ino` | Code de l'ESP32 |
| `diagram.json` | Montage Wokwi |
| `libraries.txt` | Bibliothèques utilisées |
| `secrets.example.h` | Modèle des identifiants, sans vraies valeurs |

## Lancer la simulation

À compléter : lien du projet Wokwi et étapes de lancement.

## Secrets

Copier `secrets.example.h` en `secrets.h` et le remplir. `secrets.h` est ignoré par Git.

Un projet Wokwi partagé par lien montre ses fichiers : vérifier comment fournir le mot de passe sans l'y exposer avant d'utiliser le vrai compte.
