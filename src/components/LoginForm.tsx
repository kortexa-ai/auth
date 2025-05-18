import { SiGithub, SiGoogle } from '@icons-pack/react-simple-icons';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useState, type FormEvent } from 'react';
import { AuthProviders, type SupportedProviders } from '../auth/types';
import { useAuth } from '../auth/hooks/useAuth';

interface LoginProps {
    onLoginError: (error?: string) => void;
}

export function LoginForm({ onLoginError }: LoginProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const { loginWithProvider, loginWithEmailAndPassword } = useAuth();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await loginWithEmailAndPassword(email, password);
        } catch (err) {
            onLoginError((err as Error).message);
        }
    };

    const handleLogin = async (provider: SupportedProviders) => {
        try {
            await loginWithProvider(provider);
        } catch (err) {
            onLoginError((err as Error).message);
        }
    };

    return (
        <div className="w-full max-w-md p-6 bg-white rounded-xl shadow-md ring-1 ring-zinc-200/50">
            {AuthProviders.has('email') && (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <Input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full border-zinc-300 focus:border-zinc-400 focus:ring-zinc-400 transition-all duration-200"
                            required
                        />
                    </div>
                    <div className="space-y-1">
                        <Input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
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

            {/* Divider for social logins */}
            {(AuthProviders.has('google') || AuthProviders.has('github')) && (
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
                {AuthProviders.has('google') && (
                    <Button
                        variant="outline"
                        onClick={() => handleLogin('google')}
                        className="w-full flex items-center justify-center gap-2 border-zinc-300 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition-all duration-200"
                    >
                        <SiGoogle className="w-5 h-5 text-red-500" />
                        Sign in with Google
                    </Button>
                )}
                {AuthProviders.has('github') && (
                    <Button
                        variant="outline"
                        onClick={() => handleLogin('github')}
                        className="w-full flex items-center justify-center gap-2 border-zinc-300 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition-all duration-200"
                    >
                        <SiGithub className="w-5 h-5 text-gray-800" />
                        Sign in with GitHub
                    </Button>
                )}
            </div>
        </div>
    );
}