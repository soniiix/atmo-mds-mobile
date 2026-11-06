# Dossier sécurité — Confort d'une pièce

Responsable : Raphaël (chapitre 6, porté en E). Version du 6 novembre 2026, à compléter à chaque étape.

## 1. Ce qu'on protège

| Bien | Pourquoi il compte | Propriété à garantir |
|---|---|---|
| Les **mesures** (température, humidité) | Elles déclenchent les alertes et le mode auto | Intégrité : personne ne peut en inventer |
| Les **commandes** (fenêtre, VMC, mode) | Elles font bouger un objet physique : une fenêtre ouverte, c'est une effraction possible | Intégrité : seule l'app peut commander |
| Les **identifiants** des trois comptes MQTT | Ils ouvrent l'accès au broker | Confidentialité |
| L'**historique** | Il révèle des habitudes : présence, douches, absences | Confidentialité modérée, durée limitée |
| La **disponibilité** de la chaîne | Pas d'alerte si elle tombe | Disponibilité (au mieux, offre gratuite) |

## 2. Architecture et surfaces d'attaque

```
ESP32 (Wokwi) --mqtts:8883--> EMQX Cloud <--wss:8084-- App (téléphone)
                                   ^
                                   |-- mqtts:8883 -- Back-end d'historique --http:3000--> App (graphe)
```

