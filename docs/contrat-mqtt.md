# Contrat MQTT

> **Brouillon, à valider à trois.** Les topics viennent du plan du projet. Les formats de message, les QoS et les seuils sont des propositions.

## Topics

| Topic | Publié par | Lu par | QoS | Retenu | Contenu |
| --- | --- | --- | --- | --- | --- |
| `piece/mesures` | objet | app, back-end | 0 | non | JSON, voir ci-dessous |
| `piece/fenetre/commande` | app | objet | 1 | non | `ouvrir` ou `fermer` |
| `piece/vmc/commande` | app | objet | 1 | non | `allumer` ou `couper` |
| `piece/mode` | app | objet | 1 | oui | `auto` ou `manuel` |
| `piece/etat` | objet | app | 1 | oui | JSON, voir ci-dessous |

Les messages retenus permettent à l'app de connaître l'état de la pièce dès sa connexion, sans attendre le prochain changement. De même, l'objet retrouve le dernier mode choisi après un redémarrage.

## Formats JSON

`piece/mesures`, publié toutes les 10 secondes, température en °C et humidité en % :

```json
{ "temperature": 23.4, "humidite": 48.2 }
```

`piece/etat`, publié à chaque changement et au démarrage de l'objet :

```json
{ "fenetre": "fermee", "vmc": "coupee", "mode": "manuel" }
```

Valeurs possibles : `fenetre` vaut `ouverte` ou `fermee`, `vmc` vaut `allumee` ou `coupee`, `mode` vaut `auto` ou `manuel`.

## Seuils

| Grandeur | Seuil | Action de l'objet en mode auto | Alerte dans l'app |
| --- | --- | --- | --- |
| Température | 28 °C | ouvrir la fenêtre | « Trop chaud » |
| Humidité | 70 % | allumer la VMC | « Trop humide » |

## Points à trancher

1. **Mode dans `piece/etat`** : le plan ne cite que la fenêtre et la VMC. La proposition y ajoute `mode`, pour que l'app affiche ce que l'objet applique réellement.
2. **Commande reçue en mode auto** : la proposition est que l'objet l'ignore et que l'app désactive les boutons tant que le mode auto est actif.
3. **Horodatage des mesures** : la proposition est de ne pas en envoyer depuis l'objet. L'app et le back-end datent chaque mesure à sa réception.
4. **Valeurs des seuils** : 28 °C et 70 % sont des valeurs de départ. Elles doivent être identiques côté objet et côté app.
5. **Connexion de l'app** : Expo Go ne permet pas de connexion MQTT en TCP direct. L'app passera par MQTT sur WebSocket sécurisé (`wss://`), à activer et tester sur le cluster HiveMQ.
