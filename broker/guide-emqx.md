# Broker EMQX Cloud : mise en place, comptes, droits, TLS

Responsable : Raphaël. Ce guide sert à refaire la configuration de zéro et à l'expliquer à l'oral.
Les noms de topics viennent du [contrat MQTT](../docs/contrat-mqtt.md).

## 0. Pourquoi EMQX et plus HiveMQ

Le plan prévoyait le cluster gratuit **HiveMQ Cloud Serverless**. HiveMQ a arrêté de le vendre le 30/09/2026,
le coupe le 31/12/2026 et supprime les clusters le 07/01/2027 ; l'offre Starter n'est gratuite que 15 jours.
On ne peut donc plus créer le cluster prévu, et un cluster existant s'arrêterait avant la fin du module.

**EMQX Cloud Serverless** offre ce qu'il nous faut gratuitement : TLS obligatoire, un compte par brique, et des
**droits par topic** (ce qui rend possible la règle « l'app ne peut pas publier de fausses mesures »).
À faire : corriger la ligne « Broker » du relevé et prévenir le prof.

## 1. Créer le déploiement (à faire à la main, une fois)

1. Créer un compte gratuit sur EMQX Cloud (<https://www.emqx.com/en/cloud>). Pas de carte bancaire nécessaire.
2. Dans la console : **New Deployment** → **Serverless** → région en Europe → nom `piece-confort`.
3. Laisser la **limite de dépense (spend limit) à 0** : seul le quota gratuit est utilisé ; s'il est épuisé, le
   déploiement s'arrête au lieu de facturer.
4. Page **Overview** du déploiement, noter :
   - l'**adresse** (du type `xxxxxxxx.ala.eu-central-1.emqxsl.com`) ;
   - les ports : **8883** (MQTT sur TLS) et **8084** (WebSocket sur TLS). Il n'y a pas de port en clair ;
   - le **certificat de l'autorité** : <https://assets.emqx.com/data/emqxsl-ca.crt> (pour l'ESP32).

Limites du gratuit à connaître : 1 000 000 minutes de session par mois (nos 3 clients branchés en permanence
en consomment environ 130 000), 1 Go de trafic par mois, 10 messages/s publiés par client, 10 abonnements par
client. **Un déploiement sans aucune connexion pendant 30 jours est arrêté** : penser à le relancer avant la démo.

## 2. Les comptes : un par brique

Menu **Access Control → Authentication** → **Add**. EMQX n'accepte pas les connexions anonymes.

| Utilisateur | Qui l'utilise | Où le mot de passe est rangé |
|---|---|---|
| `objet` | ESP32 (Keyrhan) et `npm run simulateur` | `secrets.h` du firmware, hors Git |
| `app` | app React Native (Quentin) | saisi dans l'app au premier lancement, voir [dossier sécu](../docs/securite/dossier-securite.md#4-aucun-secret-dans-lapp) |
| `backend` | back-end d'historique (Raphaël) | `backend/.env`, hors Git |

- Mots de passe **différents**, générés au hasard, **au moins 20 caractères** (gestionnaire de mots de passe).
- Les transmettre à la personne concernée seulement, en direct ou par un lien à usage unique
  (par ex. Bitwarden Send), **jamais dans le dépôt Git** ni en clair dans le groupe de discussion.
- Après la démo : changer les trois mots de passe.

## 3. Les droits par topic

Menu **Access Control → Authorization**, onglet **Username**. Une ligne par règle, toutes en **Allow** :

| Utilisateur | Topic | Action |
|---|---|---|
| `objet` | `piece/mesures` | Publish |
| `objet` | `piece/etat` | Publish |
| `objet` | `piece/objet/statut` | Publish |
| `objet` | `piece/fenetre/commande` | Subscribe |
| `objet` | `piece/vmc/commande` | Subscribe |
| `objet` | `piece/mode` | Subscribe |
| `app` | `piece/fenetre/commande` | Publish |
| `app` | `piece/vmc/commande` | Publish |
| `app` | `piece/mode` | Publish |
| `app` | `piece/mesures` | Subscribe |
| `app` | `piece/etat` | Subscribe |
| `app` | `piece/objet/statut` | Subscribe |
| `backend` | `piece/mesures` | Subscribe |

Puis onglet **All Users** : topic `#`, action **Publish & Subscribe**, permission **Deny**.

**Cette dernière règle est indispensable.** Par défaut EMQX Serverless est en mode « liste noire » : tout ce qui
n'est pas explicitement interdit est autorisé, et ce mode ne peut pas être changé sur Serverless. Sans la règle
« tout refuser », l'app pourrait publier sur `piece/mesures` malgré le tableau ci-dessus.

Ce que ce tableau garantit :
- l'app ne peut pas publier de fausse mesure ni de faux état ;
- seule l'app peut commander la fenêtre et la VMC (ni l'objet, ni le back-end) ;
- le back-end ne peut rien publier : même s'il était piraté, il ne pourrait pas ouvrir la fenêtre.

## 4. Tester sans code (client MQTT graphique)

