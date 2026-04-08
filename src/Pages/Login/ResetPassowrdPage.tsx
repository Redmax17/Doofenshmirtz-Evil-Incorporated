// Page To Display Password Reset 

import { useState } from 'react';
import ForgotPassword from '../../components/ForgotPassword';
import ResetPassword from '../../components/ResetPassword';

// Tracks Which Step Of The Reset Flow The User Is On
type ResetStep = "forgot" | "reset" | "done";

export default function ResetPasswordPage() {
    const [step, setStep] = useState<ResetStep>("forgot");
    // Store The Email So User Doesn't Need To Retype
    const [email, setEmail] = useState<string>("");

    const handleCodeSent = (sentEmail: string): void => {
        // Save The Email
        setEmail(sentEmail);
        //Advance To Reset Step
        setStep("reset");
    }

    const handleResetSuccess = (): void => {
        // Advance To Done Step
        setStep("done");
    }

    return (
        <div>
            {/* Enter Email To Recveive Rest Code */}
            {step === "forgot" && (
                <ForgotPassword onCodeSent={handleCodeSent} />
            )};

            {/* Enter The Code From The Email And The New Password */}
            {step === "reset" && (
                <ResetPassword email={email} onSuccess={handleResetSuccess} />
            )}

            {step === "done"} && (
            <div>
                <h2>Password Rest Successful</h2>
                <p>Your Password Has Been Reset! You Can Now Log In</p>
                <a href='/Login.tsx'>Go To Login</a>
            </div>
            )
        </div>
    )
}