Tout passe par le broker. Chaque brique a **son propre compte** et **seulement les droits dont elle a besoin**
(détail : [broker/guide-emqx.md](../../broker/guide-emqx.md#3-les-droits-par-topic)).

## 3. Menaces et protections

| # | Menace | Protection en place | Vérifiée par |
|---|---|---|---|
| M1 | Écoute du trafic (Wi-Fi, Internet) : lire les mesures, voler un mot de passe | TLS obligatoire : EMQX Serverless n'ouvre que 8883 (MQTT/TLS) et 8084 (WebSocket/TLS) | `npm run test-droits` (connexion en clair refusée) |
| M2 | Faux broker (homme du milieu) qui récupère les mots de passe | Chaque client vérifie le certificat du broker : CA sur l'ESP32, autorités du système sur le téléphone et sous Node ; `setInsecure()` interdit | `node outils/verif-secrets.mjs` (signale `setInsecure`, `rejectUnauthorized: false`) |
| M3 | Inconnu qui se connecte au broker | Pas d'accès anonyme ; un compte par brique, mot de passe aléatoire de 20 caractères ou plus | `npm run test-droits` (mauvais mot de passe refusé) |
| M4 | **Fausse mesure** injectée (app piratée, mot de passe app volé) pour déclencher ou masquer une alerte | Droits par topic : seul `objet` publie sur `piece/mesures` et `piece/etat` ; règle finale « tout refuser » ; le back-end rejette en plus les valeurs hors plage du DHT22 | `npm run test-droits` (fausse mesure : n'arrive pas chez les abonnés) ; tests du back-end |
| M5 | **Fausse commande** : ouvrir la fenêtre à distance | Seul `app` publie sur les topics de commande ; `objet` et `backend` ne peuvent pas | `npm run test-droits` |
| M6 | Mot de passe publié dans le dépôt Git | `.env` et `secrets.h` dans `.gitignore`, modèles `*.example` vides | `node outils/verif-secrets.mjs` |
| M7 | Mot de passe extrait de l'app installée (APK, bundle JavaScript) | Rien dans le code de l'app : identifiants saisis au premier lancement et rangés dans le stockage sécurisé du téléphone (voir §4) | `verif-secrets` (signale les `EXPO_PUBLIC_…PASSWORD`) |
| M8 | Mot de passe extrait du firmware ou du projet Wokwi | `secrets.h` hors Git, lien du projet Wokwi non diffusé, compte `objet` limité à ses topics | Revue manuelle |
| M9 | Écriture dans l'historique par l'API | API en **lecture seule** (toute autre méthode que GET : 405) ; les mesures n'entrent que par MQTT | Tests du back-end |
| M10 | Saturation, épuisement du quota gratuit | Limites d'EMQX (10 messages/s par client) ; limite de dépense à 0 : le déploiement s'arrête au lieu de facturer | Console EMQX (suivi du quota) |
| M11 | Données personnelles gardées trop longtemps | Rétention de 30 jours, purge automatique toutes les heures (`RETENTION_JOURS`) | Tests du back-end |

## 4. « Aucun secret dans l'app »

L'app doit se connecter au broker, donc elle a besoin d'un mot de passe. Deux façons de faire :

1. **Recommandé : saisie au premier lancement.** L'app affiche un écran « Connexion au broker » (utilisateur,
   mot de passe), puis range les valeurs avec `expo-secure-store` (trousseau iOS, Keystore Android). Le code
   et le paquet de l'app ne contiennent **aucun** secret ; seule l'adresse du broker y figure (elle n'est pas
   secrète).
2. **À éviter : variable `EXPO_PUBLIC_MQTT_PASSWORD` dans un `.env`.** Le fichier n'est pas commité, mais
   Expo **copie la valeur en clair dans le JavaScript de l'app** : n'importe qui avec l'APK peut la lire.
   C'est pour cela que `verif-secrets` la signale.

Dans les deux cas, le compte `app` est bridé par les droits du broker : même volé, il ne permet ni d'inventer
des mesures ni de se faire passer pour l'objet.

## 5. Limites (ce qui n'est pas couvert, et ce qu'on ferait en vrai)

- **Un mot de passe par appareil, pas de certificat client.** EMQX Serverless ne fait que du TLS à sens unique
  (le client vérifie le serveur, pas l'inverse). Celui qui vole le mot de passe `objet` peut publier de fausses
  mesures. En production : un certificat client par appareil (TLS mutuel) et un identifiant unique par objet.
- **Le broker voit tout en clair.** TLS protège le trajet, pas le contenu chez EMQX. On fait confiance à
  l'hébergeur ; sinon il faudrait chiffrer ou signer les messages de bout en bout.
- **Dépendance au fournisseur.** La fin de HiveMQ Cloud Serverless nous a forcés à changer de broker en cours
  de projet. Garder le contrat MQTT standard permet de changer de broker en ne touchant qu'à la configuration.
- **API d'historique en HTTP, sans authentification**, sur le réseau local : quiconque est sur le même Wi-Fi
  peut lire l'historique. Acceptable ici (pas de commande, données peu sensibles). En vrai : HTTPS et un jeton
  par utilisateur.
- **Firmware non protégé.** Dans Wokwi, pas de démarrage sécurisé ni de chiffrement de la mémoire flash : le
  mot de passe est lisible dans le code. Sur un vrai ESP32 : *flash encryption* et *secure boot*.
- **Pas de rotation automatique des mots de passe.** À changer à la main après la démo.
- **Disponibilité non garantie.** Offre gratuite sans engagement de service ; arrêt automatique après 30 jours
  sans connexion ou en cas de quota épuisé. Le mode auto tourne sur l'ESP32, donc la pièce reste régulée même
  si le broker tombe (à confirmer avec Keyrhan).

## 6. Vérifications avant chaque démo

- [ ] `npm run test-droits` dans `backend/` : 11 vérifications `OK`.
- [ ] `node outils/verif-secrets.mjs` à la racine : aucun problème.
- [ ] Déploiement EMQX en marche, quota du mois non épuisé.
- [ ] Après la démo : changer les mots de passe des trois comptes.

## Sources

- EMQX Cloud, ports de Serverless (TLS uniquement, TLS à sens unique) :
  <https://docs.emqx.com/en/cloud/latest/deployments/port_guide_serverless.html>
- EMQX Cloud, autorisations (mode liste noire par défaut, règle « tout refuser ») :
  <https://docs.emqx.com/en/cloud/latest/deployments/default_authz.html>
- EMQX Cloud, limites de Serverless : <https://docs.emqx.com/en/cloud/latest/create/restriction.html>
- HiveMQ Cloud, authentification et autorisations (annonce de fin de Serverless) :
  <https://docs.hivemq.com/hivemq-cloud/authn-authz.html>
- Expo, variables d'environnement (les `EXPO_PUBLIC_` sont incluses dans l'app) :
  <https://docs.expo.dev/guides/environment-variables/>
- Expo SecureStore : <https://docs.expo.dev/versions/latest/sdk/securestore/>
