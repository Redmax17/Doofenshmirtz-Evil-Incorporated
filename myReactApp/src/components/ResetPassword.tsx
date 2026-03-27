// Used To Reset Password Using Reset Code Sent From ForgotPassword.tsx

import { useState } from 'react';
import { confirmResetPassword } from 'aws-amplify/auth';

interface resetPasswordProps {
    // Email Passed From ForgotPassword
    email: string;

    // Callback When Reset Is Complete So Parent Can Redirect To Login
    onSuccess: () => void;
}

export default function ResetPassword({ email, onSuccess }: resetPasswordProps) {
    const [code, setCode] = useState<string>("");
    const [newPassword, setNewPassword] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);

    const handleResetPassword = async (): Promise<void> => {
        setError("");
        setLoading(true);

        try {
            // confirmResetPassword Needs The Email, Reset Code, And New Password
            await confirmResetPassword({
                username: email,
                confirmationCode: code,
                newPassword
            })

            // Notify The Parent Of Success
            onSuccess();
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An Unexpected Error Occurred.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h2>Reset Password</h2>
            <p>A Reset Code Was Sent To <strong>{email}</strong>. It Expires In 15 Minutes</p>

            {/* Input For 6-digit Code Send To Email */}
            <input
                type="text"
                placeholder='Enter Rest Code'
                value={code}
                onChange={(e) => setCode(e.target.value)}
            />

            {/* Input For The New Password The User Wants */}
            <input
                type="password"
                placeholder='New Password'
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
            />

            <button onClick={handleResetPassword} disabled={loading}>
                {loading ? "Reseting..." : "Password Reset!"}
            </button>

            {error && <p> {error} </p>}
        </div>
    )

}