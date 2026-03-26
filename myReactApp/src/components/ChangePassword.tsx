import { useState } from "react";
import { updatePassword } from "aws-amplify/auth";

// Define the shape of the form state
interface PasswordForm {
    oldPassword: string;
    newPassword: string;
}

