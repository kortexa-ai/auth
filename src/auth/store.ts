import { create } from 'zustand';
import type { AuthContextType, AuthState, SupportedProviders } from './types';

// Initialize store with empty values
const initialState: AuthState = {
  currentUser: null,
  token: "",
  loading: true,
  mode: 'standalone',
};

// Create auth store with zustand
export const useAuthStore = create<AuthContextType>(() => ({
  ...initialState,

  // Auth actions
  loginWithSSO: async () => {
    throw new Error('Auth store not initialized with AuthProvider');
  },
  loginWithProvider: async (_provider: SupportedProviders) => {
    throw new Error('Auth store not initialized with AuthProvider');
  },
  loginWithEmailAndPassword: async (_email: string, _password: string) => {
    throw new Error('Auth store not initialized with AuthProvider');
  },
  logout: async () => {
    throw new Error('Auth store not initialized with AuthProvider');
  },
}));

// Method to update the store from AuthProvider
export const updateAuthStore = (authContext: AuthContextType) => {
  useAuthStore.setState(authContext);
};