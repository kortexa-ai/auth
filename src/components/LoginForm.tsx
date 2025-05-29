import { useCallback, useState, type FormEvent } from 'react';
import { SiGithub, SiGoogle } from '@icons-pack/react-simple-icons';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { AuthProviders, type SupportedProviders } from '../auth/types';
import { useAuth } from '../auth/hooks/useAuth';

interface LoginProps {
    enabledProviders?: SupportedProviders[];
    onLoginError: (error?: string) => void;
}

export function LoginForm({ enabledProviders, onLoginError }: LoginProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const { loginWithProvider, loginWithEmailAndPassword, clearForceLogin } = useAuth();

    const handleSubmit = useCallback(async (e: FormEvent) => {
        e.preventDefault();
        try {
            await loginWithEmailAndPassword(email, password);
        } catch (err) {
            onLoginError((err as Error).message);
        }
    }, [email, password, loginWithEmailAndPassword, onLoginError]);

    const handleLogin = useCallback(async (provider: SupportedProviders) => {
        try {
            await loginWithProvider(provider);
        } catch (err) {
            onLoginError((err as Error).message);
        }
    }, [loginWithProvider, onLoginError]);

    const handleReset = useCallback((e: FormEvent) => {
        e.preventDefault();
        clearForceLogin();
        setEmail('');
        setPassword('');
    }, [clearForceLogin]);

    const showEmailForm = enabledProviders && enabledProviders.includes('email') && AuthProviders.has('email');
    const showSocialButtons = enabledProviders && enabledProviders.some(p => p !== 'email' && AuthProviders.has(p));

    return (
        <div className="w-full">
            {showEmailForm && (
                <form onSubmit={handleSubmit} onReset={handleReset} className="space-y-4">
                    <div className="space-y-1">
                        <Input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(ev) => setEmail(ev.target.value)}
                            className="w-full border-zinc-300 focus:border-zinc-400 focus:ring-zinc-400 transition-all duration-200"
                            required
                        />
                    </div>
                    <div className="space-y-1">
                        <Input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(ev) => setPassword(ev.target.value)}
                            className="w-full border-zinc-300 focus:border-zinc-400 focus:ring-zinc-400 transition-all duration-200"
                            required
                        />
                    </div>
                    <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-sm"
                    >
                        Log In
                    </Button>
                </form>
            )}

            {showEmailForm && showSocialButtons && (
                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-zinc-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="bg-white px-2 text-zinc-500">Or continue with</span>
                    </div>
                </div>
            )}

            {/* Social Buttons */}
            <div className="space-y-3">
                {enabledProviders && enabledProviders.includes('google.com') && AuthProviders.has('google.com') && (
                    <Button
                        variant="outline"
                        onClick={() => handleLogin('google.com')}
                        className="w-full flex items-center justify-center gap-2 border-zinc-300 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition-all duration-200"
                    >
                        <SiGoogle className="w-5 h-5 text-red-500" />
                        Sign in with Google
                    </Button>
                )}
                {enabledProviders && enabledProviders.includes('github.com') && AuthProviders.has('github.com') && (
                    <Button
                        variant="outline"
                        onClick={() => handleLogin('github.com')}
                        className="w-full flex items-center justify-center gap-2 border-zinc-300 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition-all duration-200"
                    >
                        <SiGithub className="w-5 h-5 text-gray-800" />
                        Sign in with GitHub
                    </Button>
                )}
                {/* Add other social providers here, e.g., Twitter, Apple, checking enabledProviders and AuthProviders.has() */}
                {/* Example for Twitter/X - ensure SiX is imported if used */}
                {/* {enabledProviders && (enabledProviders.includes('twitter.com') || enabledProviders.includes('x.com')) && (AuthProviders.has('twitter.com') || AuthProviders.has('x.com')) && (
                    <Button
                        variant="outline"
                        onClick={() => handleLogin('x.com')} // Or 'twitter.com' based on what's in AuthProviders map key
                        className="w-full flex items-center justify-center gap-2 border-zinc-300 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition-all duration-200"
                    >
                        <SiX className="w-5 h-5 text-blue-500" />
                        Sign in with X
                    </Button>
                )} */}
            </div>
        </div>
    );
}