import { NavigatorScreenParams } from '@react-navigation/native';
import { ScanFilter } from '../types';

export type HomeTabParamList = {
  Documents: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Welcome: undefined;
  Onboarding: undefined;
  Login: undefined;
  Signup: undefined;
  Home: NavigatorScreenParams<HomeTabParamList> | undefined;
  NativeScan: undefined;
  Camera: undefined;
  Crop: {
    imageUri: string;
    originalUri?: string;
    documentId?: string;
    pageId?: string;
    filter?: ScanFilter;
  };
  DocumentDetail: { id: string };
  OcrResult: { text: string };
};
