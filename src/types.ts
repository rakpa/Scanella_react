export type ScanFilter = 'original' | 'magic' | 'grayscale' | 'bw' | 'enhance';

export const FILTERS: { id: ScanFilter; label: string }[] = [
  { id: 'original', label: 'Original' },
  { id: 'magic', label: 'Auto' },
  { id: 'grayscale', label: 'Grayscale' },
  { id: 'bw', label: 'B&W' },
  { id: 'enhance', label: 'Sharp' },
];

export type ScanPage = {
  id: string;
  path: string;
  originalPath?: string;
  filter: ScanFilter;
  brightness: number;
  contrast: number;
};

export type ScanDocument = {
  id: string;
  title: string;
  createdAt: string;
  pages: ScanPage[];
  edgesAlreadyApplied?: boolean;
};

export type AuthState = {
  name?: string;
  email?: string;
  signedIn: boolean;
};

export type AppSettings = {
  themeMode: 'light' | 'dark' | 'system';
  autoCapture: boolean;
  defaultFilter: ScanFilter;
  shutterSound: boolean;
  useInAppCamera: boolean;
};
