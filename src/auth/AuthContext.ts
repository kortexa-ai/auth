import { createContext } from 'react';
import type { AuthContextType } from './types';

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);
AuthContext.displayName = 'kortexa.ai:auth';
