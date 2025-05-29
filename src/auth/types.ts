// types.ts
import type { Auth, User } from "firebase/auth";
import {
    GithubAuthProvider,
    GoogleAuthProvider,
    TwitterAuthProvider,
    OAuthProvider,
    type OAuthCredential,
} from "firebase/auth";

export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({ prompt: "select_account" });
googleAuthProvider.addScope("profile");
googleAuthProvider.addScope("email");

export const githubAuthProvider = new GithubAuthProvider();
githubAuthProvider.addScope("profile");
githubAuthProvider.addScope("email");

export const twitterAuthProvider = new TwitterAuthProvider();
twitterAuthProvider.addScope("profile");
twitterAuthProvider.addScope("email");

export const appleAuthProvider = new OAuthProvider("apple.com");
appleAuthProvider.addScope("profile");
appleAuthProvider.addScope("email");

export const SUPPORTED_PROVIDERS = [
    "google.com",
    "github.com",
    "twitter.com",
    "x.com",
    "apple.com",
    "email",
] as const;
export type SupportedProviders = (typeof SUPPORTED_PROVIDERS)[number];

export const AuthProviders = new Map<
    SupportedProviders,
    GoogleAuthProvider | GithubAuthProvider | TwitterAuthProvider | OAuthProvider | null
>([
    ["google.com", googleAuthProvider],
    ["github.com", githubAuthProvider],
    ["twitter.com", twitterAuthProvider],
    ["x.com", twitterAuthProvider],
    ["apple.com", appleAuthProvider],
    ["email", null],
]);

export const AUTH_MODES = [
    "standalone",
    "sso-provider",
    "sso-consumer",
] as const;
export type AuthMode = (typeof AUTH_MODES)[number];

export interface AuthState {
    currentUser: User | null;
    token: string;
    loading: boolean;
    mode: AuthMode;
    allowAnonymous: boolean;
    forceLogin: boolean;
    linkCredential: OAuthCredential | null;
}

/**
 * Auth context type
 * @method login - Force the login flow when anonymous access is allowed
 * @method loginWithSSO - Login with SSO
 * @method loginWithProvider - Login with a provider
 * @method loginWithEmailAndPassword - Login with email and password
 * @method link - Link a provider to the current user
 * @method logout - Logout
 * @method clearForceLogin - Clear the force login state
 */
export interface AuthContextType extends AuthState {
    login: () => void;
    loginWithSSO: () => Promise<void>;
    loginWithProvider: (provider: SupportedProviders) => Promise<void>;
    loginWithEmailAndPassword: (
        email: string,
        password: string
    ) => Promise<void>;
    link: () => Promise<void>;
    logout: () => Promise<void>;
    clearForceLogin: () => void;
}

export interface SSOResponse {
    token: string;
}

/**
 * Props for the AuthProvider component
 * @param auth Firebase Auth instance
 * @param loginRedirect Optional redirect URL to SSO provider for SSO login
 * @param loginServer Optional login server URL for SSO token exchange
 * @param allowAnonymous Optional flag to allow anonymous access
 *
 * loginRedirect and loginServer can't be used together
 * If loginRedirect is provided, the component will act as SSO consumer
 * If loginServer is provided, the component will act as SSO provider
 */
export interface AuthProviderProps {
    auth: Auth;
    loginRedirect?: string;
    loginServer?: string;
    allowAnonymous?: boolean;
}
