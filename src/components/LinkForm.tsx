import { SiGoogle } from '@icons-pack/react-simple-icons';
import { Button } from './ui/button';
import { useAuth } from '../auth/hooks/useAuth';

export function LinkForm() {
    const { link, logout } = useAuth();

    return (
        <div className="w-full max-w-md p-6 bg-white rounded-xl shadow-md ring-1 ring-zinc-200/50">
            <div className="relative my-6">
                <p>You've previously logged in with same email.</p>
                <p>Link your account to continue.</p>
            </div>
            <div className="space-y-3">
                <Button
                    variant="outline"
                    onClick={link}
                    className="w-full flex items-center justify-center gap-2 border-zinc-300 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition-all duration-200"
                >
                    <SiGoogle className="w-5 h-5 text-red-500" />
                    Link
                </Button>
                <Button
                    variant="outline"
                    onClick={logout}
                    className="w-full flex items-center justify-center gap-2 border-zinc-300 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition-all duration-200"
                >
                    Cancel
                </Button>
            </div>
        </div>
    );
}