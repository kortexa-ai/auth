import { useState, type ReactNode, type PropsWithChildren, useCallback } from 'react';
import { LogIn, X } from 'lucide-react';
import { Button } from './ui/button';
import { LoginForm } from './LoginForm';
import type { SupportedProviders } from '../auth/types';
import { useAuth } from '../auth/hooks/useAuth';

interface LoginViewProps {
    title: ReactNode;
    defaultProvider?: SupportedProviders;
    background?: ReactNode;
}

interface LoginState {
    showForm: boolean;
    showError: boolean;
    errorMessage: string;
    isLoading: boolean;
}

/**
 * Handles authentication flow with an animated in-place login form
 * The white card background collapses/expands with the form using Tailwind Animate
 * Login button toggles form visibility with refined animations
 */
export function LoginView({
    title,
    defaultProvider,
    background,
    children,
}: PropsWithChildren<LoginViewProps>) {
    const [loginState, setLoginState] = useState<LoginState>({
        showForm: false,
        showError: false,
        errorMessage: '',
        isLoading: false,
    });

    const { currentUser, mode, loginWithProvider, loginWithSSO } = useAuth();

    const onLoginClick = useCallback(async () => {
        if (mode === 'sso-consumer') {
            setLoginState((prev) => ({ ...prev, isLoading: true }));
            await loginWithSSO();
            setLoginState((prev) => ({ ...prev, isLoading: false }));
        } else if (!defaultProvider) {
            setLoginState((prev) => ({
                ...prev,
                showForm: !prev.showForm,
                showError: false, // Reset error on toggle
            }));
        } else {
            setLoginState((prev) => ({ ...prev, isLoading: true }));
            try {
                await loginWithProvider(defaultProvider);
            } catch (err) {
                setLoginState((prev) => ({
                    ...prev,
                    showError: true,
                    errorMessage: err instanceof Error ? err.message : 'Login failed',
                }));
            } finally {
                setLoginState((prev) => ({ ...prev, isLoading: false }));
            }
        }
    }, [defaultProvider, mode, loginWithSSO, loginWithProvider]);

    const onLoginError = useCallback((error?: string) => {
        setLoginState((prev) => ({
            ...prev,
            showError: true,
            errorMessage: error ?? 'Login failed',
        }));
    }, []);

    if (currentUser) return children;

    return (
        <div className="relative h-screen w-screen overflow-hidden">
            {/* Background Layer (unchanged full size) */}
            {background && (
                <div className="absolute inset-0 z-0">
                    {background}
                </div>
            )}

            {/* Foreground Content */}
            <div className="relative z-10 h-full flex items-center justify-center">
                <div
                    className={`
                        bg-white/90
                        backdrop-blur-md
                        rounded-2xl
                        shadow-xl
                        max-w-md
                        w-full
                        mx-4
                        border border-white/30
                        transition-all duration-500 ease-in-out delay-150
                        ${loginState.showForm
                            ? 'scale-100 opacity-100 px-6 pt-6 pb-6'
                            : 'scale-90 opacity-90 px-4 py-3 flex items-center justify-center'}
                    `}
                >
                    <div className={`flex flex-col items-center gap-4 ${!loginState.showForm ? 'w-full' : ''}`}>
                        <div className={`flex items-center gap-3 ${!loginState.showForm ? 'justify-center' : ''}`}>
                            <h1 className="text-3xl font-mono text-zinc-800">{title}</h1>
                            <Button
                                onClick={onLoginClick}
                                variant="ghost"
                                size="icon"
                                className={`
                                    rounded-full hover:bg-zinc-100 hover:shadow-lg hover:scale-110
                                    transition-all duration-300
                                    ${loginState.showForm ? 'rotate-180' : 'rotate-0'}
                                `}
                                disabled={loginState.isLoading}
                            >
                                {loginState.showForm ? (
                                    <X
                                        className={`
                                            h-5 w-5 ${loginState.isLoading ? 'animate-spin' : 'animate-pulse'}
                                            text-zinc-600 hover:text-red-500 transition-colors
                                        `}
                                    />
                                ) : (
                                    <LogIn
                                        className={`
                                            h-5 w-5 ${loginState.isLoading ? 'animate-spin' : 'animate-pulse'}
                                            text-zinc-600 hover:text-blue-500 transition-colors
                                        `}
                                    />
                                )}
                            </Button>
                        </div>

                        {loginState.showForm && (
                            <div
                                className={`
                                    transition-all duration-300 ease-in-out
                                    ${loginState.showForm
                                        ? 'opacity-100 translate-y-0 scale-100'
                                        : 'opacity-0 translate-y-4 scale-95 pointer-events-none h-0'}
                            `}
                            >
                                <LoginForm onLoginError={onLoginError} />
                                <div
                                    className={`
                                    transition-all duration-200 ease-in-out
                                    ${loginState.showError
                                            ? 'opacity-100 translate-x-0'
                                            : 'opacity-0 -translate-x-4 pointer-events-none h-0'}
                                `}
                                >
                                    {loginState.showError && (
                                        <div className="mt-3 px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm text-center shadow-sm">
                                            <span className="font-medium">Oops!</span>{' '}
                                            {loginState.errorMessage || 'Failed to login. Please try again.'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}