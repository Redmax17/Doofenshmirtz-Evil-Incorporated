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
import { clearStoredAuthTokenValue, hasStoredAuthTokenValue, loadCurrentUserValue, logoutValue, navigateToValue } from "../../Shared/authStorage";
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
                            <Dialog.Title color={"accent.400"}>
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
    </Layout>
  );
}