Avec **MQTTX** (gratuit, <https://mqttx.app>) :

1. Nouvelle connexion « app » : hôte = l'adresse, protocole `mqtts://`, port 8883, SSL/TLS activé avec
   vérification du certificat, utilisateur `app` et son mot de passe.
2. Nouvelle connexion « backend » de la même façon avec le compte `backend`, abonnée à `piece/mesures`.
3. Depuis « app », s'abonner à `piece/mesures` et `piece/etat` : les mesures de l'objet (ou du simulateur)
   arrivent toutes les 10 s.
4. Depuis « app », publier `{"temperature": 99, "humidite": 1}` sur `piece/mesures` : **rien n'arrive** dans
   la connexion « backend ». C'est la preuve à montrer en démo.
5. Depuis « app », publier `ouvrir` sur `piece/fenetre/commande` : le servo de Wokwi tourne.

## 5. Tester automatiquement (avant chaque démo)

Les commandes npm se lancent **dans le dossier `backend/`** (c'est là qu'est le `package.json`, pas à la
racine). Copier `backend/.env.outils.example` en `backend/.env.outils`, y mettre l'adresse et les trois
comptes, puis :

```bash
cd backend
npm install
npm run test-droits
```

Le script vérifie onze règles (connexion en clair refusée, mauvais mot de passe refusé, fausse mesure bloquée,
commandes réservées à l'app, abonnement `piece/#` refusé…) et affiche `OK` ou `ÉCHEC` pour chacune.
Après un changement de droits dans la console, attendre quelques minutes avant de relancer.

Pour tester sans l'ESP32 : `npm run simulateur` fait un faux objet (et `npm run simulateur -- --chaud`
fait monter la température pour déclencher l'alerte et le mode auto).

## 6. TLS : ce que chaque brique doit faire

Le broker n'accepte que TLS ; il reste à chaque client de **vérifier le certificat du broker**, sinon un faux
broker pourrait se faire passer pour le vrai (attaque de l'homme du milieu).

**ESP32 / Wokwi (Keyrhan)** — `WiFiClientSecure` avec le certificat de l'autorité, jamais `setInsecure()` :

```cpp
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include "secrets.h"   // MQTT_HOST, MQTT_USER, MQTT_PASS, CA_CERT : fichier hors Git

WiFiClientSecure tls;
PubSubClient mqtt(tls);

void setup() {
  WiFi.begin("Wokwi-GUEST", "", 6);
  while (WiFi.status() != WL_CONNECTED) delay(100);
  tls.setCACert(CA_CERT);          // vérifie que c'est bien notre broker
  mqtt.setServer(MQTT_HOST, 8883);
}

void connecter() {
  // Testament : si l'ESP32 disparaît, le broker publie « hors_ligne » (retenu) à sa place.
  if (mqtt.connect("objet-esp32", MQTT_USER, MQTT_PASS, "piece/objet/statut", 1, true, "hors_ligne")) {
    mqtt.publish("piece/objet/statut", "en_ligne", true);
    mqtt.subscribe("piece/fenetre/commande", 1);
    mqtt.subscribe("piece/vmc/commande", 1);
    mqtt.subscribe("piece/mode", 1);
  }
}
```

`secrets.h` (modèle à commiter sous le nom `secrets.h.example`, avec des valeurs vides) :

```cpp
#define MQTT_HOST "xxxxxxxx.ala.eu-central-1.emqxsl.com"
#define MQTT_USER "objet"
#define MQTT_PASS ""
static const char CA_CERT[] = R"EOF(
-----BEGIN CERTIFICATE-----
(coller ici le contenu de emqxsl-ca.crt)
-----END CERTIFICATE-----
)EOF";
```

Si la poignée de main TLS échoue alors que le certificat est bon, synchroniser l'heure de l'ESP32 avant de se
connecter (`configTime(0, 0, "pool.ntp.org")`) : un certificat ne peut être vérifié qu'avec une date correcte.
Le projet Wokwi contient le mot de passe de l'objet : ne pas publier son lien.

**App React Native (Quentin)** — WebSocket chiffré : `wss://<adresse>:8084/mqtt` (chemin `/mqtt` à confirmer
dans l'Overview). Le téléphone vérifie le certificat tout seul avec ses autorités de confiance.

**Back-end (Raphaël)** — `MQTT_URL=mqtts://<adresse>:8883` dans `backend/.env` ; Node vérifie le certificat
(si erreur de certificat, renseigner `MQTT_CA_FILE` avec le chemin de `emqxsl-ca.crt`).

## 7. Vérifier qu'aucun secret n'est dans le dépôt

Depuis la racine du dépôt :

```bash
node outils/verif-secrets.mjs
```

Le script signale les mots de passe écrits en dur, les identifiants dans une URL, les variables
`EXPO_PUBLIC_…PASSWORD` (copiées en clair dans l'app), les fichiers `.env` ou `secrets.h` qui seraient commités,
les connexions `mqtt://` ou `ws://` non chiffrées et les vérifications TLS désactivées (`setInsecure`,
`rejectUnauthorized: false`). À lancer avant chaque rendu.
