// types.ts
import type { Auth, AuthProvider, User } from 'firebase/auth';
import { GithubAuthProvider, GoogleAuthProvider } from 'firebase/auth';

export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({ prompt: 'select_account' });

export const githubAuthProvider = new GithubAuthProvider();

export const SUPPORTED_PROVIDERS = ['google', 'github'] as const;
export type SupportedProviders = typeof SUPPORTED_PROVIDERS[number];

export const AuthProviders = new Map<SupportedProviders | 'email', AuthProvider | null>([
    ['google', googleAuthProvider],
    ['github', githubAuthProvider],
    ['email', null]
]);

export const AUTH_MODES = ['standalone', 'sso-provider', 'sso-consumer'] as const;
export type AuthMode = typeof AUTH_MODES[number];

export interface AuthState {
    currentUser: User | null;
    token: string;
    loading: boolean;
    mode: AuthMode;
}

export interface AuthProviderProps {
    auth: Auth;
    loginRedirect?: string;
    loginServer?: string;
}

export interface AuthContextType extends AuthState {
    loginWithSSO: () => Promise<void>;
    loginWithProvider: (provider: SupportedProviders) => Promise<void>;
    loginWithEmailAndPassword: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

export interface SSOResponse {
    token: string;
}
