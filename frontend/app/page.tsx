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

type Factory = {
  id: number;
  name: string;
  location: string;
};

type Machine = {
  id: number;
  name: string;
  machine_type: string;
  status: string;
  factory_id: number;
};

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [factory, setFactory] = useState<Factory | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);

  const [question, setQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const [selectedMachine, setSelectedMachine] = useState<number | null>(null);
  const [machineAnalysis, setMachineAnalysis] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [dashboardResponse, factoryResponse] = await Promise.all([
          fetch("http://127.0.0.1:8000/dashboard/summary"),
          fetch("http://127.0.0.1:8000/factory/"),
        ]);

        if (!dashboardResponse.ok || !factoryResponse.ok) {
          throw new Error("Failed to load dashboard data");
        }

        const dashboardData = await dashboardResponse.json();

        const factories: Factory[] = await factoryResponse.json();

        setData(dashboardData);

        if (factories.length > 0) {
          const currentFactory = factories[0];

          setFactory(currentFactory);

          const machinesResponse = await fetch(
            `http://127.0.0.1:8000/factory/${currentFactory.id}/machines`,
          );

          if (!machinesResponse.ok) {
            throw new Error("Failed to load machines");
          }

          const machinesData = await machinesResponse.json();

          setMachines(machinesData);
        }
      } catch (error) {
        console.error("Dashboard error:", error);

        setError(
          "Could not load FactorAI data. Make sure the backend and PostgreSQL are running.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  async function analyzeMachine(machineId: number) {
    if (selectedMachine === machineId) {
      setSelectedMachine(null);
      setMachineAnalysis("");
      return;
    }

    setSelectedMachine(machineId);
    setMachineAnalysis("FactorAI is analyzing this machine...");

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/ai/analyze/${machineId}`,
      );

      if (!response.ok) {
        throw new Error("Machine analysis failed");
      }

      const result = await response.json();

      setMachineAnalysis(result.analysis || "No analysis available.");
    } catch (error) {
      console.error("Machine analysis error:", error);

      setMachineAnalysis(
        "FactorAI could not analyze this machine. Make sure Ollama is running.",
      );
    }
  }

  async function askFactorAI() {
    if (!question.trim() || aiLoading) {
      return;
    }

    setAiLoading(true);
    setAiAnswer("");

    try {
      const response = await fetch("http://127.0.0.1:8000/ai/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("AI request failed");
      }

      const result = await response.json();

      setAiAnswer(result.answer);
    } catch (error) {
      console.error("AI error:", error);

      setAiAnswer(
        "FactorAI could not complete the analysis. Make sure the backend, PostgreSQL, and Ollama are running.",
      );
    } finally {
      setAiLoading(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      askFactorAI();
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-blue-500" />

          <p className="text-gray-400">Loading FactorAI...</p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 px-6 text-white">
        <div className="max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center">
          <h1 className="text-xl font-semibold">FactorAI</h1>

          <p className="mt-3 text-sm leading-6 text-gray-400">
            {error || "Unable to load dashboard."}
          </p>

          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-medium transition hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* HEADER */}

      <header className="border-b border-gray-800">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">FactorAI</h1>

              <p className="mt-1 text-sm text-gray-400">
                AI-powered factory operations
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="h-2 w-2 rounded-full bg-green-400" />
              System Online
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        {/* FACTORY */}

        {factory && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold">{factory.name}</h2>

            <p className="mt-1 text-sm text-gray-400">{factory.location}</p>
          </div>
        )}

        {/* OVERVIEW */}

        <section>
          <h2 className="mb-6 text-xl font-semibold">Factory Overview</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Total Machines" value={data.total_machines} />

            <MetricCard title="Active Machines" value={data.active_machines} />

            <MetricCard
              title="Under Maintenance"
              value={data.maintenance_machines}
            />

            <MetricCard
              title="Production Achievement"
              value={`${data.production_achievement}%`}
            />
          </div>
        </section>

        {/* PRODUCTION + QUALITY */}

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
            <h3 className="text-lg font-semibold">Production</h3>

            <div className="mt-5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Production</span>

                <span>
                  {data.total_production.toLocaleString()} /{" "}
                  {data.total_target.toLocaleString()}
                </span>
              </div>

              <ProgressBar
                value={data.total_production}
                max={data.total_target}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
            <h3 className="text-lg font-semibold">Quality</h3>

            <div className="mt-5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Defect Rate</span>

                <span>{data.defect_rate}%</span>
              </div>

              <div className="mt-3 text-sm text-gray-400">
                {data.total_defects.toLocaleString()} defects from{" "}
                {data.total_inspected.toLocaleString()} inspections
              </div>
            </div>
          </div>
        </div>

        {/* MACHINES */}

        <section className="mt-8">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Machines</h2>

              <p className="mt-1 text-sm text-gray-500">
                Current machine status across the factory
              </p>
            </div>

            <span className="text-sm text-gray-500">
              {machines.length} machines
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {machines.map((machine) => (
              <MachineCard
                key={machine.id}
                machine={machine}
                onAnalyze={analyzeMachine}
                selected={selectedMachine === machine.id}
              />
            ))}
          </div>

          {/* MACHINE AI ANALYSIS */}

          {selectedMachine !== null && (
            <div className="mt-5 rounded-2xl border border-blue-500/20 bg-gray-900 p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-xs font-semibold text-blue-400">
                  AI
                </div>

                <div>
                  <h3 className="font-semibold">Machine Analysis</h3>

                  <p className="text-xs text-gray-500">
                    Based on production and quality data
                  </p>
                </div>
              </div>

              <p className="whitespace-pre-wrap leading-7 text-gray-300">
                {machineAnalysis}
              </p>
            </div>
          )}
        </section>

        {/* FACTORAI ASSISTANT */}

        <section className="mt-8 rounded-2xl border border-gray-800 bg-gray-900">
          <div className="border-b border-gray-800 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-sm font-semibold text-blue-400">
                AI
              </div>

              <div>
                <h2 className="text-lg font-semibold">FactorAI Assistant</h2>

                <p className="text-sm text-gray-400">
                  Ask questions about your factory operations
                </p>
              </div>
            </div>
          </div>

          <div className="min-h-40 p-6">
            {aiLoading ? (
              <div className="flex items-center gap-3 text-gray-400">
                <div className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
                FactorAI is analyzing your factory data...
              </div>
            ) : aiAnswer ? (
              <div>
                <div className="mb-3 text-xs font-medium uppercase tracking-wider text-blue-400">
                  FactorAI Analysis
                </div>

                <p className="whitespace-pre-wrap leading-7 text-gray-200">
                  {aiAnswer}
                </p>
              </div>
            ) : (
              <div className="text-gray-500">
                Ask FactorAI something about your factory.
                <div className="mt-4 flex flex-wrap gap-2">
                  <Suggestion
                    text="Why did CNC-01 production drop?"
                    onClick={() =>
                      setQuestion("Why did CNC-01 production drop?")
                    }
                  />

                  <Suggestion
                    text="Which machine has the highest defect rate?"
                    onClick={() =>
                      setQuestion("Which machine has the highest defect rate?")
                    }
                  />

                  <Suggestion
                    text="What machines are under maintenance?"
                    onClick={() =>
                      setQuestion("What machines are under maintenance?")
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-800 p-6">
            <div className="flex flex-col gap-3 sm:flex-row">
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask FactorAI..."
                rows={2}
                className="flex-1 resize-none rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-blue-500"
              />

              <button
                onClick={askFactorAI}
                disabled={aiLoading || !question.trim()}
                className="rounded-xl bg-blue-500 px-6 py-3 text-sm font-medium transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40 sm:self-end"
              >
                {aiLoading ? "Analyzing..." : "Ask"}
              </button>
            </div>

            <p className="mt-2 text-xs text-gray-600">
              Press Enter to ask • Shift + Enter for a new line
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}

/* =========================================================
   METRIC CARD
========================================================= */

function MetricCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
      <p className="text-sm text-gray-400">{title}</p>

      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

/* =========================================================
   PROGRESS BAR
========================================================= */

function ProgressBar({ value, max }: { value: number; max: number }) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  return (
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-800">
      <div
        className="h-full rounded-full bg-blue-500 transition-all"
        style={{
          width: `${percentage}%`,
        }}
      />
    </div>
  );
}

/* =========================================================
   MACHINE CARD
========================================================= */

function MachineCard({
  machine,
  onAnalyze,
  selected,
}: {
  machine: Machine;
  onAnalyze: (machineId: number) => void;
  selected: boolean;
}) {
  const isMaintenance = machine.status.toLowerCase() === "maintenance";

  const isActive = machine.status.toLowerCase() === "active";

  return (
    <div
      className={`rounded-2xl border bg-gray-900 p-5 transition ${
        selected
          ? "border-blue-500/50"
          : "border-gray-800 hover:border-gray-700"
      }`}
    >
      {/* MACHINE HEADER */}

      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold">{machine.name}</h3>

          <p className="mt-1 text-sm text-gray-500">{machine.machine_type}</p>
        </div>

        <div
          className={`flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${
            isActive
              ? "bg-green-500/10 text-green-400"
              : isMaintenance
                ? "bg-yellow-500/10 text-yellow-400"
                : "bg-gray-500/10 text-gray-400"
          }`}
        >
          <div
            className={`h-1.5 w-1.5 rounded-full ${
              isActive
                ? "bg-green-400"
                : isMaintenance
                  ? "bg-yellow-400"
                  : "bg-gray-400"
            }`}
          />

          {machine.status}
        </div>
      </div>

      {/* MACHINE ID */}

      <div className="mt-6 flex items-center justify-between border-t border-gray-800 pt-4">
        <span className="text-xs text-gray-600">Machine ID</span>

        <span className="text-xs text-gray-400">#{machine.id}</span>
      </div>

      {/* ANALYZE BUTTON */}

      <button
        onClick={() => onAnalyze(machine.id)}
        className={`mt-4 w-full rounded-lg px-3 py-2 text-xs font-medium transition ${
          selected
            ? "bg-blue-500/10 text-blue-400"
            : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
        }`}
      >
        {selected ? "Hide Analysis" : "Analyze Machine"}
      </button>
    </div>
  );
}

/* =========================================================
   AI SUGGESTION
========================================================= */

function Suggestion({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-left text-xs text-gray-400 transition hover:border-blue-500 hover:text-white"
    >
      {text}
    </button>
  );
}
