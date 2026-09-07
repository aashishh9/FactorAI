"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "./components/AuthGuard";
import ProductionChart from "./components/ProductionChart";

const API_URL = "http://127.0.0.1:8000";

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("factorai_token");

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}

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

type ProductionRecord = {
  id: number;
  machine_id: number;
  production_count: number;
  target_count: number;
  recorded_at: string;
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
  const router = useRouter();

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  const [productionRecords, setProductionRecords] = useState<
    ProductionRecord[]
  >([]);

  const [factories, setFactories] = useState<Factory[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);

  const [selectedMachine, setSelectedMachine] = useState<number | null>(null);

  const [machineAnalysis, setMachineAnalysis] = useState("");

  const [question, setQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");

  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [ticketLoading, setTicketLoading] = useState(false);

  const [error, setError] = useState("");

  async function apiFetch(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const token = localStorage.getItem("factorai_token");

    const headers = new Headers(options.headers);

    if (options.body) {
      headers.set("Content-Type", "application/json");
    }

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("factorai_token");
      localStorage.removeItem("factorai_user");
      router.replace("/login");
    }

    return response;
  }

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const [
        dashboardResponse,
        factoryResponse,
        anomalyResponse,
        ticketResponse,
        productionResponse,
      ] = await Promise.all([
        apiFetch(`${API_URL}/dashboard/summary`, {
          headers: getAuthHeaders(),
        }),

        apiFetch(`${API_URL}/factory/`, {
          headers: getAuthHeaders(),
        }),

        apiFetch(`${API_URL}/anomalies/`, {
          headers: getAuthHeaders(),
        }),

        apiFetch(`${API_URL}/maintenance/`, {
          headers: getAuthHeaders(),
        }),

        apiFetch(`${API_URL}/production/`, {
          headers: getAuthHeaders(),
        }),
      ]);

      if (
        !dashboardResponse.ok ||
        !factoryResponse.ok ||
        !anomalyResponse.ok ||
        !ticketResponse.ok ||
        !productionResponse.ok
      ) {
        throw new Error("Failed to load dashboard data.");
      }

      const dashboardData = await dashboardResponse.json();

      const factoryData = await factoryResponse.json();

      const anomalyData = await anomalyResponse.json();

      const ticketData = await ticketResponse.json();

      const productionData = await productionResponse.json();

      setDashboard(dashboardData);
      setFactories(factoryData);
      setAnomalies(anomalyData.anomalies || []);
      setTickets(ticketData.tickets || []);
      setProductionRecords(productionData);

      if (factoryData.length > 0) {
        await loadMachines(factoryData[0].id);
      }
    } catch (err) {
      console.error(err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong while loading the dashboard.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadMachines(factoryId: number) {
    try {
      const response = await apiFetch(
        `${API_URL}/factory/${factoryId}/machines`,
        {
          headers: getAuthHeaders(),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to load machines.");
      }

      const data = await response.json();

      setMachines(data);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function analyzeMachine(machineId: number) {
    try {
      setSelectedMachine(machineId);
      setMachineAnalysis("");
      setAnalysisLoading(true);

      const response = await apiFetch(`${API_URL}/ai/analyze/${machineId}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze machine.");
      }

      const data = await response.json();

      setMachineAnalysis(data.analysis || "No analysis available.");
    } catch (err) {
      console.error(err);

      setMachineAnalysis(
        err instanceof Error ? err.message : "Unable to analyze this machine.",
      );
    } finally {
      setAnalysisLoading(false);
    }
  }

  async function createMaintenanceTicket(machine: Machine) {
    try {
      setTicketLoading(true);

      const description =
        machineAnalysis || `Maintenance issue detected for ${machine.name}.`;

      const response = await apiFetch(`${API_URL}/maintenance/`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },

        body: JSON.stringify({
          machine_id: machine.id,
          title: `${machine.name} production issue`,
          description,
          priority: "high",
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);

        throw new Error(data?.detail || "Failed to create maintenance ticket.");
      }

      await refreshTickets();

      alert("Maintenance ticket created successfully.");
    } catch (err) {
      console.error(err);

      alert(
        err instanceof Error
          ? err.message
          : "Failed to create maintenance ticket.",
      );
    } finally {
      setTicketLoading(false);
    }
  }

  async function refreshTickets() {
    try {
      const response = await apiFetch(`${API_URL}/maintenance/`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to refresh maintenance tickets.");
      }

      const data = await response.json();

      setTickets(data.tickets || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function updateTicketStatus(ticketId: number, status: string) {
    try {
      const response = await apiFetch(
        `${API_URL}/maintenance/${ticketId}/status`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },

          body: JSON.stringify({
            status,
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);

        throw new Error(data?.detail || "Failed to update ticket status.");
      }

      await refreshTickets();
    } catch (err) {
      console.error(err);

      alert(
        err instanceof Error ? err.message : "Failed to update ticket status.",
      );
    }
  }

  async function askFactorAI() {
    if (!question.trim()) {
      return;
    }

    try {
      setAiLoading(true);
      setAiAnswer("");

      const response = await apiFetch(`${API_URL}/ai/ask`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },

        body: JSON.stringify({
          question: question.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to get AI response.");
      }

      setAiAnswer(data.answer || "No answer returned.");
    } catch (err) {
      console.error(err);

      setAiAnswer(
        err instanceof Error
          ? err.message
          : "Unable to get a response from FactorAI.",
      );
    } finally {
      setAiLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("factorai_token");
    localStorage.removeItem("factorai_user");

    router.replace("/login");
  }

  function getStatusClass(status: string) {
    if (status === "active") {
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    }

    if (status === "maintenance") {
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }

    return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  }

  function getPriorityClass(priority: string) {
    if (priority === "high") {
      return "bg-red-500/10 text-red-400 border-red-500/20";
    }

    if (priority === "medium") {
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }

    return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  }

  if (loading) {
    return (
      <AuthGuard>
        <main className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-semibold text-white">FactorAI</div>

            <p className="mt-2 text-sm text-slate-500">
              Loading factory intelligence...
            </p>
          </div>
        </main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-slate-950 text-white">
        {/* HEADER */}
        <header className="border-b border-slate-800 bg-slate-950/95">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
            <div>
              <div className="text-2xl font-bold tracking-tight">FactorAI</div>

              <p className="mt-1 text-xs text-slate-500">
                Factory Operations Intelligence
              </p>
            </div>

            <button
              onClick={logout}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-6 py-8">
          {/* ERROR */}
          {error && (
            <div className="mb-6 rounded-xl border border-red-900 bg-red-950/30 px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* FACTORY */}
          {factories.length > 0 && (
            <section className="mb-8">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      Factory
                    </p>

                    <h1 className="mt-2 text-2xl font-semibold">
                      {factories[0].name}
                    </h1>

                    <p className="mt-1 text-sm text-slate-400">
                      {factories[0].location}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950 px-5 py-4">
                    <p className="text-xs text-slate-500">Operational status</p>

                    <div className="mt-1 flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />

                      <span className="text-sm font-medium text-emerald-400">
                        Monitoring active
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* METRICS */}
          {dashboard && (
            <section className="mb-8">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Operations Overview</h2>

                <p className="mt-1 text-sm text-slate-500">
                  Current factory performance indicators
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <p className="text-sm text-slate-500">Total Machines</p>

                  <p className="mt-3 text-3xl font-semibold">
                    {dashboard.total_machines}
                  </p>

                  <p className="mt-2 text-xs text-emerald-400">
                    {dashboard.active_machines} active
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <p className="text-sm text-slate-500">
                    Production Achievement
                  </p>

                  <p className="mt-3 text-3xl font-semibold">
                    {dashboard.production_achievement}%
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    {dashboard.total_production.toLocaleString()} /{" "}
                    {dashboard.total_target.toLocaleString()} units
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <p className="text-sm text-slate-500">Defect Rate</p>

                  <p className="mt-3 text-3xl font-semibold">
                    {dashboard.defect_rate}%
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    {dashboard.total_defects} defects
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <p className="text-sm text-slate-500">Maintenance</p>

                  <p className="mt-3 text-3xl font-semibold">
                    {dashboard.maintenance_machines}
                  </p>

                  <p className="mt-2 text-xs text-amber-400">
                    machines requiring attention
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* PRODUCTION CHART */}
          <section className="mb-8">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Production Trend</h2>

              <p className="mt-1 text-sm text-slate-500">
                Production versus target over time
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              {machines.length > 0 ? (
                <>
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-300">
                        {machines[0].name}
                      </p>

                      <p className="text-xs text-slate-500">
                        Production performance
                      </p>
                    </div>
                  </div>

                  <ProductionChart
                    records={productionRecords}
                    machineId={machines[0].id}
                  />
                </>
              ) : (
                <div className="flex h-72 items-center justify-center text-sm text-slate-500">
                  No machine data available.
                </div>
              )}
            </div>
          </section>

          {/* ANOMALIES */}
          <section className="mb-8">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Detected Anomalies</h2>

              <p className="mt-1 text-sm text-slate-500">
                Issues detected from production and quality data
              </p>
            </div>

            {anomalies.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
                No anomalies detected.
              </div>
            ) : (
              <div className="space-y-4">
                {anomalies.map((anomaly) => (
                  <div
                    key={anomaly.machine_id}
                    className="rounded-2xl border border-red-900/50 bg-red-950/20 p-5"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />

                          <h3 className="font-semibold">{anomaly.machine}</h3>

                          <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-medium uppercase text-red-400">
                            {anomaly.anomaly_count} issues
                          </span>
                        </div>

                        <div className="mt-4 space-y-2">
                          {anomaly.anomalies.map((item, index) => (
                            <div
                              key={index}
                              className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"
                            >
                              <p className="text-xs font-medium uppercase tracking-wide text-red-400">
                                {item.type.replaceAll("_", " ")}
                              </p>

                              <p className="mt-1 text-sm text-slate-300">
                                {item.message}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => analyzeMachine(anomaly.machine_id)}
                        className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium transition hover:bg-blue-500"
                      >
                        Analyze with AI
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* AI ANALYSIS */}
          {selectedMachine !== null && (
            <section className="mb-8">
              <div className="rounded-2xl border border-blue-500/20 bg-blue-950/10 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-blue-400">
                      FactorAI Analysis
                    </p>

                    <h2 className="mt-2 text-xl font-semibold">
                      Machine Investigation
                    </h2>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedMachine(null);
                      setMachineAnalysis("");
                    }}
                    className="text-sm text-slate-500 hover:text-slate-300"
                  >
                    Close
                  </button>
                </div>

                {analysisLoading ? (
                  <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-5">
                    <p className="text-sm text-slate-400">
                      FactorAI is analyzing the machine data...
                    </p>
                  </div>
                ) : (
                  <div className="mt-6">
                    <div className="whitespace-pre-line rounded-xl border border-slate-800 bg-slate-950 p-5 text-sm leading-7 text-slate-300">
                      {machineAnalysis}
                    </div>

                    {machineAnalysis && (
                      <div className="mt-4 flex justify-end">
                        {machines.find(
                          (machine) => machine.id === selectedMachine,
                        ) && (
                          <button
                            onClick={() => {
                              const machine = machines.find(
                                (item) => item.id === selectedMachine,
                              );

                              if (machine) {
                                createMaintenanceTicket(machine);
                              }
                            }}
                            disabled={ticketLoading}
                            className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {ticketLoading
                              ? "Creating..."
                              : "Create Maintenance Ticket"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* MACHINES */}
          <section className="mb-8">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Machines</h2>

              <p className="mt-1 text-sm text-slate-500">Live machine status</p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-800 bg-slate-950">
                    <tr>
                      <th className="px-5 py-4 font-medium text-slate-500">
                        Machine
                      </th>

                      <th className="px-5 py-4 font-medium text-slate-500">
                        Type
                      </th>

                      <th className="px-5 py-4 font-medium text-slate-500">
                        Status
                      </th>

                      <th className="px-5 py-4 text-right font-medium text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800">
                    {machines.map((machine) => (
                      <tr
                        key={machine.id}
                        className="transition hover:bg-slate-800/30"
                      >
                        <td className="px-5 py-4 font-medium text-slate-200">
                          {machine.name}
                        </td>

                        <td className="px-5 py-4 text-slate-400">
                          {machine.machine_type}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClass(
                              machine.status,
                            )}`}
                          >
                            {machine.status}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => analyzeMachine(machine.id)}
                            className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-blue-500/50 hover:text-blue-400"
                          >
                            Analyze
                          </button>
                        </td>
                      </tr>
                    ))}

                    {machines.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-5 py-8 text-center text-sm text-slate-500"
                        >
                          No machines found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* MAINTENANCE TICKETS */}
          <section className="mb-8">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Maintenance Tickets</h2>

              <p className="mt-1 text-sm text-slate-500">
                Track machine maintenance issues
              </p>
            </div>

            <div className="space-y-4">
              {tickets.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
                  No maintenance tickets yet.
                </div>
              ) : (
                tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{ticket.title}</h3>

                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getPriorityClass(
                              ticket.priority,
                            )}`}
                          >
                            {ticket.priority}
                          </span>
                        </div>

                        <p className="mt-2 text-xs text-slate-500">
                          Machine:{" "}
                          <span className="text-slate-400">
                            {ticket.machine}
                          </span>
                        </p>

                        <p className="mt-4 max-w-3xl whitespace-pre-line text-sm leading-6 text-slate-400">
                          {ticket.description}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-xs text-slate-500">Status</label>

                        <select
                          value={ticket.status}
                          onChange={(event) =>
                            updateTicketStatus(ticket.id, event.target.value)
                          }
                          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 outline-none focus:border-blue-500"
                        >
                          <option value="open">Open</option>

                          <option value="in progress">In Progress</option>

                          <option value="resolved">Resolved</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* ASK FACTORAI */}
          <section className="mb-8">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-blue-400">
                  AI Operations Assistant
                </p>

                <h2 className="mt-2 text-xl font-semibold">Ask FactorAI</h2>

                <p className="mt-1 text-sm text-slate-500">
                  Ask questions about factory performance, production, quality,
                  and machine issues.
                </p>
              </div>

              <div className="mt-6">
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      (event.ctrlKey || event.metaKey)
                    ) {
                      askFactorAI();
                    }
                  }}
                  placeholder="Why did CNC-01 production drop?"
                  rows={4}
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
                />

                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-slate-600">
                    Press Ctrl + Enter to ask
                  </p>

                  <button
                    onClick={askFactorAI}
                    disabled={aiLoading || !question.trim()}
                    className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {aiLoading ? "FactorAI is thinking..." : "Ask FactorAI"}
                  </button>
                </div>
              </div>

              {aiAnswer && (
                <div className="mt-6 rounded-xl border border-blue-500/20 bg-blue-950/10 p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-400" />

                    <span className="text-sm font-medium text-blue-400">
                      FactorAI
                    </span>
                  </div>

                  <div className="whitespace-pre-line text-sm leading-7 text-slate-300">
                    {aiAnswer}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* FOOTER */}
          <footer className="border-t border-slate-800 pt-6">
            <p className="text-center text-xs text-slate-600">
              FactorAI • AI-Powered Factory Operations Intelligence
            </p>
          </footer>
        </div>
      </main>
    </AuthGuard>
  );
}
