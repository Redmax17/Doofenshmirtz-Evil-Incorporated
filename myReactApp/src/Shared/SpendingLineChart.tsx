/*
  Spending Chart that takes Values from the DB/Plaid and organizes it into a spent by X timeframe in either a line or bar graph form 
  based on the length of time frame specified

  Unique Imports:
  Chart JS components.
  types from shared types file.
*/

import React from "react";
import { Bar, Line } from "react-chartjs-2";
import { Box, Flex, Heading, Spinner, Text, Center } from "@chakra-ui/react";
import {
  Chart as chartJsValue,
  LineElement,
  PointElement,
  BarElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { apiClient } from "../Shared/apiClient"; // adjust path if needed
import {SpendingOverTimeResponse, LineChartProps, TimeFrameKey, SpendingOverTimePoint, TimeGrouping} from "./types"

//Chart JS has you register the imports
chartJsValue.register(
  LineElement,
  PointElement,
  BarElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler
);


function pad2Value(numValue: number) {
  //if the value is not long enough it pads it with 0s
  return String(numValue).padStart(2, "0");
}

function startOfDayValue(dateValue: Date) {
  //sets the time value of the day passed to 0 to ensure that all data is recieved for that day not just from where it starts
  const dValue = new Date(dateValue);
  dValue.setHours(0, 0, 0, 0);
  return dValue;
}

function addDaysValue(dateValue: Date, daysValue: number) {
  //returns a date that is number "days" away from "date"
  const dValue = new Date(dateValue);
  dValue.setDate(dValue.getDate() + daysValue);
  return dValue;
}

function formatDayKeyValue(dateValue: Date) {
  //helper function to set the date format properly for days
  return `${dateValue.getFullYear()}-${pad2Value(dateValue.getMonth() + 1)}-${pad2Value(dateValue.getDate())}`;
}

function formatMonthKeyValue(dateValue: Date) {
  //helper function to set the date format properly for months
  return `${dateValue.getFullYear()}-${pad2Value(dateValue.getMonth() + 1)}`;
}

function resolveTimeBoundsValue(timeFrameValue: TimeFrameKey) {
  //takes the time frame passed and returns the time range it coresponds to
  const nowValue = startOfDayValue(new Date());

  if (timeFrameValue === "mtd") {
    return { startValue: new Date(nowValue.getFullYear(), nowValue.getMonth(), 1), endValue: nowValue };
  }
  else if (timeFrameValue === "last7") {
    return { startValue: addDaysValue(nowValue, -6), endValue: nowValue };
  }
  else if (timeFrameValue === "last30") {
    return { startValue: addDaysValue(nowValue, -29), endValue: nowValue };
  }
  else if (timeFrameValue === "ytd") {
    return { startValue: new Date(nowValue.getFullYear(), 0, 1), endValue: nowValue };
  }
  else { //if all time return last 10 years
    return { startValue: new Date(nowValue.getFullYear() - 9, 0, 1), endValue: nowValue };
  }
}

function shouldCompoundValue(timeFrameValue: TimeFrameKey, groupingValue: TimeGrouping) {
  //Function that tests the timeframe and returns wether or not the graph should compound values or do batch totals
  if (groupingValue !== "day") return false;
  return timeFrameValue === "mtd" || timeFrameValue === "last7" || timeFrameValue === "last30";
}

function buildFullTimelineKeysValue(timeFrameValue: TimeFrameKey, groupingValue: TimeGrouping) {
  //builds out the graphs X key labels
  const { startValue, endValue } = resolveTimeBoundsValue(timeFrameValue);

  if (groupingValue === "day") {
    const keysValue: string[] = [];
    let cursorValue = startOfDayValue(startValue);
    const endDayValue = startOfDayValue(endValue);

    while (cursorValue <= endDayValue) {
      keysValue.push(formatDayKeyValue(cursorValue));
      cursorValue = addDaysValue(cursorValue, 1);
    }
    return keysValue;
  }

  if (groupingValue === "month") {
    const keysValue: string[] = [];
    const startMonthValue = new Date(startValue.getFullYear(), startValue.getMonth(), 1);
    const endMonthValue = new Date(endValue.getFullYear(), endValue.getMonth(), 1);

    let cursorValue = new Date(startMonthValue);
    while (cursorValue <= endMonthValue) {
      keysValue.push(formatMonthKeyValue(cursorValue));
      cursorValue = new Date(cursorValue.getFullYear(), cursorValue.getMonth() + 1, 1);
    }
    return keysValue;
  }

  // year timeline
  const keysValue: string[] = [];
  for (let yearValue = startValue.getFullYear(); yearValue <= endValue.getFullYear(); yearValue += 1) {
    keysValue.push(String(yearValue));
  }
  return keysValue;
}

function normalizeSeriesToTimelineValue(rawPointsValue: SpendingOverTimePoint[], timelineKeysValue: string[]) {
  //attaches the Key labels to the data points
  const amountByKeyValue = new Map<string, number>();

  for (const pointValue of rawPointsValue) {
    amountByKeyValue.set(String(pointValue.label), Number(pointValue.amount ?? 0));
  }

  return timelineKeysValue.map((keyValue) => ({
    label: keyValue,
    amount: Number((amountByKeyValue.get(keyValue) ?? 0).toFixed(2)),
  }));
}

function buildCumulativePointsValue(pointsValue: SpendingOverTimePoint[]) {
  //takes the spending values and cumulates them for the line graphs
  let runningTotalValue = 0;
  return pointsValue.map((pointValue) => {
    runningTotalValue += Number(pointValue.amount || 0);
    return { ...pointValue, amount: Number(runningTotalValue.toFixed(2)) };
  });
}

function formatDisplayLabelValue(labelValue: string, groupingValue: TimeGrouping) {
  //Format the dates in the keys to correct display format for each timeframe
  try {
    if (groupingValue === "day") {
      const dValue = new Date(`${labelValue}T00:00:00`);
      return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(dValue);
    }
    if (groupingValue === "month") {
      const dValue = new Date(`${labelValue}-01T00:00:00`);
      return new Intl.DateTimeFormat("en-US", { month: "short" }).format(dValue);
    }
    return labelValue;
  } catch {
    return labelValue;
  }
}

export default function SpendingLineChart({ titleValue = "Spending Over Time", timeFrameValue, lineColor="rgba(215, 40, 25, 0.65)"}: LineChartProps) {
  //the linechart build

  //these variables are for the page loading handling
  const [isLoadingValue, setIsLoadingValue] = React.useState(true);
  const [errorValue, setErrorValue] = React.useState<string | null>(null);

  //Data values
  const [dataValue, setDataValue] = React.useState<SpendingOverTimeResponse | null>(null);

  React.useEffect(() => {
    let isMountedValue = true;

    async function loadValue() {
      //this function calls the server via the apiClient helper to pull the transaction data 
      try {
        setIsLoadingValue(true);
        setErrorValue(null);

        const resValue = await apiClient.get<SpendingOverTimeResponse>(
          `/api/v1/dashboard/spending-over-time?timeFrame=${encodeURIComponent(timeFrameValue)}`
        );

        if (!isMountedValue) return;
        setDataValue(resValue);
      } catch (errValue) {
        if (!isMountedValue) return;
        setErrorValue(errValue instanceof Error ? errValue.message : String(errValue));
      } finally {
        if (!isMountedValue) return;
        setIsLoadingValue(false);
      }
    }

    loadValue();
    return () => {
      isMountedValue = false;
    };
  }, [timeFrameValue]);

  //this variable store the key grouping value
  const groupingValue = dataValue?.grouping ?? "day";

  //this variable stores the raw data
  const rawPointsValue = dataValue?.points ?? [];

  //these variables store the Keys and the Values as well as wether or not the data is cumulative
  const { pointsValue, isCumulativeValue } = React.useMemo(() => {
    const timelineKeysValue = buildFullTimelineKeysValue(timeFrameValue, groupingValue);
    const normalizedPointsValue = normalizeSeriesToTimelineValue(rawPointsValue, timelineKeysValue);

    const compoundValue = shouldCompoundValue(timeFrameValue, groupingValue);
    const finalPointsValue = compoundValue ? buildCumulativePointsValue(normalizedPointsValue) : normalizedPointsValue;

    return { pointsValue: finalPointsValue, isCumulativeValue: compoundValue };
  }, [rawPointsValue, timeFrameValue, groupingValue]);


  //this variable stores the graph labels
  const labelsValue = pointsValue.map((p) => formatDisplayLabelValue(p.label, groupingValue));
  //this variable stores the total values
  const valuesValue = pointsValue.map((p) => p.amount);

  //Chart Config Variables
  const chartDataValue = {
    labels: labelsValue,
    datasets: [
      {
        label: isCumulativeValue ? "Cumulative Spending" : "Spending",
        data: valuesValue,
        borderWidth: 2,
        tension: 0.3,
        pointRadius: isCumulativeValue ? 1.5 : 0, // bars don’t need points anyway
        borderColor: lineColor,
        backgroundColor: lineColor,
      },
    ],
  };

  const commonOptionsValue = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" as const },
      tooltip: {
        callbacks: {
          label: (ctxValue: any) => {
            const numberValue = Number(ctxValue?.parsed?.y ?? ctxValue?.parsed ?? 0);
            return `$${numberValue.toFixed(2)}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          autoSkip: true,
          maxRotation: 0,
          maxTicksLimit: groupingValue === "day" ? 8 : 12,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (valueValue: any) => `$${Number(valueValue).toFixed(0)}`,
        },
      },
    },
  };

  const lineOptionsValue = {
    ...commonOptionsValue,
    elements: {
      line: { tension: 0.3 },
    },
  };

  const barOptionsValue = {
    ...commonOptionsValue,
  };

  return (
    //chart Title
    <Box bg="white" borderRadius="lg" p={4} boxShadow="md" w="100%">
      <Flex align="center" justify="center" mb={3}>
        <Center><Heading size="lg">{titleValue}</Heading></Center>
      </Flex>

      //loading check
      {isLoadingValue ? (
        <Flex align="center" justify="center" h="300px">
          <Spinner />
        </Flex>
      ) : errorValue ? (
        <Box p={3} bg="red.50" borderRadius="md">
          <Text fontSize="sm" color="red.700">
            {errorValue}
          </Text>
        </Box>
      ) : (
        //Graph with if bar/line test cumulative = line graph and vice versa
        <Box h="300px">
          {isCumulativeValue ? (
            <Line data={chartDataValue} options={lineOptionsValue as any} />
          ) : (
            <Bar data={chartDataValue} options={barOptionsValue as any} />
          )}
        </Box>
      )}
    </Box>
  );
}
