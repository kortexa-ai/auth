// types.ts
import type { Auth, AuthProvider, User } from 'firebase/auth';
import { GithubAuthProvider, GoogleAuthProvider, TwitterAuthProvider } from 'firebase/auth';

export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({ prompt: 'select_account' });

export const githubAuthProvider = new GithubAuthProvider();

export const twitterAuthProvider = new TwitterAuthProvider();

export const SUPPORTED_PROVIDERS = ['google', 'github', 'twitter', 'apple'] as const;
export type SupportedProviders = typeof SUPPORTED_PROVIDERS[number];

export const AuthProviders = new Map<SupportedProviders | 'email', AuthProvider | null>([
    ['google', googleAuthProvider],
    ['github', githubAuthProvider],
    ['twitter', twitterAuthProvider],
    ['apple', null],
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

/**
 * Props for the AuthProvider component
 * @param auth Firebase Auth instance
 * @param loginRedirect Optional redirect URL to SSO provider for SSO login
 * @param loginServer Optional login server URL for SSO token exchange
 *
 * loginRedirect and loginServer can't be used together
 * If loginRedirect is provided, the component will act as SSO consumer
 * If loginServer is provided, the component will act as SSO provider
 */
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
