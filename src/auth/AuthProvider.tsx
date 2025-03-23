import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { signInWithPopup, signInWithCustomToken, signOut, onAuthStateChanged, type User, signInWithEmailAndPassword, browserPopupRedirectResolver } from 'firebase/auth';
import type { AuthMode, AuthProviderProps, AuthState, SSOResponse } from './types';
import { AuthProviders, type SupportedProviders } from './types';
import { AuthContext } from './AuthContext';
import { LoginView } from '../components/LoginView';

/**
 * Universal authentication provider that handles all auth modes:
 * - Standalone: direct Firebase auth with providers or email/password
 * - SSO Provider: handles login and token exchange for other apps
 * - SSO Consumer: receives and processes tokens from SSO provider
 * 
 * Mode selection is automatic based on URL parameters and configuration.
 * This component handles the entire authentication flow and context provision.
 */
export function AuthProvider({ auth, loginRedirect, loginServer, children }: PropsWithChildren<AuthProviderProps>) {
    /**
     * Determine the authentication mode based on URL parameters and props
     * - sso-consumer: When token is in URL or loginRedirect is provided without no_sso param
     * - sso-provider: When returnUrl is in URL
     * - standalone: Default mode when no SSO parameters are present
     */
    const mode = useMemo<AuthMode>(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.has('token')) return 'sso-consumer';
        if (params.has('returnUrl')) return 'sso-provider';
        if (loginRedirect && !params.has('no_sso')) return 'sso-consumer';
        return 'standalone';
    }, [loginRedirect]);

    /**
     * Auth state containing current user, token, loading state and mode
     */
    const [state, setState] = useState<AuthState>({
        currentUser: null,
        token: "",
        loading: true,
        mode: mode,
    });

    /**
     * Builds the base API URL for token exchange requests
     * Handles formatting of API paths to ensure proper structure:
     * - Adds /api/v1 if needed
     * - Ensures proper version path
     * 
     * @returns Formatted API base URL
     */
    const getApiBaseUrl = useCallback(() => {
        const baseUrl = loginServer ?? "https://kortexa.ai";
        const url = new URL(baseUrl);
        
        // Add /api/v1 to the path if it's not already there
        if (!url.pathname.includes('/api')) {
            url.pathname = url.pathname.replace(/\/+$/, '') + '/api/v1';
        } else if (url.pathname.includes('/api')) {
            // If the path includes /api but not a version, add the version
            url.pathname = url.pathname.replace(/\/+$/, '') + '/v1';
        }
        
        // Remove trailing slash for consistency
        return url.toString().replace(/\/$/, '');
    }, [loginServer]);

    /**
     * Creates authorization headers for API requests
     * 
     * @param token JWT token for authorization
     * @returns Headers object with Authorization and Content-Type
     */
    const getHeaders = useCallback((token: string) => ({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    }), []);

    /**
     * Exchanges Firebase token for an SSO token from the SSO server
     * This allows cross-domain authentication between applications
     * 
     * @param token Firebase JWT token
     * @param scope The hostname/scope requesting the token
     * @returns SSO token for the requested scope
     * @throws Error if token exchange fails or response is invalid
     */
    const exchangeToken = useCallback(async (token: string, scope: string) => {
        const baseUrl = getApiBaseUrl();
        const url = `${baseUrl}/sso?scope=${scope}`;
        
        // Make direct fetch request to the SSO endpoint
        const response = await fetch(url, {
            method: 'GET',
            headers: getHeaders(token)
        });

        // Handle error responses
        if (!response.ok) {
            const error = new Error(`API call failed: ${response.statusText}`) as Error & { statusCode?: number };
            error.statusCode = response.status;
            throw error;
        }

        // Parse response JSON
        const data = await response.json() as SSOResponse;
        
        // Validate token in response
        if (!data?.token) {
            throw new Error('Invalid token response from SSO server');
        }

        return data.token;
    }, [getHeaders, getApiBaseUrl]);

    /**
     * Handles redirect flow for SSO provider mode
     * 1. Exchanges token for a scope-specific token
     * 2. Redirects to the return URL with the token
     * 
     * @param token Firebase JWT token
     */
    const handleProviderRedirect = useCallback(async (token: string) => {
        const params = new URLSearchParams(window.location.search);
        const returnUrl = params.get('returnUrl');

        if (returnUrl && mode === 'sso-provider') {
            try {
                // Get custom token for the specific domain
                const customToken = await exchangeToken(token, (new URL(returnUrl)).hostname);
                
                // Redirect back to return URL with token
                const redirectUrl = new URL(returnUrl);
                redirectUrl.searchParams.set('token', customToken);
                window.location.href = redirectUrl.toString();
            } catch (error) {
                throw new Error('Token exchange failed:', { cause: error });
            }
        }
    }, [exchangeToken, mode]);

    /**
     * Initiates SSO login flow by redirecting to the login server
     * Only available in SSO consumer mode
     * 
     * @throws Error if called in standalone or SSO provider mode
     */
    const loginWithSSO = useCallback(async () => {
        if (mode === 'standalone' || mode === 'sso-provider') {
            throw new Error('SSO login not available in current mode');
        }

        // Redirect to login server with current URL as return URL
        const returnUrl = encodeURIComponent(window.location.href);
        window.location.href = `${loginRedirect}?returnUrl=${returnUrl}`;
    }, [mode, loginRedirect]);

    /**
     * Initiates social login with a provider (Google, GitHub, etc.)
     * Not available in SSO consumer mode
     * 
     * @param providerName The provider to use for authentication
     * @throws Error if called in SSO consumer mode or with invalid provider
     */
    const loginWithProvider = useCallback(async (providerName: SupportedProviders) => {
        if (mode === 'sso-consumer') {
            throw new Error('Provider login not available in SSO consumer mode');
        }

        // Get the Firebase auth provider from the map
        const provider = AuthProviders.get(providerName);
        if (!provider) throw new Error(`Invalid provider: ${providerName}`);

        // Trigger Firebase popup authentication
        await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    }, [auth, mode]);

    /**
     * Initiates email/password login
     * Not available in SSO consumer mode
     * 
     * @param email User email
     * @param password User password
     * @throws Error if called in SSO consumer mode
     */
    const loginWithEmailAndPassword = useCallback(async (email: string, password: string) => {
        if (mode === 'sso-consumer') {
            throw new Error('Email/password login not available in SSO consumer mode');
        }

        // Trigger Firebase email/password authentication
        await signInWithEmailAndPassword(auth, email, password);
    }, [auth, mode]);

    /**
     * Signs out the current user
     */
    const logout = useCallback(async () => {
        await signOut(auth);
    }, [auth]);

    /**
     * Main effect for handling auth state changes and SSO token processing
     */
    useEffect(() => {
        let mounted = true;

        /**
         * Processes Firebase auth state changes
         * Updates local state and handles SSO provider redirects
         * 
         * @param user The Firebase user object or null if signed out
         */
        const handleUser = async (user: User | null) => {
            if (!mounted) return;

            if (user) {
                // User is signed in, get token and update state
                const newToken = await user.getIdToken();
                setState(prev => ({
                    ...prev,
                    currentUser: user,
                    token: newToken,
                    loading: false
                }));

                // Handle redirect flow for SSO provider mode
                if (mode === 'sso-provider') {
                    await handleProviderRedirect(newToken);
                }
            } else {
                // User is signed out, clear state
                setState(prev => ({
                    ...prev,
                    currentUser: null,
                    token: "",
                    loading: false
                }));
            }
        };

        /**
         * Processes SSO token from URL parameters
         * Signs in with custom token and cleans up URL
         */
        const handleSSOToken = async () => {
            const params = new URLSearchParams(window.location.search);
            const token = params.get('token');

            if (!token || mode !== 'sso-consumer') return;

            try {
                // Sign in with the custom token
                await signInWithCustomToken(auth, token);
                
                // Clean up URL by removing token parameter
                const cleanUrl = `${window.location.origin}${window.location.pathname}`;
                window.history.replaceState({}, '', cleanUrl);
            } catch (error) {
                console.error('SSO token signin failed:', error);
                setState(prev => ({ ...prev, loading: false }));
            }
        };

        // Subscribe to Firebase auth state changes
        const unsubAuthState = onAuthStateChanged(auth, handleUser);
        
        // Process SSO token if present
        handleSSOToken();

        // Cleanup function
        return () => {
            mounted = false;
            unsubAuthState();
        };
    }, [auth, mode, handleProviderRedirect]);

    /**
     * Context value exposed to consumers
     * Includes current state and authentication methods
     */
    const value = useMemo(() => ({
        ...state,
        loginWithSSO,
        loginWithProvider,
        loginWithEmailAndPassword,
        logout,
        mode
    }), [state, loginWithSSO, loginWithProvider, loginWithEmailAndPassword, logout, mode]);

    // Set display name for debugging purposes
    AuthContext.displayName = `kortexa.ai:auth:${mode}`;

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// Add the Login component as a static property
AuthProvider.Login = LoginView;