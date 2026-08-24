import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { AppSettings, AuthState, ScanDocument, ScanFilter, ScanPage } from '../types';

const KEYS = {
  onboarding: 'scanella.onboarding',
  auth: 'scanella.auth',
  settings: 'scanella.settings',
  documents: 'scanella.documents',
};

const defaultSettings: AppSettings = {
  themeMode: 'light',
  autoCapture: true,
  defaultFilter: 'magic',
  shutterSound: true,
  useInAppCamera: false,
};

type AppStore = {
  hydrated: boolean;
  onboardingComplete: boolean;
  auth: AuthState;
  settings: AppSettings;
  documents: ScanDocument[];
  hydrate: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  signIn: (email: string) => Promise<void>;
  signUp: (name: string, email: string) => Promise<void>;
  continueWithoutAccount: () => Promise<void>;
  signOut: () => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  addDocument: (doc: ScanDocument) => Promise<void>;
  updateDocument: (doc: ScanDocument) => Promise<void>;
  deleteDocuments: (ids: string[]) => Promise<void>;
  replacePage: (documentId: string, page: ScanPage) => Promise<void>;
};

async function persist<T>(key: string, value: T) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export const useAppStore = create<AppStore>((set, get) => ({
  hydrated: false,
  onboardingComplete: false,
  auth: { signedIn: false },
  settings: defaultSettings,
  documents: [],

  hydrate: async () => {
    try {
      const [onboarding, auth, settings, documents] = await Promise.all([
        AsyncStorage.getItem(KEYS.onboarding),
        AsyncStorage.getItem(KEYS.auth),
        AsyncStorage.getItem(KEYS.settings),
        AsyncStorage.getItem(KEYS.documents),
      ]);
      set({
        onboardingComplete: onboarding === 'true',
        auth: auth ? (JSON.parse(auth) as AuthState) : { signedIn: false },
        settings: settings
          ? { ...defaultSettings, ...(JSON.parse(settings) as AppSettings) }
          : defaultSettings,
        documents: documents ? (JSON.parse(documents) as ScanDocument[]) : [],
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },

  completeOnboarding: async () => {
    set({ onboardingComplete: true });
    await AsyncStorage.setItem(KEYS.onboarding, 'true');
  },

  signIn: async (email) => {
    const auth: AuthState = { ...get().auth, email, signedIn: true };
    set({ auth, onboardingComplete: true });
    await persist(KEYS.auth, auth);
    await AsyncStorage.setItem(KEYS.onboarding, 'true');
  },

  signUp: async (name, email) => {
    const auth: AuthState = { name, email, signedIn: true };
    set({ auth, onboardingComplete: true });
    await persist(KEYS.auth, auth);
    await AsyncStorage.setItem(KEYS.onboarding, 'true');
  },

  continueWithoutAccount: async () => {
    const auth: AuthState = { signedIn: true };
    set({ auth, onboardingComplete: true });
    await persist(KEYS.auth, auth);
    await AsyncStorage.setItem(KEYS.onboarding, 'true');
  },

  signOut: async () => {
    const auth: AuthState = { signedIn: false };
    set({ auth });
    await persist(KEYS.auth, auth);
  },

  updateSettings: async (patch) => {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    await persist(KEYS.settings, settings);
  },

  addDocument: async (doc) => {
    const documents = [doc, ...get().documents];
    set({ documents });
    await persist(KEYS.documents, documents);
  },

  updateDocument: async (doc) => {
    const documents = get().documents.map((d) => (d.id === doc.id ? doc : d));
    set({ documents });
    await persist(KEYS.documents, documents);
  },

  deleteDocuments: async (ids) => {
    const documents = get().documents.filter((d) => !ids.includes(d.id));
    set({ documents });
    await persist(KEYS.documents, documents);
  },

  replacePage: async (documentId, page) => {
    const documents = get().documents.map((d) =>
      d.id === documentId
        ? { ...d, pages: d.pages.map((p) => (p.id === page.id ? page : p)) }
        : d,
    );
    set({ documents });
    await persist(KEYS.documents, documents);
  },
}));

export function nextId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultTitle() {
  const now = new Date();
  return `Scan ${now.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })} ${now.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

export function filterLabel(filter: ScanFilter) {
  return (
    {
      original: 'Original',
      magic: 'Auto',
      grayscale: 'Grayscale',
      bw: 'B&W',
      enhance: 'Sharp',
    } as const
  )[filter];
}
