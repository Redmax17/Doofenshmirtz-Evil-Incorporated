/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import { Badge, Box, Button, Center, Container, Dialog, Grid, HStack, Input, Portal, Spinner, Stack, Text } from "@chakra-ui/react";
import Layout from "../../Shared/Layout";
import AuthStatusCard from "../../Shared/AuthStatusCard";
import NetWorthCard from "../../Shared/NetWorthCard";
import PageHeader from "../../Shared/PageHeader";
import PlaidLinkButton from "../../Shared/PlaidLinkButton";
import StatCard from "../../Shared/StatCard";
import { apiClient } from "../../Shared/apiClient";
import { clearStoredAuthTokenValue, hasStoredAuthTokenValue, loadCurrentUserValue, logoutValue, navigateToValue, setStoredAuthTokenValue } from "../../Shared/authStorage";
import { safeText } from "../../Shared/SharedFunctions";
import type { AuthUser, PlaidItemsResponse, PlaidInstitutionItem, NetWorthResponse, NetWorthAccountRow } from "../../Shared/types";

export default function Account() {
  const [userValue, setUserValue] = useState<AuthUser | null>(null);
  const [linkedItemsValue, setLinkedItemsValue] = useState<PlaidInstitutionItem[]>([]);
  const [netWorthValue, setNetWorthValue] = useState<NetWorthResponse | null>(null);
  const [isLoadingValue, setIsLoadingValue] = useState<boolean>(true);
  const [errorTextValue, setErrorTextValue] = useState<string>("");
  const [isDisconnectingItemIdValue, setIsDisconnectingItemIdValue] = useState<string>("");
  const [privacyContent, setPrivacyContent] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userEmailInput, setUserEmailInput] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteErrorText, setDeleteErrorText] = useState("");

  const isAuthenticatedValue = hasStoredAuthTokenValue();

  async function loadAccountPageDataValue(): Promise<void> {
    setIsLoadingValue(true);
    setErrorTextValue("");

    try {
      const [meResponseValue, itemsResponseValue, netWorthResponseValue] = await Promise.all([
        loadCurrentUserValue(),
        apiClient.get<PlaidItemsResponse>("/api/v1/plaid/items"),
        apiClient.get<NetWorthResponse>("/api/v1/dashboard/net-worth"),
      ]);

      setUserValue(meResponseValue.user);
      setLinkedItemsValue(itemsResponseValue.items ?? []);
      setNetWorthValue(netWorthResponseValue);
    } catch (errValue) {
      setErrorTextValue(errValue instanceof Error ? errValue.message : "Failed to load account details.");
    } finally {
      setIsLoadingValue(false);
    }
  }

  async function handleAccountDelete(): Promise<void> {
    setDeleteErrorText("");

    try {
      await apiClient.delete("/api/auth/account");

      clearStoredAuthTokenValue();
    } catch (error) {
      setDeleteErrorText(
        error instanceof Error
          ? error.message
          : "Account Deletion Failed."
      );
    }

    window.location.href = "/Login.html";
  }

  useEffect(() => {
    if (!isAuthenticatedValue) {
      setIsLoadingValue(false);
      return;
    }

    void loadAccountPageDataValue();
  }, [isAuthenticatedValue]);

  const linkedAccountCountValue = useMemo(() => {
    return Number(netWorthValue?.accounts?.length ?? 0);
  }, [netWorthValue]);

  const assetsAccountCountValue = useMemo(() => {
    return (netWorthValue?.accounts ?? []).filter((accountValue: NetWorthAccountRow) => accountValue.bucket === "asset").length;
  }, [netWorthValue]);

  async function disconnectLinkedItemValue(itemIdValue: string): Promise<void> {
    setIsDisconnectingItemIdValue(itemIdValue);
    setErrorTextValue("");

    try {
      await apiClient.delete(`/api/v1/plaid/items/${encodeURIComponent(itemIdValue)}`);
      await loadAccountPageDataValue();
    } catch (errValue) {
      setErrorTextValue(errValue instanceof Error ? errValue.message : "Failed to disconnect linked institution.");
    } finally {
      setIsDisconnectingItemIdValue("");
    }
  }

  useEffect(() => {
    if (userValue?.email) {
      setUserEmail(userValue.email);
      setUserEmailInput(userValue.email);
    }
  }, [userValue]);

  async function handleEmailChange(): Promise<void> {
    setErrorTextValue("");
    setDeleteErrorText(""); // Use existing error state or create one for email

    // Validation
    if (!userEmailInput || !newEmail) {
      setErrorTextValue("Both current and new email are required.");
      return;
    }

    // Check if old email matches
    if (userEmailInput !== userEmail) {
      setErrorTextValue("Current email does not match our records.");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setErrorTextValue("Please enter a valid email address.");
      return;
    }

    // Check if new email is different from current
    if (newEmail === userEmail) {
      setErrorTextValue("New email is the same as your current email.");
      return;
    }

    setIsLoadingValue(true);

    try {
      const response = await apiClient.put<{ token: string; user: { userId: number; email: string } }>(
        "/api/auth/email",
        { newEmail: newEmail }
      );

      // Update the stored token with the new one
      setStoredAuthTokenValue(response.token);

      // Update the user email state
      setUserEmail(response.user.email);
      setUserEmailInput(response.user.email);
      setUserValue(prev => prev ? { ...prev, email: response.user.email } : prev);

      // Clear the input
      setNewEmail("");

      // Show success (you can add a toast or temporary success message)
      setErrorTextValue(""); // Clear any errors
      alert("Email updated successfully!"); // Or use a better notification system

    } catch (errValue) {
      const errorMessage = errValue instanceof Error ? errValue.message : "";

      if (errorMessage.includes("already in use")) {
        setErrorTextValue("This email is already registered to another account.");
      } else if (errorMessage.includes("Invalid email")) {
        setErrorTextValue("Please enter a valid email address.");
      } else if (errorMessage.includes("same as current")) {
        setErrorTextValue("New email is the same as your current email.");
      } else {
        setErrorTextValue(errorMessage || "Failed to change email.");
      }
    } finally {
      setIsLoadingValue(false);
    }
  }

  async function handlePasswordChange(): Promise<void> {
    setPasswordError("");

    // Validation
    if (!currentPassword) {
      setPasswordError("Current password is required");
      return;
    }

    if (!newPassword) {
      setPasswordError("New password is required");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("New password must be different from current password");
      return;
    }

    setIsLoadingValue(true);

    try {
      await apiClient.put("/api/auth/password", {
        currentPassword: currentPassword,
        newPassword: newPassword
      });

      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Show success (you can add a toast or alert)
      alert("Password changed successfully!");

      // Close dialog (if you have control over dialog state)
      // You may want to add a state like `isPasswordDialogOpen` to control this

    } catch (errValue) {
      const errorMessage = errValue instanceof Error ? errValue.message : "";

      if (errorMessage.includes("Current password is incorrect")) {
        setPasswordError("Current password is incorrect");
      } else if (errorMessage.includes("at least 6 characters")) {
        setPasswordError("New password must be at least 6 characters long");
      } else {
        setPasswordError(errorMessage || "Failed to change password");
      }
    } finally {
      setIsLoadingValue(false);
    }
  }

  useEffect(() => {
    fetch("./PrivacyPolicy.html")
      .then(response => response.text())
      .then(html => {
        // Extract just the body content
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const bodyContent = doc.body.innerHTML;
        setPrivacyContent(bodyContent);
      })
      .catch(err => {
        console.error("Failed to load:", err);
      });
  }, []);

  return (
    <Layout activePage="account">
      <Box bg="brand.100" minH="calc(100vh - 1px)">
        <Container maxW="6xl" py={{ base: 6, md: 10 }}>
          <PageHeader
            titleValue="Account"
            subtitleValue="View your signed-in identity, linked Plaid institutions, and high-level account information tied to the current user."
            rightContentValue={
              <>
                <PlaidLinkButton buttonLabelValue="Link another institution" onLinkedValue={loadAccountPageDataValue} />
                <Button size="sm" bg="brand.500" color="white" _hover={{ bg: "brand.600" }} onClick={() => void loadAccountPageDataValue()}>
                  Refresh account
                </Button>
              </>
            }
          />

          {!isAuthenticatedValue ? (
            <AuthStatusCard
              titleValue="You are not currently signed in"
              bodyValue="Login or register first, then this page will load your current user, linked Plaid institutions, and account summaries."
              actionsValue={
                <>
                  <Button bg="brand.500" color="white" _hover={{ bg: "brand.600" }} onClick={() => (window.location.href = "./Login.html")}>Login</Button>
                  <Button variant="outline" borderColor="blackAlpha.300" onClick={() => (window.location.href = "./Register.html")}>Register</Button>
                </>
              }
            />
          ) : (
            <Stack gap={6}>
              {errorTextValue ? (
                <Box bg="brand.50" borderWidth="1px" borderColor="blackAlpha.100" borderRadius="18px" p={4}>
                  <Text fontWeight={900} color="brand.900">Account page warning</Text>
                  <Text color="brand.700">{errorTextValue}</Text>
                </Box>
              ) : null}

              <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4}>
                <StatCard labelValue="Signed-in email" valueValue={safeText(userValue?.email)} toneColorValue="brand.600" helperValue={userValue ? `User ID ${userValue.userId}` : "Loading user…"} />
                <StatCard labelValue="Linked institutions" valueValue={String(linkedItemsValue.length)} toneColorValue="accent.400" helperValue="Uses /api/v1/plaid/items" />
                <StatCard labelValue="Accounts in DB" valueValue={String(linkedAccountCountValue)} toneColorValue="brand.600" helperValue={`${assetsAccountCountValue} asset account(s) currently counted`} />
              </Grid>

              <Grid templateColumns={{ base: "1fr", xl: "1fr 1fr" }} gap={6}>
                <AuthStatusCard
                  titleValue="Authentication status"
                  bodyValue={userValue ? `Signed in as ${userValue.email}. In the current dev environment, backend auth can be bypassed while routes still resolve through the same API structure.` : "Loading current user…"}
                  actionsValue={
                    <>
                      <Button bg="brand.500" color="white" _hover={{ bg: "brand.600" }} onClick={() => void loadAccountPageDataValue()}>
                        Refresh profile
                      </Button>
                      <Button variant="outline" borderColor="blackAlpha.300" onClick={() => logoutValue("./Login.html")}>
                        Log out
                      </Button>
                    </>
                  }
                />

                <NetWorthCard />
              </Grid>

              <Box bg="brand.50" borderWidth="1px" borderColor="blackAlpha.100" borderRadius="18px" p={5}>
                <HStack justify="space-between" align="center" mb={4}>
                  <Stack gap={1}>
                    <Text fontWeight={900} color="brand.900">Linked institutions</Text>
                    <Text color="brand.700">These rows map directly to the Plaid items route already present in your dev API.</Text>
                  </Stack>
                  {isLoadingValue ? <Spinner size="sm" /> : null}
                </HStack>

                {!linkedItemsValue.length ? (
                  <Text color="brand.700">No linked institutions were returned for this user yet.</Text>
                ) : (
                  <Stack gap={3}>
                    {linkedItemsValue.map((itemValue) => (
                      <Box key={itemValue.itemId} borderWidth="1px" borderColor="blackAlpha.100" borderRadius="16px" p={4} bg="whiteAlpha.700">
                        <HStack justify="space-between" align="start" flexWrap="wrap" gap={3}>
                          <Stack gap={1}>
                            <Text fontWeight={900} color="brand.900">{safeText(itemValue.institutionName)}</Text>
                            <HStack gap={2} flexWrap="wrap">
                              <Badge bg="brand.100" color="brand.700">Item ID: {itemValue.itemId}</Badge>
                              <Badge bg="accent.300" color="brand.900">Institution: {safeText(itemValue.institutionId)}</Badge>
                            </HStack>
                            <Text fontSize="sm" color="brand.700">Linked on {safeText(itemValue.createdAt)}</Text>
                          </Stack>

                          <Button
                            size="sm"
                            variant="outline"
                            borderColor="negatives.200"
                            color="negatives.400"
                            loading={isDisconnectingItemIdValue === itemValue.itemId}
                            onClick={() => void disconnectLinkedItemValue(itemValue.itemId)}
                          >
                            Disconnect
                          </Button>
                        </HStack>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>
              <Box bg="brand.50" borderWidth="1px" borderColor="blackAlpha.100" borderRadius="18px" p={5}>
                <Text fontSize="m" fontWeight={900} color={"brand.900"}>
                  Data And Privacy
                </Text>

                <Box h="1px" w="100%" bg="blackAlpha.100" my={2} />

                {/* Privacy Policy */}
                <HStack w="95%">
                  {/* Privacy Policy Title And Subtitle */}
                  <Stack gap={1} mb={2} w="100%">
                    <Text fontSize="sm" color="black">
                      View Privacy Policy
                    </Text>
                    <Text fontSize="xs" color="black">
                      View The Privacy Policy Of This App
                    </Text>
                  </Stack>

                  {/* View Privacy Policy Dialog */}
                  <Dialog.Root size={"cover"} key={"xl"}>
                    <Dialog.Trigger asChild>
                      <Button variant={"outline"} backgroundColor={"accent.400"}>
                        View
                      </Button>
                    </Dialog.Trigger>
                    <Portal>
                      <Dialog.Backdrop />
                      <Dialog.Positioner>
                        <Dialog.Content>
                          <Dialog.Header>
                            <Dialog.Title color="black">
                              Privacy Policy
                            </Dialog.Title>
                          </Dialog.Header>
                          <Dialog.Body m={2}>
                            <Dialog.Body m={2} style={{ maxHeight: "70vh", overflowY: "auto" }}>
                              <div dangerouslySetInnerHTML={{ __html: privacyContent }} />
                            </Dialog.Body>
                          </Dialog.Body>
                          <Dialog.Footer>
                            <Dialog.ActionTrigger asChild>
                              <Button variant={"outline"}>Close</Button>
                            </Dialog.ActionTrigger>
                          </Dialog.Footer>
                        </Dialog.Content>
                      </Dialog.Positioner>
                    </Portal>
                  </Dialog.Root>
                </HStack>

                {/* Update Email */}
                <HStack w="95%">
                  {/* Update Email Title And Subtitle */}
                  <Stack gap={1} mb={2} w="100%">
                    <Text fontSize="sm" color="black">
                      Update Email
                    </Text>
                    <Text fontSize="xs" color="black">
                      Update your accounts email address
                    </Text>
                  </Stack>

                  {/* Update Email Dialog */}
                  <Dialog.Root size={"sm"} key={"sm"}>
                    <Dialog.Trigger asChild>
                      <Button variant={"outline"} backgroundColor={"accent.400"}>
                        Update
                      </Button>
                    </Dialog.Trigger>
                    <Portal>
                      <Dialog.Backdrop />
                      <Dialog.Positioner>
                        <Dialog.Content>
                          <Dialog.Header>
                            <Dialog.Title color={"black"}>
                              Update Email
                            </Dialog.Title>
                          </Dialog.Header>
                          <Dialog.Body m={2}>
                            <Stack gap={3}>
                              <Stack>
                                <Text color={"black"}>Confirm Current Email</Text>
                                <Input
                                  color={"black"}
                                  type="email"
                                  backgroundColor={"white"}
                                  w={"100%"}
                                  placeholder="Enter your current email"
                                  value={userEmailInput}
                                  onChange={e => setUserEmailInput(e.target.value)}
                                />
                              </Stack>

                              <Stack>
                                <Text color={"black"}>New Email Address</Text>
                                <Input
                                  type="email"
                                  color={"black"}
                                  backgroundColor={"white"}
                                  w={"100%"}
                                  placeholder="Enter new email address"
                                  value={newEmail}
                                  onChange={e => setNewEmail(e.target.value)}
                                />
                              </Stack>

                              {errorTextValue && (
                                <Text color="red.500" fontSize="sm">{errorTextValue}</Text>
                              )}
                            </Stack>

                          </Dialog.Body>
                          <Dialog.Footer>
                            <Dialog.ActionTrigger asChild>
                              <Button variant={"outline"} onClick={() => {
                                setUserEmailInput(userEmail);
                                setNewEmail("");
                                setErrorTextValue("");
                              }}>Cancel</Button>
                            </Dialog.ActionTrigger>
                            <Button
                              variant={"outline"}
                              backgroundColor={"accent.400"}
                              onClick={handleEmailChange}
                              disabled={!userEmailInput || !newEmail || userEmailInput !== userEmail}
                            >
                              Save
                            </Button>
                          </Dialog.Footer>
                        </Dialog.Content>
                      </Dialog.Positioner>
                    </Portal>
                  </Dialog.Root>
                </HStack>

                {/* Change Password */}
                <HStack w="95%">
                  {/* Change Password Title And Subtitle */}
                  <Stack gap={1} mb={2} w="100%">
                    <Text fontSize="sm" color="black">
                      Change Password
                    </Text>
                    <Text fontSize="xs" color="black">
                      Change the password used to log into your account
                    </Text>
                  </Stack>

                  {/* Update Password Dailog */}
                  <Dialog.Root size={"sm"} key={"sm"}>
                    <Dialog.Trigger asChild>
                      <Button variant={"outline"} backgroundColor="accent.400">
                        Change
                      </Button>
                    </Dialog.Trigger>
                    <Portal>
                      <Dialog.Backdrop />
                      <Dialog.Positioner>
                        <Dialog.Content>
                          <Dialog.Header>
                            <Dialog.Title color="black">
                              Change Password
                            </Dialog.Title>
                          </Dialog.Header>
                          <Dialog.Body m={2}>
                            <Stack>
                              <Text color="black">Enter Old Password</Text>
                              <Input
                                type="password"
                                color="black"
                                backgroundColor={"white"}
                                w={"75%"}
                                value={currentPassword}
                                onChange={e => setCurrentPassword(e.target.value)}
                              />
                              <Text color="black">Enter Your New Password</Text>
                              <Input color="black" type="text" backgroundColor={"white"} w={"75%"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                              <Text color="black">Confirm The New Password</Text>
                              <Input
                                type="password"
                                color="black"
                                backgroundColor={"white"}
                                w={"75%"}
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                disabled={confirmPassword !== currentPassword}
                              />

                              {/*Error Message */}
                              {passwordError && (
                                <Text fontSize={"sm"} color={"red"}>{passwordError}</Text>
                              )}
                            </Stack>
                          </Dialog.Body>
                          <Dialog.Footer>
                            <Dialog.ActionTrigger asChild>
                              <Button variant={"outline"}>Cancel</Button>
                            </Dialog.ActionTrigger>
                            <Button variant={"outline"} backgroundColor="accent.400" onClick={handlePasswordChange}>Save</Button>
                          </Dialog.Footer>
                        </Dialog.Content>
                      </Dialog.Positioner>
                    </Portal>
                  </Dialog.Root>
                </HStack>

                {/* Delete Account */}
                <HStack w="95%">
                  {/* Delete Account Title And Subtitle */}
                  <Stack gap={1} mb={2} w="100%">
                    <Text fontSize="sm" color="black">
                      Delete Account
                    </Text>
                    <Text fontSize="xs" color="black">
                      Permanently deletes your account and its data
                    </Text>
                  </Stack>

                  {/* Delete Account Dialog */}
                  <Dialog.Root size={"sm"} key={"sm"}>
                    <Dialog.Trigger asChild>
                      <Button variant={"outline"} backgroundColor={"red.500"}>
                        Delete
                      </Button>
                    </Dialog.Trigger>
                    <Portal>
                      <Dialog.Backdrop />
                      <Dialog.Positioner>
                        <Dialog.Content>
                          <Dialog.Header>
                            <Dialog.Title color="black">
                              Delete Account Confirmation
                            </Dialog.Title>
                          </Dialog.Header>
                          <Dialog.Body m={2}>
                            <Stack gap={2}>
                              <Center>
                                <Text color="black">Type "Delete" To Confirm</Text>
                              </Center>
                              <Center>
                                <Input type="text" background={"white"} w={"75%"} value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} />
                              </Center>
                              {deleteErrorText ? <Text color="negatives.400" fontWeight={800}>{deleteErrorText}</Text> : null}
                            </Stack>
                          </Dialog.Body>
                          <Dialog.Footer>
                            <Dialog.ActionTrigger asChild>
                              <Button variant={"outline"}>Cancel</Button>
                            </Dialog.ActionTrigger>
                            <Button variant={"outline"} backgroundColor="negatives.400" disabled={deleteConfirmText.toLowerCase() != "delete"} onClick={handleAccountDelete}>Confirm</Button>
                          </Dialog.Footer>
                        </Dialog.Content>
                      </Dialog.Positioner>
                    </Portal>
                  </Dialog.Root>
                </HStack>
              </Box>
            </Stack>
          )}
        </Container>
      </Box>
    </Layout >
  );
}
