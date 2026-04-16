/*
  This is the Account page for user settings
*/

import Layout from "../../Shared/Layout";
import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../../Shared/apiClient";
import {
  Badge,
  Box,
  Button,
  Container,
  Grid,
  HStack,
  Heading,
  Link,
  Spinner,
  Stack,
  Text,
  AbsoluteCenter,
  Center,
  Checkbox,
  Switch,
  InputGroup,
  InputElement,
  InputAddon,
  Input,
  Menu,
  MenuRoot,
  MenuTrigger,
  MenuContent,
  MenuItem,
  Dialog,
  Portal
} from "@chakra-ui/react";
import { generateClient } from "aws-amplify/api";
import { deleteUser, fetchUserAttributes, getCurrentUser, updateUserAttribute, updateUserAttributes } from "aws-amplify/auth";
import type { Schema } from "../../../amplify/data/resource";

// Generates The Amplify Data Client 
const client = generateClient<Schema>();

// Defines Account Page And Actions
export default function Account() {

  // Style Variables
  const pageBg = "brand.100";
  const cardBg = "brand.50";
  const cardBorder = "blackAlpha.100";
  const strongText = "brand.900";
  const greenColor = "accent.400";

  const [settingsId, setSettingsId] = useState<string | null>(null);

  // State For Email
  const [userEmail, setUserEmail] = useState("");
  const [userEmailInput, setUserEmailInput] = useState(""); // Used To Check If The User Entered The Right Email
  const [newEmail, setNewEmail] = useState("");

  // State For Linked Accounts
  // *TO DO*
  // Use Plaid To Link Accounts And Store Them Here
  const [accounts, setAccounts] = useState();

  // Tracks What The User Typed In The Delete Account Prompt
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Gets The User's Email Fron Amplify
  useEffect(() => {
    async function loadEmail() {
      try {
        const attributes = await fetchUserAttributes();
        setUserEmail(attributes.email ?? "");
      } catch (error) {
        console.error("Error Fetching User Email:", error);
      }
    }
    loadEmail();
  }, []);

  // *TODO*: Add Bank Accounts
  // Gets All Linked Bank Accounts

  // Handles Account Deletion
  async function handleAccountDelete() {
    try {

      // *ToDo*: Delete Bank Account Data

      // Deletes The Users AWS Auth Account
      await deleteUser();

      // Redircts To Login Page
      window.location.href = "/Login.html";

      console.log("Account Deleted Successful");
    } catch (error) {
      console.error("An Error Occured While Trying To Delete This Account:", error);
    }
  }

  // Saves New User Email When The User Changes It
  async function handleEmailSave() {
    try {
      await updateUserAttributes({
        userAttributes: {
          email: newEmail,
        },
      });

      console.log("Email Saved Successfull")
    } catch (error) {
      console.error("An Error Occured While Trying To Save The New Email:", error)
    }
  }

  return (
    <Layout activePage="account">
      <Box bg={pageBg} minH="calc(100vh - 1px)">
        <Container maxW="6x1" py={{ base: 6, md: 10 }}>
          {/* Page Header */}
          <Stack gap={2} mb={3}>
            <HStack justify="space-between" align="center" flexWrap="wrap" gap={3}>
              <Heading size="lg" color={strongText}>
                Account Settings
              </Heading>
            </HStack>
          </Stack>

          <Box h="1px" w="100%" bg="blackAlpha.100" my={3} />

          {/* Page Content */}
          <Stack gap={6}>
            {/* Personal Information */}
            <Box bg={cardBg} borderWidth="1px" borderColor={cardBorder} borderRadius="18px" p={5}>
              {/* Card Header */}
              <Text fontSize="m" fontWeight={900} color={greenColor}>
                Personal Information
              </Text>

              <Box h="1px" w="100%" bg="blackAlpha.100" my={2} />

              {/* Card Content */}

              {/* Update Email */}
              <HStack w="95%">
                {/* Update Email Title And Subtitle */}
                <Stack gap={1} mb={2} w="100%">
                  <Text fontSize="sm">
                    Update Email
                  </Text>
                  <Text fontSize="xs">
                    Update your accounts email address
                  </Text>
                </Stack>

                {/* Update Email Dailog */}
                <Dialog.Root size={"sm"} key={"sm"}>
                  <Dialog.Trigger asChild>
                    <Button variant={"outline"} backgroundColor={greenColor}>
                      Update
                    </Button>
                  </Dialog.Trigger>
                  <Portal>
                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                      <Dialog.Content>
                        <Dialog.Header>
                          <Dialog.Title>
                            Update Email
                          </Dialog.Title>
                        </Dialog.Header>
                        <Dialog.Body m={2}>
                          <Stack>
                            <Text>Enter Your Old Email</Text>
                            <Input type="text" backgroundColor={"white"} w={"75%"} value={userEmailInput} onChange={e => setUserEmailInput(e.target.value)} />
                            <Text>Enter The New Email</Text>
                            <Input
                              type="text"
                              backgroundColor={"white"}
                              w={"75%"}
                              value={newEmail}
                              onChange={e => setNewEmail(e.target.value)}
                              disabled={userEmailInput !== userEmail}
                            />
                          </Stack>
                        </Dialog.Body>
                        <Dialog.Footer>
                          <Dialog.ActionTrigger asChild>
                            <Button variant={"outline"}>Cancel</Button>
                          </Dialog.ActionTrigger>
                          <Button variant={"outline"} backgroundColor={greenColor} onClick={handleEmailSave}>Save</Button>
                        </Dialog.Footer>
                      </Dialog.Content>
                    </Dialog.Positioner>
                  </Portal>
                </Dialog.Root>
              </HStack>
            </Box>

            <Box h="1px" w="100%" bg="blackAlpha.100" my={1} />

            {/* Linked Account Settings */}
            <Box bg={cardBg} borderWidth="1px" borderColor={cardBorder} borderRadius="18px" p={5}>
              {/* Card Header */}
              <Text fontSize="m" fontWeight={900} color={greenColor}>
                Linked Accounts
              </Text>

              <Box h="1px" w="100%" bg="blackAlpha.100" my={2} />

              {/* Card Content */}

              {/* List Of Linked Accounts */}
              <MenuRoot>
                <HStack w="95%">
                  {/* List Of Linked Accounts Title And Subtitle */}
                  <Stack gap={1} mb={2} w="100%">
                    <Text fontSize="sm">
                      List Of Linked Bank Accounts
                    </Text>
                    <Text fontSize="xs">
                      View A List Of Linked Bank Accounts
                    </Text>
                  </Stack>

                  {/* Button For Drop Down */}
                  <MenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Veiw Accounts
                    </Button>
                  </MenuTrigger>

                </HStack>
                <MenuContent w="75%" css={{ transform: "translateX(15%)" }} >
                  <Button variant={"outline"} background={greenColor}>
                    Add Account
                  </Button>
                </MenuContent>
              </MenuRoot>
            </Box>

            <Box h="1px" w="100%" bg="blackAlpha.100" my={1} />

            <Box bg={cardBg} borderWidth="1px" borderColor={cardBorder} borderRadius="18px" p={5}>
              <Text fontSize="m" fontWeight={900} color={greenColor}>
                Data And Privacy
              </Text>

              <Box h="1px" w="100%" bg="blackAlpha.100" my={2} />

              {/* Privacy Policy */}
              <HStack w="95%">
                {/* Privacy Policy Title And Subtitle */}
                <Stack gap={1} mb={2} w="100%">
                  <Text fontSize="sm">
                    View Privacy Policy
                  </Text>
                  <Text fontSize="xs">
                    View The Privacy Policy Of This App
                  </Text>
                </Stack>

                {/* View Privacy Policy Dialog */}
                <Dialog.Root size={"cover"} key={"xl"}>
                  <Dialog.Trigger asChild>
                    <Button variant={"outline"} backgroundColor={greenColor}>
                      View
                    </Button>
                  </Dialog.Trigger>
                  <Portal>
                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                      <Dialog.Content>
                        <Dialog.Header>
                          <Dialog.Title>
                            Privacy Policy
                          </Dialog.Title>
                        </Dialog.Header>
                        <Dialog.Body m={2}>
                          <iframe src="../PrivacyPolicy.html" width={"100%"} height={"100%"} />
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

              {/* Unlink Accounts */}
              <HStack w="95%">
                {/* Unlink Accounts Title And Subtitle */}
                <Stack gap={1} mb={2} w="100%">
                  <Text fontSize="sm">
                    Unlink Bank Accounts
                  </Text>
                  <Text fontSize="xs">
                    Unlink All Bank Accounts
                  </Text>
                </Stack>

                {/* Unlink Accounts Dialog */}
                <Dialog.Root size={"sm"} key={"sm"}>
                  <Dialog.Trigger asChild>
                    <Button variant={"outline"} backgroundColor={"red.500"}>
                      Unlink
                    </Button>
                  </Dialog.Trigger>
                  <Portal>
                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                      <Dialog.Content>
                        <Dialog.Header>
                          <Dialog.Title>
                            Unlink Bank Accounts Confirmation
                          </Dialog.Title>
                        </Dialog.Header>
                        <Dialog.Body m={2}>
                          <Stack gap={2}>
                            <Center>
                              <Text>Type "Unlink" To Confirm</Text>
                            </Center>
                            <Center>
                              <Input type="text" background={"white"} w={"75%"}></Input>
                            </Center>
                          </Stack>
                        </Dialog.Body>
                        <Dialog.Footer>
                          <Dialog.ActionTrigger asChild>
                            <Button variant={"outline"}>Cancel</Button>
                          </Dialog.ActionTrigger>
                          <Button variant={"outline"} backgroundColor={greenColor}>Confirm</Button>
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
                  <Text fontSize="sm">
                    Delete Account
                  </Text>
                  <Text fontSize="xs">
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
                          <Dialog.Title>
                            Delete Account Confirmation
                          </Dialog.Title>
                        </Dialog.Header>
                        <Dialog.Body m={2}>
                          <Stack gap={2}>
                            <Center>
                              <Text>Type "Delete" To Confirm</Text>
                            </Center>
                            <Center>
                              <Input type="text" background={"white"} w={"75%"} value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} />
                            </Center>
                          </Stack>
                        </Dialog.Body>
                        <Dialog.Footer>
                          <Dialog.ActionTrigger asChild>
                            <Button variant={"outline"}>Cancel</Button>
                          </Dialog.ActionTrigger>
                          <Button variant={"outline"} backgroundColor={greenColor} disabled={deleteConfirmText !== "Delete"} onClick={handleAccountDelete}>Confirm</Button>
                        </Dialog.Footer>
                      </Dialog.Content>
                    </Dialog.Positioner>
                  </Portal>
                </Dialog.Root>
              </HStack>
            </Box>
          </Stack>
        </Container>
      </Box>
    </Layout >
  );
}
