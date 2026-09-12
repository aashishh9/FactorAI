"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type QualityRecord = {
  id: number;
  machine_id: number;
  inspected_count: number;
  defect_count: number;
  recorded_at: string;
};

type QualityChartProps = {
  records: QualityRecord[];
  machineId: number;
};

export default function QualityChart({
  records,
  machineId,
}: QualityChartProps) {
  const machineRecords = records
    .filter((record) => record.machine_id === machineId)
    .sort(
      (a, b) =>
        new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime(),
    );

  const chartData = machineRecords.map((record) => ({
    time: new Date(record.recorded_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    defectRate:
      record.inspected_count > 0
        ? Number(
            ((record.defect_count / record.inspected_count) * 100).toFixed(2),
          )
        : 0,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-slate-500">
        No quality data available.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
            top: 10,
            right: 10,
            left: -10,
            bottom: 0,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />

          <XAxis
            dataKey="time"
            tick={{ fill: "#64748b", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            tick={{ fill: "#64748b", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            unit="%"
          />

          <Tooltip
            contentStyle={{
              backgroundColor: "#020617",
              border: "1px solid #1e293b",
              borderRadius: "10px",
              color: "#fff",
            }}
          />

          <Line
            type="monotone"
            dataKey="defectRate"
            stroke="#ef4444"
            strokeWidth={3}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
            name="Defect Rate"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
