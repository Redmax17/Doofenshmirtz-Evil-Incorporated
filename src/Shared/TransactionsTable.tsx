import { Badge, Box, Table, Text } from "@chakra-ui/react";
import type { TransactionRow } from "./types";
import { formatDate, formatMoney, safeText } from "./SharedFunctions";

type TransactionsTableProps = {
  rowsValue: TransactionRow[];
  emptyTextValue?: string;
};

/**
 * Shared transactions table.
 * Inputs: transaction rows
 * Output: formatted table or empty state
 * Purpose: reuse the same transaction rendering on dashboard + transactions page.
 */
export default function TransactionsTable({
  rowsValue,
  emptyTextValue = "No transactions found for this selection.",
}: TransactionsTableProps) {
  if (!rowsValue.length) {
    return (
      <Box bg="brand.50" borderWidth="1px" borderColor="blackAlpha.100" borderRadius="18px" p={5}>
        <Text color="brand.700">{emptyTextValue}</Text>
      </Box>
    );
  }

  return (
    <Box bg="brand.50" borderWidth="1px" borderColor="blackAlpha.100" borderRadius="18px" overflow="hidden">
      <Table.Root size="sm" variant="line">
        <Table.Header>
          <Table.Row bg="rgba(146,130,186,0.08)">
            <Table.ColumnHeader>Date</Table.ColumnHeader>
            <Table.ColumnHeader>Name</Table.ColumnHeader>
            <Table.ColumnHeader>Category</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="end">Amount</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rowsValue.map((rowValue) => {
            const isExpenseValue = Number(rowValue.amount) > 0;

            return (
              <Table.Row key={rowValue.transactionId}>
                <Table.Cell color="brand.700">{formatDate(rowValue.date)}</Table.Cell>
                <Table.Cell fontWeight={700} color="brand.900">
                  {safeText(rowValue.name)}
                </Table.Cell>
                <Table.Cell>
                  <Badge bg="brand.100" color="brand.700" borderRadius="999px" px={2} py={1}>
                    {safeText(rowValue.category)}
                  </Badge>
                </Table.Cell>
                <Table.Cell textAlign="end" fontWeight={900} color={isExpenseValue ? "negatives.400" : "accent.400"}>
                  {isExpenseValue ? "-" : "+"}
                  {formatMoney(Math.abs(Number(rowValue.amount ?? 0)))}
                </Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}
