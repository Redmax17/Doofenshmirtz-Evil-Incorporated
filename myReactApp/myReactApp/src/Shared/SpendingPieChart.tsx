//Spending by category Pie Chart that takes Values from the DB/Plaid and Displays the amount spent per category as a pie chart 
//with a filterable legend and hoverable labels
/*
  Unique Imports:
  Chart JS components.
  types from shared types file.
*/

import { useEffect, useMemo, useState } from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJs, ArcElement, Tooltip, Legend } from "chart.js";
import { apiClient } from "./apiClient";
import type {SpendingByCategoryRow, SpendingPieChartProps} from "./types";
import { formatMoney, safeText, getAmountToneColor } from "./SharedFunctions";

//chart js requires registering imports
ChartJs.register(ArcElement, Tooltip, Legend);

export default function SpendingPieChart({timeFrame, accountIdValue = "all"}: SpendingPieChartProps) {
  //function that ecports the chart component 

  //these variables store the data by row
  const [dataRows, setDataRows] = useState<SpendingByCategoryRow[]>([]);
  const [errorText, setErrorText] = useState<string>("");

  useEffect(() => {
    const loadData = async () => {
      //tries to call the server using apiclient helper to pull transaction data
      try {
        setErrorText("");
        const rowsValue = await apiClient.get<SpendingByCategoryRow[]>(
          `/api/v1/dashboard/spending-by-category?timeFrame=${encodeURIComponent(timeFrame)}&accountId=${encodeURIComponent(accountIdValue)}`
        );
        setDataRows(rowsValue);
      } catch (errValue) {
        setErrorText(
          errValue instanceof Error
            ? errValue.message
            : "Failed to load chart data",
        );
      }
    };

    void loadData();
  }, [timeFrame, accountIdValue]);

  //variables that store the pie chart configuration
  const chartData = useMemo(() => {
    const labelsValue = dataRows.map((r) => r.category);
    const valuesValue = dataRows.map((r) => r.total);

    const backgroundColors = labelsValue.map((_, indexValue) => {
      const hueValue = (indexValue * 47) % 360;
      return `hsl(${hueValue} 70% 55%)`;
    });

    const borderColors = labelsValue.map((_, indexValue) => {
      const hueValue = (indexValue * 47) % 360;
      return `hsl(${hueValue} 70% 35%)`;
    });

    return {
      labels: labelsValue,
      datasets: [
        {
          label: "Spending",
          data: valuesValue,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1,
        },
      ],
    };
  }, [dataRows]);

  const chartOptions = {
    plugins: {
      legend: {
        tooltip: {
          callbacks: {
            label: (ctx: any) => {
              const value = Number(ctx.raw ?? 0);
              return `${ctx.label}: ${formatMoney(value)}`;
            }
          }
        },
        position: "bottom" as const,
        align: "center" as const,
        labels: {
          usePointStyle: true,
          padding: 16,
          boxWidth: 10
        }
        
      }
    },
    layout: {
      padding: {
        left: 0,
        right: 0
      }
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  if (errorText) {
    return <div style={{ opacity: 0.85 }}>Chart error: {errorText}</div>;
  }

  if (!dataRows.length) {
    return <div style={{ opacity: 0.85 }}>Loading spending breakdown…</div>;
  }

  //retruns the pie chart with the data.
  return (
      <Pie height="420" data={chartData} options={chartOptions} />
  );
}
