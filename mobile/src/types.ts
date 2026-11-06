// Types du contrat MQTT : voir docs/contrat-mqtt.md

export type Mesures = {
  temperature: number; // °C
  humidite: number; // %
};

export type Fenetre = 'ouverte' | 'fermee';
export type Vmc = 'allumee' | 'coupee';
export type Mode = 'auto' | 'manuel';

export type Etat = {
  fenetre: Fenetre;
  vmc: Vmc;
  mode: Mode;
};

export type CommandeFenetre = 'ouvrir' | 'fermer';
export type CommandeVmc = 'allumer' | 'couper';

// Ce que l'écran attend d'une source de données, factice ou MQTT.
export type Piece = {
  mesures: Mesures;
  recuA: Date; // heure de réception de la dernière mesure
  etat: Etat;
  commanderFenetre: (commande: CommandeFenetre) => void;
  commanderVmc: (commande: CommandeVmc) => void;
  changerMode: (mode: Mode) => void;
};
