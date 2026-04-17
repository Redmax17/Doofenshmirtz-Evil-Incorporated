import { Box, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

type StatCardProps = {
  labelValue: string;
  valueValue: string;
  toneColorValue?: string;
  helperValue?: string;
  footerValue?: ReactNode;
};

/**
 * Shared summary stat card.
 * Inputs: label, value, optional helper/footer
 * Output: styled metric card
 * Purpose: reusable KPI card used by Transactions/Analytics/Account pages.
 */
export default function StatCard({
  labelValue,
  valueValue,
  toneColorValue = "brand.900",
  helperValue,
  footerValue,
}: StatCardProps) {
  return (
    <Box bg="brand.50" borderWidth="1px" borderColor="blackAlpha.100" borderRadius="18px" p={5}>
      <Text fontSize="sm" fontWeight={900} color={toneColorValue}>
        {labelValue}
      </Text>
      <Text fontSize="2xl" fontWeight={900} color="brand.900" mt={1}>
        {valueValue}
      </Text>
      {helperValue ? (
        <Text mt={2} fontSize="sm" color="brand.700">
          {helperValue}
        </Text>
      ) : null}
      {footerValue ? <Box mt={3}>{footerValue}</Box> : null}
    </Box>
  );
}
