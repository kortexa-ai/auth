import { useState, type ReactNode, type PropsWithChildren, useCallback, useEffect, useMemo } from 'react';
import { LogIn, X } from 'lucide-react'; // LogIn might be used for a loading spinner
import { Button } from './ui/button';
import { LoginForm } from './LoginForm';
import type { SupportedProviders } from '../auth/types';
import { useAuth } from '../auth/hooks/useAuth';
import { LinkForm } from './LinkForm';

interface LoginViewProps {
    title?: ReactNode;
    background?: ReactNode;
    defaultProvider?: SupportedProviders;
    enabledProviders?: SupportedProviders[];
}

/**
 * Handles authentication flow. Renders children if authenticated or anonymous access is allowed.
 * Otherwise, displays a login/linking UI based on auth state (forceLogin, linkCredential, etc.).
 */
export function LoginView({
    title,
    background,
    defaultProvider,
    enabledProviders,
    children,
}: PropsWithChildren<LoginViewProps>) {
    const {
        currentUser,
        mode,
        allowAnonymous,
        forceLogin,
        linkCredential,
        loginWithProvider,
        loginWithSSO,
        clearForceLogin,
        loading: authIsLoading, // loading state from the auth context
    } = useAuth();

    const [localErrorState, setLocalErrorState] = useState<{ showError: boolean; errorMessage: string }>({
        showError: false,
        errorMessage: '',
    });

    // Determine if the main login UI (modal/card) should be visible
    const isLoginUIActive = useMemo(() => {
        return forceLogin || !!linkCredential || (!allowAnonymous && !currentUser);
    }, [forceLogin, linkCredential, allowAnonymous, currentUser]);

    // Determine if children (authenticated content) should be shown
    const shouldShowChildren = useMemo(() => {
        // If allowAnonymous is true, children are always shown (potentially under the login form).
        // If allowAnonymous is false, children are shown only when the login UI is not active and there's a user.
        return allowAnonymous || (!isLoginUIActive && !!currentUser);
    }, [allowAnonymous, isLoginUIActive, currentUser]);

    const shouldShowLinkForm = useMemo(() => isLoginUIActive && !!linkCredential, [isLoginUIActive, linkCredential]);
    const shouldShowLoginFormCore = useMemo(() => isLoginUIActive && !linkCredential, [isLoginUIActive, linkCredential]);

    // Effect for automatic SSO login if in sso-consumer mode
    useEffect(() => {
        if (shouldShowLoginFormCore && mode === 'sso-consumer' && !authIsLoading && !localErrorState.showError) {
            (async () => {
                try {
                    setLocalErrorState({ showError: false, errorMessage: '' }); // Clear previous errors
                    await loginWithSSO();
                    // On success, currentUser will update, isLoginUIActive will become false, children will show.
                } catch (err) {
                    setLocalErrorState({
                        showError: true,
                        errorMessage: err instanceof Error ? err.message : 'SSO login failed. Please try again.',
                    });
                }
            })();
        }
    }, [shouldShowLoginFormCore, mode, loginWithSSO, authIsLoading, localErrorState.showError, setLocalErrorState]);

    // Effect for automatic login with defaultProvider
    useEffect(() => {
        if (shouldShowLoginFormCore && defaultProvider && mode !== 'sso-consumer' && !authIsLoading && !localErrorState.showError) {
            (async () => {
                try {
                    setLocalErrorState({ showError: false, errorMessage: '' }); // Clear previous errors
                    await loginWithProvider(defaultProvider);
                    // On success, currentUser will update, isLoginUIActive will become false, children will show.
                } catch (err) {
                    setLocalErrorState({
                        showError: true,
                        errorMessage: err instanceof Error ? err.message : `Login with ${defaultProvider} failed. Please try again.`,
                    });
                }
            })();
        }
    }, [shouldShowLoginFormCore, defaultProvider, mode, loginWithProvider, authIsLoading, localErrorState.showError, setLocalErrorState]);

    const handleCloseLoginUI = useCallback(() => {
        clearForceLogin();
        setLocalErrorState({ showError: false, errorMessage: '' });
    }, [clearForceLogin, setLocalErrorState]);

    // Effect for 'Escape' key to close login UI
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isLoginUIActive) {
                handleCloseLoginUI();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isLoginUIActive, handleCloseLoginUI]);

    const onLoginFormError = useCallback((error?: string) => {
        setLocalErrorState({
            showError: true,
            errorMessage: error ?? 'Login failed from form. Please try again.',
        });
    }, [setLocalErrorState]);

    // Determine if the manual LoginForm (with provider buttons, etc.) should be shown
    const showManualLoginForm = useMemo(() => {
        if (authIsLoading || !shouldShowLoginFormCore || mode === 'sso-consumer') {
            return false;
        }
        // Show form if no default provider was specified, OR if there was a defaultProvider attempt that resulted in an error.
        return !defaultProvider || localErrorState.showError;
    }, [authIsLoading, shouldShowLoginFormCore, mode, defaultProvider, localErrorState.showError]);

    // If allowAnonymous is false, and we should show children, then we *only* show children.
    // This handles the case where the user is logged in and no login UI is forced.
    if (!allowAnonymous && shouldShowChildren) {
        return <>{children}</>;
    }

    // In all other cases (allowAnonymous is true, or login UI is active),
    // we render the main layout which might include children and/or the login UI.
    return (
        <div className="flex h-screen w-screen relative">
            {/* Render children if:
                1. Anonymous access is allowed (they can act as background or main content).
                2. OR if anonymous is not allowed, but user is authenticated and login UI is not active (handled by the early return above, but this condition is for clarity if that changes).
                   Actually, shouldShowChildren already covers this: allowAnonymous || (!isLoginUIActive && !!currentUser)
            */}
            {shouldShowChildren && (
                <>{children}</>
            )}

            {/* Login UI (Modal) - Renders only if isLoginUIActive is true */}
            {/* This will overlay children if allowAnonymous is true and children are also rendered. */}
            {isLoginUIActive && (
                <div className="absolute inset-0 h-screen w-screen overflow-hidden">
                    {/* Background Layer */}
                    {background}
                    {/* Centered Content Layer */}
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                        {/* Animated Card */}
                        <div
                            className={`
                            relative bg-white rounded-xl shadow-2xl overflow-hidden ring-1 ring-zinc-200/50
                            transition-all duration-300 ease-out
                            w-full max-w-sm p-6 sm:p-8
                            ${isLoginUIActive ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
                        `}
                        >
                            {/* Card Header */}
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-semibold text-zinc-800">
                                    {shouldShowLinkForm ? 'Link Account' : title || 'Login Required'}
                                </h2>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleCloseLoginUI}
                                    className="text-zinc-500 hover:text-zinc-700"
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>

                            {/* Card Content: Loader, Forms, or Error Message */}
                            {authIsLoading && (
                                <div className="flex justify-center items-center py-8">
                                    <LogIn className="h-8 w-8 animate-spin text-blue-600" />
                                </div>
                            )}

                            {!authIsLoading && (
                                <>
                                    {showManualLoginForm && <LoginForm onLoginError={onLoginFormError} enabledProviders={enabledProviders} />}
                                    {shouldShowLinkForm && <LinkForm /> /* Assuming LinkForm handles its own errors or doesn't need onLoginError */}

                                    {localErrorState.showError && (
                                        <div className="mt-4 text-center text-sm text-red-600 bg-red-50 p-3 rounded-md">
                                            {localErrorState.errorMessage}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}