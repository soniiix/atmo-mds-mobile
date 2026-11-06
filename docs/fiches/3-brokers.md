# Chapitre 3 — Passerelles et brokers (fiche S, Raphaël)

## La notion

**Le broker** est le serveur central de MQTT. Les clients ne se parlent jamais directement : ils **publient**
un message sur un *topic* (`piece/mesures`) et le broker le transmet à tous ceux qui sont **abonnés** à ce
topic. Ce modèle *publish/subscribe* découple les clients :

- **dans l'espace** : l'ESP32 ne connaît ni l'adresse du téléphone ni celle du back-end ;
- **dans le temps** : grâce aux **messages retenus**, l'app reçoit le dernier état dès sa connexion, même si
  l'objet l'a publié il y a une heure ;
- **en nombre** : ajouter un abonné (notre back-end d'historique) ne change rien côté objet.

Le broker apporte aussi la **qualité de service** (QoS 0 : au plus une fois ; QoS 1 : au moins une fois ;
QoS 2 : exactement une fois), le **testament** (*Last Will* : message publié par le broker quand un client
disparaît, notre `piece/objet/statut` = `hors_ligne`) et la **sécurité** : authentification et droits par topic.

**Une passerelle** (*gateway*) fait le lien entre deux mondes : elle traduit un protocole (capteurs Zigbee ou
Bluetooth vers MQTT sur IP) ou relie un réseau local à Internet. Notre ESP32 parle Wi-Fi et MQTT lui-même, donc
pas de passerelle protocolaire. Mais il y en a une cachée : l'ESP32 simulé de **Wokwi** sort sur Internet par
la **passerelle IoT de Wokwi** (le réseau `Wokwi-GUEST`), qui relaie son trafic jusqu'au broker. On parle aussi
de **pont** (*bridge*) quand un broker local recopie certains topics vers un broker cloud.

## Comparaison des brokers

| | Mosquitto | HiveMQ | EMQX (notre choix) |
|---|---|---|---|
| Éditeur | Fondation Eclipse, open source | HiveMQ GmbH (édition Community open source + Enterprise) | EMQ Technologies |
| Écrit en | C | Java | Erlang/OTP |
| Point fort | Très léger : tourne sur un Raspberry Pi | Grappe de serveurs, extensions en Java | Très grande échelle, cloud géré |
| Grappe (cluster) | Non (un seul serveur) | Oui (Enterprise) | Oui |
| Hébergement | À installer soi-même | Soi-même ou HiveMQ Cloud | Soi-même ou EMQX Cloud |
| Offre cloud gratuite | Aucune | Serverless : **fermée** (plus vendue depuis le 30/09/2026, coupée le 31/12/2026) | Serverless : 1 M minutes de session/mois, 1 Go |
| Droits par topic | Fichier `acl_file` (`topic read`, `topic write`…) | Serverless : une seule permission par compte ; rôles et règles fines réservés aux offres payantes | Plusieurs règles par utilisateur dans la console |
| TLS | À configurer (certificat à obtenir, par ex. Let's Encrypt) | Fourni dans le cloud | Fourni et obligatoire sur Serverless |

**Pourquoi pas Mosquitto ?** Il faudrait un serveur joignable depuis Internet (l'ESP32 de Wokwi ne peut pas
atteindre un PC de la salle), un nom de domaine et un certificat TLS, et le maintenir à jour. Plus de travail,
et plus de surface d'attaque. En échange : contrôle total, aucune dépendance à un fournisseur.
À noter : depuis la version 2.0, Mosquitto refuse les connexions anonymes et n'écoute que la machine locale
tant qu'on ne le configure pas, ce qui évite les brokers ouverts par accident.

Les droits de notre app, écrits pour Mosquitto (`acl_file`), pour comparer avec la console d'EMQX :

```
user app
topic write piece/fenetre/commande
topic write piece/vmc/commande
topic write piece/mode
topic read piece/mesures
topic read piece/etat
topic read piece/objet/statut
```

**Pourquoi on a quitté HiveMQ ?** Le cluster gratuit prévu n'existe plus (fin de l'offre Serverless). Et même
avant, Serverless n'acceptait qu'une seule permission par compte : or l'app doit publier sur trois topics de
commande et lire trois autres topics, tout en étant interdite sur `piece/mesures`. EMQX Serverless accepte
plusieurs règles par compte et une règle finale « tout refuser ».

**Ce qu'on en retient** : MQTT est un standard (OASIS), donc changer de broker n'a touché ni au firmware, ni à
l'app, ni au back-end, seulement à l'adresse et aux comptes. Un service gratuit peut disparaître : c'est un
risque à prévoir dans un projet réel.

## Sources (consultées le 6 novembre 2026)

- Spécification MQTT 5.0, OASIS : <https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html>
- Mosquitto, configuration (`acl_file`, `password_file`, `allow_anonymous`) :
  <https://mosquitto.org/man/mosquitto-conf-5.html>
- HiveMQ Cloud, authentification et autorisations, avec l'annonce de fin de Serverless :
  <https://docs.hivemq.com/hivemq-cloud/authn-authz.html>
- HiveMQ, options de droits selon l'offre :
  <https://docs.hivemq.com/hivemq-platform/connect/access-management-options-per-cloud-plan.html>
- EMQX Cloud, offres et quotas : <https://docs.emqx.com/en/cloud/latest/price/plans.html>
- EMQX Cloud, créer un déploiement Serverless : <https://docs.emqx.com/en/cloud/latest/create/serverless.html>
- EMQX Cloud, autorisations : <https://docs.emqx.com/en/cloud/latest/deployments/default_authz.html>
