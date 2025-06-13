import type { PropsWithChildren } from "react";
import { useAuth } from "./hooks/useAuth";

export interface AuthBoundaryProps {
    anonymous?: React.ReactNode;
}

export function AuthBoundary({ anonymous = null, children }: PropsWithChildren<AuthBoundaryProps>) {
    const { currentUser } = useAuth();
    return (
        currentUser ? children : anonymous
    );
}