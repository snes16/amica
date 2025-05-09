"use client"

import { useMemo, useState } from "react"
import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from "chart.js"
import "chartjs-adapter-date-fns"
import { Button } from "./ui/button"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale)

const timeFrames = [
  { label: "1D", ms: 1 * 24 * 60 * 60 * 1000 },
  { label: "1W", ms: 7 * 24 * 60 * 60 * 1000 },
  { label: "1M", ms: 30 * 24 * 60 * 60 * 1000 },
  { label: "3M", ms: 90 * 24 * 60 * 60 * 1000 },
  { label: "1Y", ms: 365 * 24 * 60 * 60 * 1000 },
  { label: "All", ms: Infinity },
]

const getTimeUnit = (label: string): "minute" | "hour" | "day" | "month" => {
  switch (label) {
    case "1D":
      return "minute"
    case "1W":
      return "hour"
    case "1M":
    case "3M":
      return "day"
    case "1Y":
      return "month"
    default:
      return "day"
  }
}

export function PriceChart({ priceHistory }: { priceHistory: { x: string; y: number }[] }) {
  const [selectedTimeFrame, setSelectedTimeFrame] = useState(timeFrames[2]) // Default: 1M

  const latestTimestamp = useMemo(() => {
    return priceHistory.length > 0
      ? new Date(priceHistory[priceHistory.length - 1].x).getTime()
      : Date.now()
  }, [priceHistory])

  const filteredData = useMemo(() => {
    if (selectedTimeFrame.ms === Infinity) return priceHistory
    return priceHistory.filter((d) => new Date(d.x).getTime() >= latestTimestamp - selectedTimeFrame.ms)
  }, [priceHistory, selectedTimeFrame, latestTimestamp])

  const chartData = {
    datasets: [
      {
        label: "Price",
        data: filteredData,
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.5)",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
      },
    ],
  }

  const chartOptions = useMemo(() => ({
    responsive: true,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      x: {
        type: "time" as const,
        time: {
          unit: getTimeUnit(selectedTimeFrame.label),
        },
        grid: { display: false },
      },
      y: {
        position: "right" as const,
        grid: {
          color: "rgba(107, 114, 128, 0.1)",
        },
        ticks: {
          callback: (value: any) => `$${value.toLocaleString()}`,
        },
      },
    },
  }), [selectedTimeFrame])

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div className="text-2xl font-bold font-orbitron text-gray-800">
          {priceHistory.length ? `${priceHistory[priceHistory.length - 1].y.toFixed(4)} AIUS` : "Loading..."}
        </div>
        <div className="flex space-x-2">
          {timeFrames.map((tf) => (
            <Button
              key={tf.label}
              variant={selectedTimeFrame.label === tf.label ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTimeFrame(tf)}
              className="font-roboto-mono"
            >
              {tf.label}
            </Button>
          ))}
        </div>
      </div>
      <Line options={chartOptions} data={chartData} />
    </div>
  )
}
