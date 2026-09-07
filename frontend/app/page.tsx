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

type AnomalyItem = {
  type: string;
  severity: string;
  message: string;
};

type Anomaly = {
  machine_id: number;
  machine: string;
  status: string;
  anomaly_detected: boolean;
  anomaly_count: number;
  anomalies: AnomalyItem[];
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

type MaintenanceTicket = {
  id: number;
  machine_id: number;
  machine: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  created_at: string;
};

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);

  const [factory, setFactory] = useState<Factory | null>(null);

  const [machines, setMachines] = useState<Machine[]>([]);

  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);

  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);

  const [question, setQuestion] = useState("");

  const [aiAnswer, setAiAnswer] = useState("");

  const [machineAnalysis, setMachineAnalysis] = useState("");

  const [selectedMachine, setSelectedMachine] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);

  const [ticketsLoading, setTicketsLoading] = useState(true);

  const [analysisLoading, setAnalysisLoading] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);

  const [ticketLoading, setTicketLoading] = useState(false);

  const [ticketMessage, setTicketMessage] = useState("");

  const [ticketCreated, setTicketCreated] = useState(false);

  const [error, setError] = useState("");

  // -----------------------------------------
  // LOAD DASHBOARD DATA
  // -----------------------------------------

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setTicketsLoading(true);
        setError("");

        const [
          dashboardResponse,
          factoryResponse,
          anomalyResponse,
          ticketResponse,
        ] = await Promise.all([
          fetch("http://127.0.0.1:8000/dashboard/summary"),

          fetch("http://127.0.0.1:8000/factory/"),

          fetch("http://127.0.0.1:8000/anomalies/"),

          fetch("http://127.0.0.1:8000/maintenance/"),
        ]);

        if (
          !dashboardResponse.ok ||
          !factoryResponse.ok ||
          !anomalyResponse.ok ||
          !ticketResponse.ok
        ) {
          throw new Error("Failed to load dashboard data");
        }

        const dashboardData = await dashboardResponse.json();

        const factories = await factoryResponse.json();

        const anomalyData = await anomalyResponse.json();

        const ticketData = await ticketResponse.json();

        setData(dashboardData);

        setFactory(factories[0] ?? null);

        setAnomalies(anomalyData.anomalies ?? []);

        setTickets(ticketData.tickets ?? []);

        // Load machines
        if (factories[0]) {
          const machineResponse = await fetch(
            `http://127.0.0.1:8000/factory/${factories[0].id}/machines`,
          );

          if (!machineResponse.ok) {
            throw new Error("Failed to load machines");
          }

          const machineData = await machineResponse.json();

          setMachines(machineData);
        }
      } catch (error) {
        console.error(error);

        setError("FactorAI could not load factory data.");
      } finally {
        setLoading(false);
        setTicketsLoading(false);
      }
    };

    loadDashboard();
  }, []);

  // -----------------------------------------
  // ANALYZE MACHINE
  // -----------------------------------------

  const analyzeMachine = async (machineId: number) => {
    try {
      setSelectedMachine(machineId);

      setMachineAnalysis("");

      setAnalysisLoading(true);

      setTicketMessage("");

      setTicketCreated(false);

      const response = await fetch(
        `http://127.0.0.1:8000/ai/analyze/${machineId}`,
      );

      if (!response.ok) {
        throw new Error("Failed to analyze machine");
      }

      const result = await response.json();

      setMachineAnalysis(result.analysis);
    } catch (error) {
      console.error(error);

      setMachineAnalysis("FactorAI could not analyze this machine right now.");
    } finally {
      setAnalysisLoading(false);
    }
  };

  // -----------------------------------------
  // CREATE MAINTENANCE TICKET
  // -----------------------------------------

  const createMaintenanceTicket = async () => {
    if (selectedMachine === null || !machineAnalysis) {
      return;
    }

    const machine = machines.find((item) => item.id === selectedMachine);

    if (!machine) {
      return;
    }

    try {
      setTicketLoading(true);

      setTicketMessage("");

      setTicketCreated(false);

      const response = await fetch("http://127.0.0.1:8000/maintenance/", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          machine_id: machine.id,

          title: `${machine.name} production issue`,

          description: machineAnalysis,

          priority: "high",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create maintenance ticket");
      }

      const result = await response.json();

      console.log("Maintenance ticket created:", result);

      setTicketCreated(true);

      setTicketMessage(
        `Maintenance ticket #${result.ticket.id} created successfully.`,
      );

      // Immediately add ticket to UI
      setTickets((currentTickets) => [result.ticket, ...currentTickets]);
    } catch (error) {
      console.error("Ticket creation error:", error);

      setTicketMessage("FactorAI could not create the maintenance ticket.");
    } finally {
      setTicketLoading(false);
    }
  };

  // -----------------------------------------
  // ASK FACTORAI
  // -----------------------------------------

  const askFactorAI = async () => {
    if (!question.trim()) {
      return;
    }

    try {
      setAiLoading(true);

      setAiAnswer("");

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
        throw new Error("Failed to ask FactorAI");
      }

      const result = await response.json();

      setAiAnswer(result.answer);
    } catch (error) {
      console.error(error);

      setAiAnswer("FactorAI could not answer your question right now.");
    } finally {
      setAiLoading(false);
    }
  };

  // -----------------------------------------
  // REFRESH TICKETS
  // -----------------------------------------

  const refreshTickets = async () => {
    try {
      setTicketsLoading(true);

      const response = await fetch("http://127.0.0.1:8000/maintenance/");

      if (!response.ok) {
        throw new Error("Failed to fetch tickets");
      }

      const result = await response.json();

      setTickets(result.tickets ?? []);
    } catch (error) {
      console.error(error);
    } finally {
      setTicketsLoading(false);
    }
  };

  // -----------------------------------------
  // UPDATE TICKET STATUS
  // -----------------------------------------

  const updateTicketStatus = async (ticketId: number, status: string) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/maintenance/${ticketId}/status`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            status,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update ticket status");
      }

      const result = await response.json();

      setTickets((currentTickets) =>
        currentTickets.map((ticket) =>
          ticket.id === ticketId
            ? {
                ...ticket,
                status: result.ticket.status,
              }
            : ticket,
        ),
      );
    } catch (error) {
      console.error("Status update error:", error);
    }
  };

  // -----------------------------------------
  // LOADING STATE
  // -----------------------------------------

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-semibold">FactorAI</div>

          <p className="mt-2 text-sm text-slate-400">
            Loading factory intelligence...
          </p>
        </div>
      </main>
    );
  }

  // -----------------------------------------
  // ERROR STATE
  // -----------------------------------------

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center">
          <h1 className="text-xl font-semibold text-red-400">
            Something went wrong
          </h1>

          <p className="mt-2 text-sm text-slate-400">{error}</p>
        </div>
      </main>
    );
  }

  // -----------------------------------------
  // MAIN UI
  // -----------------------------------------

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* HEADER */}

      <header className="border-b border-slate-800 bg-slate-950/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">FactorAI</h1>

            <p className="mt-1 text-sm text-slate-400">
              AI-powered factory operations intelligence
            </p>
          </div>

          <div className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300">
            Operations Dashboard
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* FACTORY */}

        {factory && (
          <section className="mb-8">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Factory
                  </p>

                  <h2 className="mt-1 text-2xl font-semibold">
                    {factory.name}
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    {factory.location}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                  <p className="text-xs text-emerald-400">System Status</p>

                  <p className="mt-1 font-semibold text-emerald-300">
                    Operational
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ACTIVE ANOMALIES */}

        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Active Anomalies</h2>

              <p className="mt-1 text-sm text-slate-400">
                Issues detected from current factory data.
              </p>
            </div>

            <div className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-sm">
              {anomalies.length} detected
            </div>
          </div>

          {anomalies.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-sm text-slate-400">
                No active anomalies detected.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {anomalies.map((anomaly) => (
                <div
                  key={anomaly.machine_id}
                  className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400">
                          HIGH
                        </span>

                        <span className="text-sm text-slate-500">
                          {anomaly.anomaly_count} issues
                        </span>
                      </div>

                      <h3 className="mt-3 text-lg font-semibold">
                        {anomaly.machine}
                      </h3>

                      <div className="mt-3 space-y-2">
                        {anomaly.anomalies.map((item, index) => (
                          <div key={index} className="text-sm text-slate-300">
                            • {item.message}
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => analyzeMachine(anomaly.machine_id)}
                      className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                    >
                      Analyze with FactorAI
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* FACTORAI MACHINE ANALYSIS */}

        {(analysisLoading || machineAnalysis) && (
          <section className="mb-8">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    FactorAI Analysis
                  </p>

                  <h2 className="mt-1 text-xl font-semibold">
                    {selectedMachine
                      ? (machines.find(
                          (machine) => machine.id === selectedMachine,
                        )?.name ?? "Machine")
                      : "Machine"}
                  </h2>
                </div>

                {machineAnalysis && !analysisLoading && (
                  <button
                    onClick={createMaintenanceTicket}
                    disabled={ticketLoading || ticketCreated}
                    className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {ticketLoading
                      ? "Creating Ticket..."
                      : ticketCreated
                        ? "Ticket Created"
                        : "Create Maintenance Ticket"}
                  </button>
                )}
              </div>

              <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-5">
                {analysisLoading ? (
                  <div className="flex items-center gap-3 text-sm text-slate-400">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-slate-400" />
                    FactorAI is analyzing production and quality data...
                  </div>
                ) : (
                  <div className="whitespace-pre-line text-sm leading-7 text-slate-300">
                    {machineAnalysis}
                  </div>
                )}
              </div>

              {ticketMessage && (
                <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
                  {ticketMessage}
                </div>
              )}
            </div>
          </section>
        )}

        {/* OVERVIEW */}

        {data && (
          <section className="mb-8">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Factory Overview</h2>

              <p className="mt-1 text-sm text-slate-400">
                Current operational performance.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Total Machines"
                value={data.total_machines}
                subtitle={`${data.active_machines} active`}
              />

              <MetricCard
                title="Production Achievement"
                value={`${data.production_achievement}%`}
                subtitle={`${data.total_production.toLocaleString()} / ${data.total_target.toLocaleString()} units`}
              />

              <MetricCard
                title="Defect Rate"
                value={`${data.defect_rate}%`}
                subtitle={`${data.total_defects.toLocaleString()} defects`}
              />

              <MetricCard
                title="Maintenance"
                value={data.maintenance_machines}
                subtitle="Machines requiring attention"
              />
            </div>
          </section>
        )}

        {/* PRODUCTION + QUALITY */}

        {data && (
          <section className="mb-8 grid gap-6 lg:grid-cols-2">
            {/* Production */}

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Production</h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Overall production achievement
                  </p>
                </div>

                <span className="text-2xl font-bold">
                  {data.production_achievement}%
                </span>
              </div>

              <div className="mt-6">
                <ProgressBar value={data.production_achievement} />
              </div>

              <div className="mt-4 flex justify-between text-sm text-slate-400">
                <span>Actual: {data.total_production.toLocaleString()}</span>

                <span>Target: {data.total_target.toLocaleString()}</span>
              </div>
            </div>

            {/* Quality */}

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Quality</h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Current factory defect rate
                  </p>
                </div>

                <span className="text-2xl font-bold">{data.defect_rate}%</span>
              </div>

              <div className="mt-6">
                <ProgressBar value={data.defect_rate} inverse />
              </div>

              <div className="mt-4 flex justify-between text-sm text-slate-400">
                <span>Inspected: {data.total_inspected.toLocaleString()}</span>

                <span>Defects: {data.total_defects.toLocaleString()}</span>
              </div>
            </div>
          </section>
        )}

        {/* MACHINES */}

        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Machines</h2>

            <p className="mt-1 text-sm text-slate-400">
              Factory machine status and AI analysis.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {machines.map((machine) => (
              <MachineCard
                key={machine.id}
                machine={machine}
                onAnalyze={analyzeMachine}
              />
            ))}
          </div>
        </section>

        {/* MAINTENANCE TICKETS */}

        <section className="mb-8">
          <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <h2 className="text-xl font-semibold">Maintenance Tickets</h2>

              <p className="mt-1 text-sm text-slate-400">
                Track maintenance actions created by FactorAI.
              </p>
            </div>

            <button
              onClick={refreshTickets}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
            >
              Refresh
            </button>
          </div>

          {ticketsLoading ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-sm text-slate-400">
                Loading maintenance tickets...
              </p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-sm text-slate-400">
                No maintenance tickets have been created yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div>
                      <p className="text-xs text-slate-500">
                        Ticket #{ticket.id}
                      </p>

                      <h3 className="mt-1 text-lg font-semibold">
                        {ticket.title}
                      </h3>

                      <p className="mt-1 text-sm text-slate-400">
                        Machine: {ticket.machine}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* PRIORITY */}

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          ticket.priority.toLowerCase() === "high"
                            ? "bg-red-500/10 text-red-400"
                            : ticket.priority.toLowerCase() === "medium"
                              ? "bg-yellow-500/10 text-yellow-400"
                              : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {ticket.priority.toUpperCase()}
                      </span>

                      {/* STATUS */}

                      <select
                        value={ticket.status}
                        onChange={(event) =>
                          updateTicketStatus(ticket.id, event.target.value)
                        }
                        className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-medium text-slate-300 outline-none"
                      >
                        <option value="open">OPEN</option>

                        <option value="in progress">IN PROGRESS</option>

                        <option value="resolved">RESOLVED</option>
                      </select>
                    </div>
                  </div>

                  <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-300">
                    {ticket.description}
                  </p>

                  <div className="mt-4 text-xs text-slate-500">
                    Created: {new Date(ticket.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ASK FACTORAI */}

        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Ask FactorAI</h2>

            <p className="mt-1 text-sm text-slate-400">
              Ask questions about factory operations, production, quality, or
              maintenance.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex flex-col gap-3 md:flex-row">
              <input
                type="text"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    askFactorAI();
                  }
                }}
                placeholder="Why did production drop on CNC-01?"
                className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-slate-500"
              />

              <button
                onClick={askFactorAI}
                disabled={aiLoading || !question.trim()}
                className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {aiLoading ? "Thinking..." : "Ask FactorAI"}
              </button>
            </div>

            {aiAnswer && (
              <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-5">
                <div className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
                  FactorAI Response
                </div>

                <div className="whitespace-pre-line text-sm leading-7 text-slate-300">
                  {aiAnswer}
                </div>
              </div>
            )}

            {/* SUGGESTIONS */}

            <div className="mt-5 flex flex-wrap gap-2">
              <Suggestion
                text="Why did production drop on CNC-01?"
                onClick={() =>
                  setQuestion("Why did production drop on CNC-01?")
                }
              />

              <Suggestion
                text="Which machines need maintenance?"
                onClick={() => setQuestion("Which machines need maintenance?")}
              />

              <Suggestion
                text="Which machine has the highest defect rate?"
                onClick={() =>
                  setQuestion("Which machine has the highest defect rate?")
                }
              />
            </div>
          </div>
        </section>

        {/* FOOTER */}

        <footer className="border-t border-slate-800 py-6 text-center">
          <p className="text-xs text-slate-600">
            FactorAI • AI-powered factory operations platform
          </p>
        </footer>
      </div>
    </main>
  );
}

// =============================================
// METRIC CARD
// =============================================

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
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{title}</p>

      <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>

      <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}

// =============================================
// PROGRESS BAR
// =============================================

function ProgressBar({
  value,
  inverse = false,
}: {
  value: number;
  inverse?: boolean;
}) {
  const percentage = Math.max(0, Math.min(value, 100));

  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
      <div
        className={`h-full rounded-full ${
          inverse ? "bg-red-400" : "bg-emerald-400"
        }`}
        style={{
          width: `${percentage}%`,
        }}
      />
    </div>
  );
}

// =============================================
// MACHINE CARD
// =============================================

function MachineCard({
  machine,
  onAnalyze,
}: {
  machine: Machine;
  onAnalyze: (machineId: number) => void;
}) {
  const isMaintenance = machine.status.toLowerCase() === "maintenance";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{machine.name}</h3>

          <p className="mt-1 text-xs text-slate-500">{machine.machine_type}</p>
        </div>

        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            isMaintenance
              ? "bg-yellow-500/10 text-yellow-400"
              : "bg-emerald-500/10 text-emerald-400"
          }`}
        >
          {machine.status}
        </span>
      </div>

      <button
        onClick={() => onAnalyze(machine.id)}
        className="mt-5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
      >
        Analyze with FactorAI
      </button>
    </div>
  );
}

// =============================================
// SUGGESTION BUTTON
// =============================================

function Suggestion({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-400 transition hover:border-slate-700 hover:text-slate-200"
    >
      {text}
    </button>
  );
}
