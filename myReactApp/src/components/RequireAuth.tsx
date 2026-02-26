//Route Component
//This component act as a gatekeeper for routes that require
// authentication
//If the user is authenticated, it renders the childern
//If not it redirects to the login page

import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { RequireAuthProps } from '../types/auth';

export const RequireAuth: React.FC<RequireAuthProps> = ({
    children,
    redirectTo = '/login'
}) => {
    //Get auth state from our context
    const { isAuthenticated, loading } = useAuth();
    //React router hooks for navigation
    const navigate = useNavigate();
    const location = useLocation();

    //Redirect to login if not authenticated
    //Saves the current location so we can rediect back after login
    useEffect(() => {
        if (!loading && !isAuthenticated) {
            navigate(redirectTo, {
                replace: true,
                state: { from: location.pathname }
            });
        }
    }, [isAuthenticated, loading, navigate, redirectTo, location]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-lg">Checking authentication...</div>
            </div>
        );
    }

    //Render childern if authenticated
    return isAuthenticated ? <>{children}</> : null;
};