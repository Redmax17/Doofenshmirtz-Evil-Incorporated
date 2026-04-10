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
} from "@chakra-ui/react";

export default function Account() {

  // Style Variables
  const pageBg = "brand.100";
  const cardBg = "brand.50";
  const cardBorder = "blackAlpha.100";
  const subtleText = "brand.700";
  const strongText = "brand.900";

  return (
    <Layout activePage="account">
      <Box bg={pageBg} minH="calc(100vh - 1px)">
        <Container maxW="6x1" py={{ base: 6, md: 10 }}>
          {/* Page Header */}
          <Stack gap={2} mb={6}>
            <HStack justify="space-between" align="center" flexWrap="wrap" gap={3}>
              <Heading size="lg" color={strongText}>
                Account Settings
              </Heading>
            </HStack>
          </Stack>

          {/* Page Content */}
          <Box h="1px" w="100%" bg="blackAlpha.100" my={6}>

            {/* Notification Settings */}
            <Box bg={cardBg} borderWidth="1px" borderColor={cardBorder} borderRadius="18px" p={5}>
              {/* Card Header */}
              <Text fontSize="m" fontWeight={900} color="accent.400">
                Notifications
              </Text>

              <Box h="1px" w="100%" bg="blackAlpha.100" my={2} />

              {/* Card Content */}
              <Grid templateColumns={{ base: "2fr", md: "repeat(2, 2fr)" }} gap={4} w="100%">
                {/* Overspending Alert */}
                <HStack w="100%">
                  <Stack gap={1} mb={2} w="100%">
                    <Text fontSize="sm">
                      Overspending Alert
                    </Text>
                    <Text fontSize="xs">
                      Alert me when I go above my set budget
                    </Text>
                  </Stack>

                  <input type="checkbox"></input>
                </HStack>


              </Grid>

            </Box>

          </Box>
        </Container>
      </Box>
    </Layout>
  );
}
