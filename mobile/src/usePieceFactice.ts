import { useEffect, useState } from 'react';

import type { Etat, Mesures, Piece } from './types';

const PERIODE_MS = 10_000; // même rythme que l'objet

// Fait varier une valeur de ±amplitude, arrondie à 0,1 près.
function varier(valeur: number, amplitude: number): number {
  const variation = (Math.random() * 2 - 1) * amplitude;
  return Math.round((valeur + variation) * 10) / 10;
}

// Source de données factice : à remplacer par un hook MQTT qui renvoie le même type Piece.
export function usePieceFactice(): Piece {
  const [mesures, setMesures] = useState<Mesures>({ temperature: 23.4, humidite: 48.2 });
  const [recuA, setRecuA] = useState(() => new Date());
  const [etat, setEtat] = useState<Etat>({ fenetre: 'fermee', vmc: 'coupee', mode: 'manuel' });

  useEffect(() => {
    const minuteur = setInterval(() => {
      setMesures((m) => ({
        temperature: varier(m.temperature, 0.3),
        humidite: varier(m.humidite, 1),
      }));
      setRecuA(new Date());
    }, PERIODE_MS);
    return () => clearInterval(minuteur);
  }, []);

  return {
    mesures,
    recuA,
    etat,
    commanderFenetre: (commande) =>
      setEtat((e) => ({ ...e, fenetre: commande === 'ouvrir' ? 'ouverte' : 'fermee' })),
    commanderVmc: (commande) =>
      setEtat((e) => ({ ...e, vmc: commande === 'allumer' ? 'allumee' : 'coupee' })),
    changerMode: (mode) => setEtat((e) => ({ ...e, mode })),
  };
}
