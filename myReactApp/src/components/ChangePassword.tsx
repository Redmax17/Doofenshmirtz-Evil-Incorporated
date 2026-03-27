import { useState } from "react";
import { updatePassword } from "aws-amplify/auth";

// Define the shape of the form state
interface PasswordForm {
    oldPassword: string;
    newPassword: string;
}

export default function ChangePassword() {
    // Form Field State
    const [form, setForm] = useState<PasswordForm>({
        oldPassword: "",
        newPassword: "",
    });

    // Feed Back Message For Success And Error
    const [message, setMessage] = useState<string>("");
    const [error, setError] = useState<string>("");

    // Loading State To Disable Button During API Call
    const [loading, setLoading] = useState<boolean>(false);

    // Input Change Handler For Updating Fields By Name
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    // Submits The Password Change Request To AWS Cognito via Amplify
    const handleChangePassword = async (): Promise<void> => {
        setMessage("");
        setError("");
        setLoading(true);

        try {
            // updatePassword takes oldPassword and newPassword
            await updatePassword({
                oldPassword: form.oldPassword,
                newPassword: form.newPassword
            });

            // On Success Clear And Show Confirmation
            setMessage("Password updated successfully!");
            setForm({ oldPassword: "", newPassword: "" });
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An Error Occureced When Attempting To Update Password.");
            }
        } finally {
            // Re-enable the button
            setLoading(false);
        }
    };

    return (
        <div>
            <h2>Change Password</h2>

            {/* Input For Current Password */}
            <input
                type="password"
                name="oldPassword"
                placeholder="Current Password"
                value={form.oldPassword}
                onChange={handleChange}
            />

            {/* Input For New Password */}
            <input
                type="password"
                name="newPassword"
                placeholder="New Password"
                value={form.newPassword}
                onChange={handleChange}
            />

            {/* Summit Button, Disabled While The Request Is Being Processed */}
            <button onClick={handleChangePassword} disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
            </button>

            {/* Success Message */}
            {message && <p> {message} </p>}

            {/* Error Message, Reflects Cognito Policy Too */}
            {error && <p> {error} </p>}
        </div>
    );
}