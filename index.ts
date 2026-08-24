import 'react-native-gesture-handler';
import { Buffer } from 'buffer';
import { registerRootComponent } from 'expo';

if (!(globalThis as { Buffer?: typeof Buffer }).Buffer) {
  (globalThis as { Buffer: typeof Buffer }).Buffer = Buffer;
}

import App from './App';

registerRootComponent(App);
