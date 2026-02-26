// Import Auth type from AWS Amplify for proper typing
import type { AuthUser } from 'aws-amplify/auth';

//AuthContextType defines the shape of the Authentication context
//This describes everything that will be available to components 
// that use the useAuth() hook
export interface AuthContextType {
    user: AuthUser | null; //Current User, or null if not logged in
    isAuthenticated: boolean;
    loading: boolean;
    //Async function to handel user login with email/password
    signIn: (email: string, password: string) => Promise<SignInResult>;
    //Async function to handle user logout
    signOut: () => Promise<void>;
}

//SignInResult defines the possible return values from the signIn
// function
export interface SignInResult {
    success: boolean; //True if sign in succeeded
    user?: AuthUser; //Authenticated user object if success
    error?: string; //Error message if failure
}

//RequireAuthProps - Props for the protected route component
export interface RequireAuthProps {
    children: React.ReactNode; //The component to render if authenticated
    redirectTo?: string; //Where to redirect if not authenticated
}