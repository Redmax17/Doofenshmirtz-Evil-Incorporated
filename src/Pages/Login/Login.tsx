import { useMemo, useState } from "react";
import { Box, Button, Container, Field, Input, Link, Stack, Text } from "@chakra-ui/react";
import Layout from "../../Shared/Layout";
import AuthStatusCard from "../../Shared/AuthStatusCard";
import PageHeader from "../../Shared/PageHeader";
import { apiClient } from "../../Shared/apiClient";
import { hasStoredAuthTokenValue, loadCurrentUserValue, logoutValue, saveAuthResponseValue } from "../../Shared/authStorage";
import type { AuthLoginResponse, AuthUser } from "../../Shared/types";

export default function Login() {
  const [emailValue, setEmailValue] = useState<string>("");
  const [passwordValue, setPasswordValue] = useState<string>("");
  const [errorTextValue, setErrorTextValue] = useState<string>("");
  const [successTextValue, setSuccessTextValue] = useState<string>("");
  const [currentUserValue, setCurrentUserValue] = useState<AuthUser | null>(null);
  const [isSubmittingValue, setIsSubmittingValue] = useState<boolean>(false);
  const [isCheckingCurrentUserValue, setIsCheckingCurrentUserValue] = useState<boolean>(false);

  const isAuthenticatedValue = useMemo(() => hasStoredAuthTokenValue(), []);

  async function handleLoginValue(): Promise<void> {
    setIsSubmittingValue(true);
    setErrorTextValue("");
    setSuccessTextValue("");

    try {
      const responseValue = await apiClient.post<AuthLoginResponse>("/api/auth/login", {
        email: emailValue,
        password: passwordValue,
      });

      saveAuthResponseValue(responseValue);
      setCurrentUserValue(responseValue.user);
      setSuccessTextValue("Login successful. Redirecting to dashboard…");
      window.location.href = "./Dashboard.html";
    } catch (errValue) {
      setErrorTextValue(errValue instanceof Error ? errValue.message : "Login failed.");
    } finally {
      setIsSubmittingValue(false);
    }
  }

  async function loadCurrentUserCardValue(): Promise<void> {
    setIsCheckingCurrentUserValue(true);
    setErrorTextValue("");

    try {
      const responseValue = await loadCurrentUserValue();
      setCurrentUserValue(responseValue.user);
    } catch (errValue) {
      setErrorTextValue(errValue instanceof Error ? errValue.message : "Failed to validate current login.");
    } finally {
      setIsCheckingCurrentUserValue(false);
    }
  }

  return (
    <Layout activePage="login">
      <Box bg="brand.100" minH="calc(100vh - 1px)">
        <Container maxW="3xl" py={{ base: 6, md: 10 }}>
          <PageHeader
            titleValue="Login"
            subtitleValue="Sign in through the existing /api/auth/login route, store the same auth token key your shared API client already reads, and navigate straight into the rest of the app."
          />

          <Stack gap={6}>
            {isAuthenticatedValue ? (
              <AuthStatusCard
                titleValue="You already appear to have a saved auth token"
                bodyValue={currentUserValue ? `Currently associated with ${currentUserValue.email}.` : "You can validate it, continue to the dashboard, or clear it and sign in again."}
                actionsValue={
                  <>
                    <Button bg="brand.500" color="white" _hover={{ bg: "brand.600" }} loading={isCheckingCurrentUserValue} onClick={() => void loadCurrentUserCardValue()}>
                      Validate current login
                    </Button>
                    <Button variant="outline" borderColor="blackAlpha.300" onClick={() => (window.location.href = "./Dashboard.html")}>Go to dashboard</Button>
                    <Button variant="outline" borderColor="negatives.200" color="negatives.400" onClick={() => logoutValue("./Login.html")}>Log out</Button>
                  </>
                }
              />
            ) : null}

            <Box bg="brand.50" borderWidth="1px" borderColor="blackAlpha.100" borderRadius="18px" p={{ base: 5, md: 6 }}>
              <Stack gap={4}>
                <Field.Root required>
                  <Field.Label>Email</Field.Label>
                  <Input type="email" value={emailValue} onChange={(eventValue) => setEmailValue(eventValue.target.value)} placeholder="you@example.com" bg="white" />
                </Field.Root>

                <Field.Root required>
                  <Field.Label>Password</Field.Label>
                  <Input type="password" value={passwordValue} onChange={(eventValue) => setPasswordValue(eventValue.target.value)} placeholder="Enter your password" bg="white" />
                </Field.Root>

                {errorTextValue ? <Text color="negatives.400" fontWeight={800}>{errorTextValue}</Text> : null}
                {successTextValue ? <Text color="accent.400" fontWeight={800}>{successTextValue}</Text> : null}

                <Stack gap={3} direction={{ base: "column", sm: "row" }}>
                  <Button bg="brand.500" color="white" _hover={{ bg: "brand.600" }} loading={isSubmittingValue} onClick={() => void handleLoginValue()}>
                    Login
                  </Button>
                  <Button variant="outline" borderColor="blackAlpha.300" onClick={() => (window.location.href = "./Register.html")}>
                    Create account
                  </Button>
                </Stack>

                <Text color="brand.700">
                  Need a new account? <Link href="./Register.html" color="brand.600" fontWeight={900}>Go to register</Link>
                </Text>
              </Stack>
            </Box>
          </Stack>
        </Container>
      </Box>
    </Layout>
  );
}
