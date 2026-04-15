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
import { deleteUser, getCurrentUser } from "aws-amplify/auth";
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

  // State For Notifications
  const [overspending, setOverspending] = useState(false);
  const [lowBalance, setLowBalance] = useState(false);
  const [largeTransaction, setLargeTransaction] = useState(false);
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState(50);

  // State For Linked Accounts
  // *TO DO*
  // Use Plaid To Link Accounts And Store Them Here
  const [accounts, setAccounts] = useState();

  // Tracks What The User Typed In The Delete Account Prompt
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Gets The User's Existing Settings From Amplify
  // Owner Auth Means Users Can Only See There Own Information
  useEffect(() => {
    async function loadSettings() {
      try {
        const { data } = await client.models.UserSettings.list();

        if (data.length > 0) {
          // Users Should Only Have 1 Record So We Pick The Top Everytime
          const s = data[0];
          setSettingsId(s.id);

          setOverspending(s.overSpendingNotification ?? false);
          setLowBalance(s.lowBalanceNotification ?? false);
          setLargeTransaction(s.largeTransactionNotification ?? false);
          setLowBalanceThreshold(s.lowBalanceThreshold ?? 50);
        }
      } catch (error) {
        console.error("Error Loading Settings Data:", error);
      }
    }
    loadSettings();
  }, [])

  // *TODO*: Add Bank Accounts
  // Gets All Linked Bank Accounts

  // Creates A New Save If One Does Not Exist
  // Or Updates The Existing One
  async function handleSave() {
    try {
      const payload = {
        overspending,
        lowBalance,
        largeTransaction,
        lowBalanceThreshold
      };

      // Checks If Record Exists
      if (settingsId) {
        // If The Record Exists We Save To It
        await client.models.UserSettings.update({ id: settingsId, ...payload });
      } else {
        // If There Is No Record We Create A New One And Store It
        const { data } = await client.models.UserSettings.create(payload);
        setSettingsId(data?.id ?? null);
      }

      console.log("Settings Saved Successfull");
    } catch (error) {
      console.error("Error Saving Settings:", error);
    }
  }

  // Handles Account Deletion
  async function handleAccountDelete() {
    try {
      // Deletes Users Current Records
      const { data: settings } = await client.models.UserSettings.list();
      for (const setting of settings) {
        await client.models.UserSettings.delete({ id: setting.id });
      }

      // *ToDo*: Delete Bank Account Data

      // Deletes The Users AWS Auth Account
      await deleteUser();

      // Redircts To Login Page
      window.location.href = "/Login.html";

      console.log("Account Deleted Successful");
    } catch (error) {
      console.log("An Error Occured While Trying To Delete This Account:", error);
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
              <Button onClick={() => handleSave()} backgroundColor={greenColor}>Save</Button>
            </HStack>
          </Stack>

          <Box h="1px" w="100%" bg="blackAlpha.100" my={3} />

          {/* Page Content */}
          <Stack gap={6}>
            {/* Notification Settings */}
            <Box bg={cardBg} borderWidth="1px" borderColor={cardBorder} borderRadius="18px" p={5}>
              {/* Card Header */}
              <Text fontSize="m" fontWeight={900} color={greenColor}>
                Notifications
              </Text>

              <Box h="1px" w="100%" bg="blackAlpha.100" my={2} />

              {/* Card Content */}

              {/* Overspending Alert */}
              <HStack w="95%">
                {/* Overspending Alert Title And Subtitle */}
                <Stack gap={1} mb={2} w="100%">
                  <Text fontSize="sm">
                    Overspending Alert
                  </Text>
                  <Text fontSize="xs">
                    Alert me when I go above my set budget
                  </Text>
                </Stack>

                {/* Overspending Toggle Switch */}
                <Switch.Root
                  colorPalette={"green"}
                  checked={overspending}
                  onCheckedChange={e => setOverspending(e.checked)}>
                  <Switch.HiddenInput />
                  <Switch.Control >
                    <Switch.Thumb />
                  </Switch.Control>
                  <Switch.Label />
                </Switch.Root>
              </HStack>

              {/* Low Balance Alert */}
              <HStack w="95%">
                {/* Low Balance Alert Title And Subtitle */}
                <Stack gap={1} mb={2} w="100%">
                  <Text fontSize="sm">
                    Low Balance Alert
                  </Text>
                  <Text fontSize="xs">
                    Alert me when I have a low balance
                  </Text>
                </Stack>

                {/* Low Balance Alert Toggle Switch */}
                <Switch.Root
                  colorPalette={"green"}
                  checked={lowBalance}
                  onCheckedChange={e => setLowBalance(e.checked)}>
                  <Switch.HiddenInput />
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                  <Switch.Label />
                </Switch.Root>
              </HStack>

              {/* Large Transaction Alert */}
              <HStack w="95%">
                {/* Large Transaction Alert Title And Subtitle */}
                <Stack gap={1} mb={2} w="100%">
                  <Text fontSize="sm">
                    Large Transaction Alert
                  </Text>
                  <Text fontSize="xs">
                    Alert me when there is a large transaction
                  </Text>
                </Stack>

                {/* Large Transaction Alert Toggle Switch */}
                <Switch.Root
                  colorPalette={"green"}
                  checked={largeTransaction}
                  onCheckedChange={e => setLargeTransaction(e.checked)}>
                  <Switch.HiddenInput />
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                  <Switch.Label />
                </Switch.Root>
              </HStack>

              <Box h="1px" w="100%" bg="blackAlpha.100" my={1}></Box>

              {/* Low Balance Threshold */}
              <HStack w="95%">
                {/* Low Balance Threshold Title And Subtitle */}
                <Stack gap={1} mb={2} w="100%">
                  <Text fontSize="sm">
                    Low Balance Threshold
                  </Text>
                  <Text fontSize="xs">
                    What amount should we notify you at?
                  </Text>
                </Stack>

                {/* Low Balance Threshold Input */}
                <InputGroup startElement="$" w="25%" >
                  <Input type="number" defaultValue={lowBalanceThreshold} background={"white"} onChange={e => setLowBalanceThreshold(Number(e.target.value))}></Input>
                </InputGroup>
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

                {/* View Button */}
                <Button variant={"outline"}>
                  View
                </Button>
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
