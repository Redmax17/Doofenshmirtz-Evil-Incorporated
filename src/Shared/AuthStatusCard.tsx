import { Box, Button, HStack, Stack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

type AuthStatusCardProps = {
  titleValue: string;
  bodyValue: string;
  toneColorValue?: string;
  actionsValue?: ReactNode;
};

/**
 * Shared auth/info card for login/account pages.
 * Inputs: title/body/actions
 * Output: compact status card
 * Purpose: reduce repeated panel markup.
 */
export default function AuthStatusCard({
  titleValue,
  bodyValue,
  toneColorValue = "brand.900",
  actionsValue,
}: AuthStatusCardProps) {
  return (
    <Box bg="brand.50" borderWidth="1px" borderColor="blackAlpha.100" borderRadius="18px" p={5}>
      <Stack gap={3}>
        <Stack gap={1}>
          <Text fontWeight={900} color={toneColorValue}>
            {titleValue}
          </Text>
          <Text color="brand.700">{bodyValue}</Text>
        </Stack>
        {actionsValue ? <HStack gap={3} flexWrap="wrap">{actionsValue}</HStack> : null}
      </Stack>
    </Box>
  );
}
