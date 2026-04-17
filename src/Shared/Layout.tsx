// src/Shared/Layout.tsx
import { useMemo } from "react";
import type { ReactNode } from "react";
import { Box, Button, Container, Flex, HStack, Link, Text } from "@chakra-ui/react";
import { hasStoredAuthTokenValue, logoutValue } from "./authStorage";

/** Controls which top nav item appears active */
export type ActivePageKey =
  | "dashboard"
  | "budgets"
  | "transactions"
  | "analytics"
  | "login"
  | "register"
  | "account";

type LayoutProps = {
  activePage: ActivePageKey;
  children: ReactNode;
};

const bgc = "brand.500";
const tc = "accent.400";
const btnc = "brand.400";
const btnt = "brand.900";

type NavItem = {
  label: string;
  href: string;
  isActive?: boolean;
};

function NavLink(navItemValue: NavItem) {
  return (
    <Link
      href={navItemValue.href}
      px={3}
      py={2}
      borderRadius="md"
      fontSize="sm"
      fontWeight={800}
      color={navItemValue.isActive ? "accent.400" : tc}
      bg={navItemValue.isActive ? "brand.550" : bgc}
      _hover={{
        textDecoration: "none",
        bg: "rgba(93,200,155,0.14)",
        color: "textStrong",
      }}
      whiteSpace="nowrap"
    >
      {navItemValue.label}
    </Link>
  );
}

export function TopNav(propsValue: { activePage: ActivePageKey }) {
  const { activePage } = propsValue;
  const isAuthenticatedValue = hasStoredAuthTokenValue();

  const navItemsValue: NavItem[] = [
    { label: "Dashboard", href: "./Dashboard.html", isActive: activePage === "dashboard" },
    { label: "Budgets", href: "./Budgets.html", isActive: activePage === "budgets" },
    { label: "Transactions", href: "./Transactions.html", isActive: activePage === "transactions" },
    { label: "Analytics", href: "./Analytics.html", isActive: activePage === "analytics" },
    { label: "Account", href: "./Account.html", isActive: activePage === "account" },
  ];

  const authButtonTextValue = useMemo(() => {
    if (activePage === "login") return isAuthenticatedValue ? "Log out" : "Register";
    if (activePage === "register") return isAuthenticatedValue ? "Log out" : "Login";
    return isAuthenticatedValue ? "Log out" : "Login";
  }, [activePage, isAuthenticatedValue]);

  const authButtonActionValue = (): void => {
    if (isAuthenticatedValue) {
      logoutValue("./Login.html");
      return;
    }

    if (activePage === "login") {
      window.location.href = "./Register.html";
      return;
    }

    window.location.href = "./Login.html";
  };

  return (
    <Box position="sticky" top={0} zIndex={50} bg={bgc} borderBottomWidth="1px" borderColor="borderSubtle" boxShadow="sm">
      <Container maxW="6xl" py={3}>
        <Flex align="center" justify="space-between" gap={4}>
          <HStack gap={3} minW="fit-content">
            <Box
              w="44px"
              h="44px"
              borderRadius="lg"
              borderWidth="1px"
              borderColor="rgba(111,101,160,0.35)"
              display="grid"
              placeItems="center"
              fontWeight={900}
              color={tc}
              bg="brand.400"
              letterSpacing="0.5px"
              flexShrink={0}
            >
              DEI
            </Box>

            <Box lineHeight={1.1}>
              <Text fontWeight={900} color="textStrong">
                Income Generate-Inator
              </Text>
              <Text fontSize="sm" color="textMuted">
                Personal finance dashboard
              </Text>
            </Box>
          </HStack>

          <HStack gap={2} flex={1} justify="center" display={{ base: "none", md: "flex" }}>
            {navItemsValue.map((navItemValue) => (
              <NavLink
                key={navItemValue.href}
                label={navItemValue.label}
                href={navItemValue.href}
                isActive={navItemValue.isActive}
              />
            ))}
          </HStack>

          <HStack gap={2} minW="fit-content">
            <Button
              variant="outline"
              borderColor="rgba(111,101,160,0.35)"
              _hover={{ bg: "rgba(146,130,186,0.10)" }}
              fontWeight={900}
              borderRadius="md"
              size="sm"
              onClick={() => window.location.reload()}
              color={btnt}
              bg={btnc}
            >
              Refresh
            </Button>

            <Button
              color={btnt}
              bg={btnc}
              _hover={{ bg: "brand.600" }}
              borderRadius="md"
              size="sm"
              fontWeight={900}
              onClick={authButtonActionValue}
            >
              {authButtonTextValue}
            </Button>
          </HStack>
        </Flex>

        <Box display={{ base: "block", md: "none" }} mt={3}>
          <HStack gap={2} overflowX="auto" pb={2}>
            {navItemsValue.map((navItemValue) => (
              <NavLink
                key={navItemValue.href}
                label={navItemValue.label}
                href={navItemValue.href}
                isActive={navItemValue.isActive}
              />
            ))}
          </HStack>
        </Box>
      </Container>
    </Box>
  );
}

export default function Layout({ activePage, children }: LayoutProps) {
  return (
    <Box minH="100vh" bg="brand.100">
      <TopNav activePage={activePage} />
      <Box as="section">{children}</Box>
    </Box>
  );
}
