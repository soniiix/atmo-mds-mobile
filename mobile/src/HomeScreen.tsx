import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SEUIL_HUMIDITE, SEUIL_TEMPERATURE } from './config';
import type { Piece } from './types';

const COULEURS = {
  fond: '#F2F5F4',
  carte: '#FFFFFF',
  texte: '#17211F',
  texteDiscret: '#5A6865',
  accent: '#0B6E5F',
  alerte: '#B3261E',
  alerteFond: '#FBE9E7',
  desactive: '#C9D1CF',
  bordure: '#DDE3E1',
};

type MesureProps = {
  libelle: string;
  valeur: number;
  unite: string;
  seuil: number;
  messageAlerte: string;
};

function CarteMesure({ libelle, valeur, unite, seuil, messageAlerte }: MesureProps) {
  const depasse = valeur >= seuil;
  return (
    <View style={[styles.carte, styles.carteMesure, depasse && styles.carteAlerte]}>
      <Text style={styles.libelle}>{libelle}</Text>
      <Text style={[styles.valeur, depasse && styles.texteAlerte]}>
        {valeur.toFixed(1)}
        <Text style={styles.unite}> {unite}</Text>
      </Text>
      <Text style={[styles.detail, depasse && styles.texteAlerte]}>
        {depasse ? messageAlerte : `Seuil : ${seuil} ${unite}`}
      </Text>
    </View>
  );
}

type CommandeProps = {
  nom: string;
  etat: string;
  action: string;
  desactive: boolean;
  onPress: () => void;
};

function LigneCommande({ nom, etat, action, desactive, onPress }: CommandeProps) {
  return (
    <View style={styles.ligne}>
      <View>
        <Text style={styles.nom}>{nom}</Text>
        <Text style={styles.detail}>{etat}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${action} : ${nom}`}
        accessibilityState={{ disabled: desactive }}
        disabled={desactive}
        onPress={onPress}
        style={({ pressed }) => [
          styles.bouton,
          desactive && styles.boutonDesactive,
          pressed && styles.boutonPresse,
        ]}
      >
        <Text style={[styles.boutonTexte, desactive && styles.boutonTexteDesactive]}>{action}</Text>
      </Pressable>
    </View>
  );
}

export function HomeScreen({ piece }: { piece: Piece }) {
  const { mesures, recuA, etat } = piece;
  const auto = etat.mode === 'auto';
  const fenetreOuverte = etat.fenetre === 'ouverte';
  const vmcAllumee = etat.vmc === 'allumee';

  return (
    <SafeAreaView style={styles.ecran}>
      <ScrollView contentContainerStyle={styles.contenu}>
        <Text style={styles.titre}>Confort de la pièce</Text>
        <Text style={styles.detail}>
          Données factices · dernière mesure à {recuA.toLocaleTimeString('fr-FR')}
        </Text>

        <View style={styles.mesures}>
          <CarteMesure
            libelle="Température"
            valeur={mesures.temperature}
            unite="°C"
            seuil={SEUIL_TEMPERATURE}
            messageAlerte="Trop chaud"
          />
          <CarteMesure
            libelle="Humidité"
            valeur={mesures.humidite}
            unite="%"
            seuil={SEUIL_HUMIDITE}
            messageAlerte="Trop humide"
          />
        </View>

        <View style={styles.carte}>
          <View style={styles.ligne}>
            <View style={styles.texteMode}>
              <Text style={styles.nom}>Mode auto</Text>
              <Text style={styles.detail}>
                {auto ? "L'objet pilote la fenêtre et la VMC" : 'Vous pilotez la fenêtre et la VMC'}
              </Text>
            </View>
            <Switch
              accessibilityLabel="Mode auto"
              value={auto}
              onValueChange={(actif) => piece.changerMode(actif ? 'auto' : 'manuel')}
              trackColor={{ true: COULEURS.accent, false: COULEURS.desactive }}
            />
          </View>
          <View style={styles.separateur} />
          <LigneCommande
            nom="Fenêtre"
            etat={fenetreOuverte ? 'Ouverte' : 'Fermée'}
            action={fenetreOuverte ? 'Fermer' : 'Ouvrir'}
            desactive={auto}
            onPress={() => piece.commanderFenetre(fenetreOuverte ? 'fermer' : 'ouvrir')}
          />
          <View style={styles.separateur} />
          <LigneCommande
            nom="VMC"
            etat={vmcAllumee ? 'Allumée' : 'Coupée'}
            action={vmcAllumee ? 'Couper' : 'Allumer'}
            desactive={auto}
            onPress={() => piece.commanderVmc(vmcAllumee ? 'couper' : 'allumer')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1, backgroundColor: COULEURS.fond },
  contenu: { padding: 16, gap: 16 },
  titre: { fontSize: 28, fontWeight: '700', color: COULEURS.texte },
  mesures: { flexDirection: 'row', gap: 12 },
  carte: {
    backgroundColor: COULEURS.carte,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COULEURS.bordure,
    padding: 16,
  },
  carteMesure: { flex: 1, gap: 4 },
  carteAlerte: { backgroundColor: COULEURS.alerteFond, borderColor: COULEURS.alerte },
  libelle: { fontSize: 14, fontWeight: '600', color: COULEURS.texteDiscret },
  valeur: {
    fontSize: 36,
    fontWeight: '700',
    color: COULEURS.texte,
    fontVariant: ['tabular-nums'],
  },
  unite: { fontSize: 18, fontWeight: '500' },
  detail: { fontSize: 13, color: COULEURS.texteDiscret },
  texteAlerte: { color: COULEURS.alerte },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 48,
  },
  texteMode: { flex: 1 },
  nom: { fontSize: 16, fontWeight: '600', color: COULEURS.texte },
  separateur: { height: 1, backgroundColor: COULEURS.bordure, marginVertical: 12 },
  bouton: {
    minWidth: 96,
    minHeight: 44,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: COULEURS.accent,
  },
  boutonPresse: { opacity: 0.8 },
  boutonDesactive: { backgroundColor: COULEURS.desactive },
  boutonTexte: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  boutonTexteDesactive: { color: COULEURS.texteDiscret },
});
