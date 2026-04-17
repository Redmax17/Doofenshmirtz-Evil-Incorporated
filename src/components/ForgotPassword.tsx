// Used To Send A Password Reset Email For Users Who Can Not Sign In

import { useState } from "react";
import { resetPassword } from "aws-amplify/auth";

interface ForgotPasswordProps {
    // CallBack To Notify Parent That The Email Was Sent Successfully
    onCodeSent: (email: string) => void;
}

export default function ForgotPassword({ onCodeSent }: ForgotPasswordProps) {
    const [email, setEmail] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);

    const handleSendCode = async (): Promise<void> => {
        setError("");
        setLoading(true);

        try {
            // Cognito Sends A Reset Code To The User's Email
            // Code Expires Using The Value Entered Into Cognito Console
            // TODO: Set Expire Time
            await resetPassword({ username: email });

            // Notify The Parent That The Email Was Sent Successfully
            onCodeSent(email);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An Error Has Occurred.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h2>Forgot Password</h2>
            <p>Enter Your Email For Reset Code</p>

            {/* Input For User Email */}
            <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />

            <button onClick={handleSendCode} disabled={loading}>
                {loading ? "Sending..." : "Send Reset Code"}
            </button>

            {error && <p> {error} </p>}
        </div>
    );
}