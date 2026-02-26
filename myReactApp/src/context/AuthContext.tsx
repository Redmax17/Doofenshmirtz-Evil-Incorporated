//Creates a React Context that manages authentication state accross the app

//Import Authentication Libraries
import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
    signIn as amplifySignIn,
    signOut as amplifySignOut,
    getCurrentUser,
    AuthUser
} from 'aws-amplify/auth';
import type { AuthContextType, SignInResult } from '../types/auth';

//Create the Auth Context initialy undefined
const AuthContext = createContext<AuthContextType | undefined>(undefined);
//Properties for AuthProvider
interface AuthProviderProps {
    childern: ReactNode; //Child component that will have access to auth context
}

//AuthProvider Component
//Wraps app and provides authentication state to all childern
export function AuthProvider({ childern }: AuthProviderProps): React.ReactElement {
    //Track the current user and auth state
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

    //Loading prevents UI flash while checking for existing session
    const [loading, setLoading] = useState<boolean>(true);

    //Check for an existing session on app load
    // this keeps persistence across page refreshes
    useEffect(() => {
        checkUser();
    })

    //Check if user is already authenticated
    // called on app startup to restore session from localStorage
    async function checkUser(): Promise<void> {
        try {
            //Attempt to get the currently authenticated user
            //This automatically checks localStorage for existing tokens
            const currentUser = await getCurrentUser();

            //If user found we update the state
            setUser(currentUser);
            setIsAuthenticated(true);
            console.log('Session restored for user:', currentUser.username);
        } catch (error) {
            //If no session exists
            setUser(null);
            setIsAuthenticated(false);
            console.log('No existing session found');
        } finally {
            //Mark loading as complete so UI can render
            setLoading(false);
        }
    }

    //Sign in a user with email and password
    async function signIn(email: string, password: string): Promise<SignInResult> {
        try {
            //Attempt authentication with Cognito
            await amplifySignIn({
                username: email,
                password: password,
                options: {
                    authFlowType: 'USER_PASSWORD_AUTH'
                }
            });

            //Get the authenticatied user details
            const currentUser = await getCurrentUser();

            //Update state to reflect logged in status
            setUser(currentUser);
            setIsAuthenticated(true);

            return {success: true, user: currentUser };
        } catch (error: any) {
            //If authentication failed we return an error message
            let errorMessage = error.message || 'An error has occurred during sign in';
            
            //Changes based on common errors
            if (error.name === 'UserNotFoundException') {
                errorMessage = 'User does not exist';
            } else if (error.name === 'NotAuthorizedException') {
                errorMessage = 'Incorrect username or password';
            } else if (error.name === 'UserNotConfirmedException') {
                errorMessage = 'Please verify your email address';
            }

            return { success: false, error: errorMessage };
        }
    }

    //Sign out the current user
    async function signOut(): Promise<void> {
        try {
            //Clear the Cognito session
            await amplifySignOut();

            //Update state to logged out status
            setUser(null);
            setIsAuthenticated(false);

            console.log('User signed out successfully');
        } catch (error) {
            console.error('Error signing out', error);
            throw error;
        }
    }
        
    //Context value object
    const value: AuthContextType = {
        user,
        isAuthenticated,
        loading,
        signIn,
        signOut
    }

    //render childern when loading is complete
    // Prevents protected routes from flashing before we know auth status
    return (
        <AuthContext.Provider value = {value}>
            {!loading && childern}
        </AuthContext.Provider>
    );
}

//Custom hook for accessing the auth context
export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}