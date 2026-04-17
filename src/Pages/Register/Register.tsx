import { useState } from "react";
import { Box, Button, Container, Field, Input, Link, Stack, Text } from "@chakra-ui/react";
import Layout from "../../Shared/Layout";
import PageHeader from "../../Shared/PageHeader";
import { apiClient } from "../../Shared/apiClient";
import { saveAuthResponseValue } from "../../Shared/authStorage";
import type { AuthLoginResponse } from "../../Shared/types";

export default function Register() {
  const [emailValue, setEmailValue] = useState<string>("");
  const [passwordValue, setPasswordValue] = useState<string>("");
  const [confirmPasswordValue, setConfirmPasswordValue] = useState<string>("");
  const [errorTextValue, setErrorTextValue] = useState<string>("");
  const [successTextValue, setSuccessTextValue] = useState<string>("");
  const [isSubmittingValue, setIsSubmittingValue] = useState<boolean>(false);

  async function handleRegisterValue(): Promise<void> {
    setErrorTextValue("");
    setSuccessTextValue("");

    if (passwordValue !== confirmPasswordValue) {
      setErrorTextValue("Passwords do not match.");
      return;
    }

    setIsSubmittingValue(true);

    try {
      const responseValue = await apiClient.post<AuthLoginResponse>("/api/auth/register", {
        email: emailValue,
        password: passwordValue,
      });

      saveAuthResponseValue(responseValue);
      setSuccessTextValue("Registration successful. Redirecting to dashboard…");
      window.location.href = "./Dashboard.html";
    } catch (errValue) {
      setErrorTextValue(errValue instanceof Error ? errValue.message : "Registration failed.");
    } finally {
      setIsSubmittingValue(false);
    }
  }

  return (
    <Layout activePage="register">
      <Box bg="brand.100" minH="calc(100vh - 1px)">
        <Container maxW="3xl" py={{ base: 6, md: 10 }}>
          <PageHeader
            titleValue="Register"
            subtitleValue="Create a new user account through the current /api/auth/register route, then reuse the same saved token flow as login so the rest of the project keeps working unchanged."
          />

          <Box bg="brand.50" borderWidth="1px" borderColor="blackAlpha.100" borderRadius="18px" p={{ base: 5, md: 6 }}>
            <Stack gap={4}>
              <Field.Root required>
                <Field.Label>Email</Field.Label>
                <Input type="email" value={emailValue} onChange={(eventValue) => setEmailValue(eventValue.target.value)} placeholder="you@example.com" bg="white" />
              </Field.Root>

              <Field.Root required>
                <Field.Label>Password</Field.Label>
                <Input type="password" value={passwordValue} onChange={(eventValue) => setPasswordValue(eventValue.target.value)} placeholder="Choose a password" bg="white" />
              </Field.Root>

              <Field.Root required>
                <Field.Label>Confirm password</Field.Label>
                <Input type="password" value={confirmPasswordValue} onChange={(eventValue) => setConfirmPasswordValue(eventValue.target.value)} placeholder="Re-enter your password" bg="white" />
              </Field.Root>

              {errorTextValue ? <Text color="negatives.400" fontWeight={800}>{errorTextValue}</Text> : null}
              {successTextValue ? <Text color="accent.400" fontWeight={800}>{successTextValue}</Text> : null}

              <Stack gap={3} direction={{ base: "column", sm: "row" }}>
                <Button bg="brand.500" color="white" _hover={{ bg: "brand.600" }} loading={isSubmittingValue} onClick={() => void handleRegisterValue()}>
                  Create account
                </Button>
                <Button variant="outline" borderColor="blackAlpha.300" onClick={() => (window.location.href = "./Login.html")}>
                  Back to login
                </Button>
              </Stack>

              <Text color="brand.700">
                Already have an account? <Link href="./Login.html" color="brand.600" fontWeight={900}>Go to login</Link>
              </Text>
            </Stack>
          </Box>
        </Container>
      </Box>
    </Layout>
  );
}
