import { useContext } from 'react';
import type { AuthContextType } from '../types';
import { AuthContext } from '../AuthContext';

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);

    if (!context) throw new Error('useAuth must be used within an AuthProvider');

    return context;
}