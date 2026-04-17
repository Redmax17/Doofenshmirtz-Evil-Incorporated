import { HStack, Stack, type StackProps, Text, Heading } from "@chakra-ui/react";
import type { ReactNode } from "react";

type PageHeaderProps = {
  titleValue: string;
  subtitleValue: string;
  rightContentValue?: ReactNode;
} & StackProps;

/**
 * Shared page header shell.
 * Inputs: title, subtitle, optional right-side controls
 * Output: styled header block
 * Purpose: keep page titles visually consistent across the app.
 */
export default function PageHeader({
  titleValue,
  subtitleValue,
  rightContentValue,
  ...restValue
}: PageHeaderProps) {
  return (
    <Stack gap={2} mb={6} {...restValue}>
      <HStack justify="space-between" align="start" flexWrap="wrap" gap={3}>
        <Stack gap={1}>
          <Heading size="lg" color="brand.900">
            {titleValue}
          </Heading>
          <Text color="brand.700">{subtitleValue}</Text>
        </Stack>

        {rightContentValue ? <HStack gap={3} flexWrap="wrap">{rightContentValue}</HStack> : null}
      </HStack>
    </Stack>
  );
}
