import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HomeScreen } from './src/HomeScreen';
import { usePieceFactice } from './src/usePieceFactice';

export default function App() {
  const piece = usePieceFactice();

  return (
    <SafeAreaProvider>
      <HomeScreen piece={piece} />
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
