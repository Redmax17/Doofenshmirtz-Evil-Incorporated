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
} from "@chakra-ui/react";

export default function Account() {

  // Style Variables
  const pageBg = "brand.100";
  const cardBg = "brand.50";
  const cardBorder = "blackAlpha.100";
  const subtleText = "brand.700";
  const strongText = "brand.900";
  const greenColor = "accent.400";


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
                <Switch.Root colorPalette={"green"}>
                  <Switch.HiddenInput />
                  <Switch.Control>
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
                <Switch.Root colorPalette={"green"}>
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
                <Switch.Root colorPalette={"green"}>
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
                  <Input type="number" defaultValue={50} background={"white"}></Input>
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
                      List Of Linked Accounts
                    </Text>
                    <Text fontSize="xs">
                      View A List Of Linked Accounts
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

          </Stack>
        </Container>
      </Box>
    </Layout >
  );
}
