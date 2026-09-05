"use client";

import { useEffect, useState } from "react";

type DashboardData = {
  total_machines: number;
  active_machines: number;
  maintenance_machines: number;
  total_production: number;
  total_target: number;
  production_achievement: number;
  total_inspected: number;
  total_defects: number;
  defect_rate: number;
};

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/dashboard/summary")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        return response.json();
      })
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not connect to FactorAI backend.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">Loading FactorAI...</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">FactorAI</h1>
          <p className="mt-2 text-red-400">{error}</p>
          <p className="mt-2 text-sm text-slate-500">
            Make sure the FastAPI backend is running on port 8000.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Factor<span className="text-blue-400">AI</span>
            </h1>

            <p className="text-slate-400 mt-1">AI-powered factory operations</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-green-400" />

            <span className="text-sm text-slate-400">System Operational</span>
          </div>
        </header>

        {/* Factory */}
        <section className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Manufacturing Overview</h2>

              <p className="text-sm text-slate-500 mt-1">
                FactorAI Manufacturing Plant · Kolhapur, Maharashtra
              </p>
            </div>

            <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-sm">
              Live
            </span>
          </div>
        </section>

        {/* KPI Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <MetricCard
            title="Total Machines"
            value={data.total_machines}
            subtitle={`${data.active_machines} active`}
          />

          <MetricCard
            title="Production Achievement"
            value={`${data.production_achievement}%`}
            subtitle={`${data.total_production} / ${data.total_target}`}
          />

          <MetricCard
            title="Defect Rate"
            value={`${data.defect_rate}%`}
            subtitle={`${data.total_defects} defects`}
          />

          <MetricCard
            title="Maintenance"
            value={data.maintenance_machines}
            subtitle="machines requiring attention"
          />
        </section>

        {/* Production */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold">
                  Production Performance
                </h2>

                <p className="text-sm text-slate-500">
                  Current production versus target
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <ProgressBar
                label="Production"
                value={data.total_production}
                max={data.total_target}
              />

              <ProgressBar
                label="Quality"
                value={data.total_inspected - data.total_defects}
                max={data.total_inspected}
              />
            </div>
          </div>

          {/* AI Insight */}
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                ✦
              </div>

              <div>
                <h2 className="font-semibold">FactorAI Insight</h2>

                <p className="text-xs text-slate-500">
                  AI operations assistant
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-6">
              Production data is currently available for analysis. FactorAI can
              identify production deviations, quality problems and potential
              maintenance issues.
            </p>

            <button className="mt-6 w-full rounded-xl bg-blue-500 hover:bg-blue-600 transition px-4 py-3 text-sm font-medium">
              Ask FactorAI
            </button>
          </div>
        </section>

        {/* Machine Status */}
        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold mb-5">Machine Status</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MachineCard name="CNC-01" type="CNC" status="Active" />

            <MachineCard name="CNC-02" type="CNC" status="Active" />

            <MachineCard
              name="FURNACE-01"
              type="Induction Furnace"
              status="Active"
            />

            <MachineCard
              name="PRESS-01"
              type="Hydraulic Press"
              status="Maintenance"
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <p className="text-sm text-slate-500">{title}</p>

      <p className="text-3xl font-bold mt-3">{value}</p>

      <p className="text-sm text-slate-500 mt-2">{subtitle}</p>
    </div>
  );
}

function ProgressBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-slate-400">{label}</span>

        <span className="text-slate-300">{Math.round(percentage)}%</span>
      </div>

      <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function MachineCard({
  name,
  type,
  status,
}: {
  name: string;
  type: string;
  status: string;
}) {
  const active = status === "Active";

  return (
    <div className="rounded-xl border border-slate-800 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{name}</p>

          <p className="text-xs text-slate-500 mt-1">{type}</p>
        </div>

        <div
          className={`h-2.5 w-2.5 rounded-full ${
            active ? "bg-green-400" : "bg-yellow-400"
          }`}
        />
      </div>

      <p
        className={`text-xs mt-4 ${
          active ? "text-green-400" : "text-yellow-400"
        }`}
      >
        {status}
      </p>
    </div>
  );
}
