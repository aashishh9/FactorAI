"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "./components/AuthGuard";
import ProductionChart from "./components/ProductionChart";
import QualityChart from "./components/QualityChart";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

type Dashboard = {
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

type Anomaly = {
  machine_id: number;
  machine: string;
  status: string;
  anomaly_detected: boolean;
  anomaly_count: number;
  anomalies: {
    type: string;
    severity: string;
    message: string;
  }[];
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

type ProductionRecord = {
  id: number;
  machine_id: number;
  production_count: number;
  target_count: number;
  recorded_at: string;
};

type QualityRecord = {
  id: number;
  machine_id: number;
  inspected_count: number;
  defect_count: number;
  recorded_at: string;
};

function CustomSelect({
  value,
  options,
  onChange,
  className = "",
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;

    const close = () => setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  return (
    <div
      className={`relative ${className}`}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0a1220] px-4 py-3 text-left text-sm text-slate-100 shadow-inner shadow-black/10 outline-none transition-all duration-200 hover:border-white/20 hover:bg-[#0d1727] focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/10"
      >
        <span className="truncate">{selected?.label ?? "Select..."}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${open ? "rotate-180 text-blue-400" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.51a.75.75 0 0 1-1.08 0l-4.25-4.51a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-[80] mt-2 overflow-hidden rounded-xl border border-white/10 bg-[#0b1422] p-1.5 shadow-2xl shadow-black/40 ring-1 ring-black/30 backdrop-blur-xl"
        >
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  isSelected
                    ? "bg-blue-500/10 text-blue-300"
                    : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <span>{option.label}</span>
                {isSelected && (
                  <svg
                    className="h-4 w-4 text-blue-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.2 7.25a1 1 0 0 1-1.425.005l-3.5-3.4a1 1 0 1 1 1.39-1.438l2.79 2.697 6.5-6.548a1 1 0 0 1 1.439.02Z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("factorai_token");

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}

async function apiFetch(
  url: string,
  options: RequestInit = {},
  router?: ReturnType<typeof useRouter>,
) {
  const headers = new Headers(options.headers);

  const authHeaders = getAuthHeaders();

  Object.entries(authHeaders).forEach(([key, value]) => {
    if (value) {
      headers.set(key, value);
    }
  });

  if (options.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem("factorai_token");
    localStorage.removeItem("factorai_user");

    if (router) {
      router.replace("/login");
    }
  }

  return response;
}

export default function Home() {
  const router = useRouter();

  const [factory, setFactory] = useState<Factory | null>(null);

  const [machines, setMachines] = useState<Machine[]>([]);

  const [selectedMachineId, setSelectedMachineId] = useState<number | null>(
    null,
  );

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);

  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);

  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);

  const [productionRecords, setProductionRecords] = useState<
    ProductionRecord[]
  >([]);

  const [qualityRecords, setQualityRecords] = useState<QualityRecord[]>([]);

  const [loading, setLoading] = useState(true);

  const [aiLoading, setAiLoading] = useState(false);

  const [analysisLoading, setAnalysisLoading] = useState(false);

  const [aiQuestion, setAiQuestion] = useState("");

  const [aiAnswer, setAiAnswer] = useState("");

  const [machineAnalysis, setMachineAnalysis] = useState("");

  const [ticketTitle, setTicketTitle] = useState("");

  const [ticketDescription, setTicketDescription] = useState("");

  const [ticketPriority, setTicketPriority] = useState("medium");

  const selectedMachine = machines.find(
    (machine) => machine.id === selectedMachineId,
  );

  async function loadDashboard() {
    try {
      setLoading(true);

      const [
        dashboardResponse,
        factoryResponse,
        anomalyResponse,
        ticketResponse,
        productionResponse,
        qualityResponse,
      ] = await Promise.all([
        apiFetch(
          `${API_URL}/dashboard/summary`,
          {
            headers: getAuthHeaders(),
          },
          router,
        ),

        apiFetch(
          `${API_URL}/factory/`,
          {
            headers: getAuthHeaders(),
          },
          router,
        ),

        apiFetch(
          `${API_URL}/anomalies/`,
          {
            headers: getAuthHeaders(),
          },
          router,
        ),

        apiFetch(
          `${API_URL}/maintenance/`,
          {
            headers: getAuthHeaders(),
          },
          router,
        ),

        apiFetch(
          `${API_URL}/production/`,
          {
            headers: getAuthHeaders(),
          },
          router,
        ),

        apiFetch(
          `${API_URL}/production/quality`,
          {
            headers: getAuthHeaders(),
          },
          router,
        ),
      ]);

      if (
        !dashboardResponse.ok ||
        !factoryResponse.ok ||
        !anomalyResponse.ok ||
        !ticketResponse.ok ||
        !productionResponse.ok ||
        !qualityResponse.ok
      ) {
        throw new Error("Failed to load dashboard data.");
      }

      const dashboardData = await dashboardResponse.json();

      const factoryData = await factoryResponse.json();

      const anomalyData = await anomalyResponse.json();

      const ticketData = await ticketResponse.json();

      const productionData = await productionResponse.json();

      const qualityData = await qualityResponse.json();

      setDashboard(dashboardData);

      setAnomalies(anomalyData.anomalies || []);

      setTickets(ticketData.tickets || []);

      setProductionRecords(productionData);

      setQualityRecords(qualityData);

      if (factoryData.length > 0) {
        const firstFactory = factoryData[0];

        setFactory(firstFactory);

        const machinesResponse = await apiFetch(
          `${API_URL}/factory/${firstFactory.id}/machines`,
          {
            headers: getAuthHeaders(),
          },
          router,
        );

        if (machinesResponse.ok) {
          const machineData = await machinesResponse.json();

          setMachines(machineData);

          if (machineData.length > 0) {
            setSelectedMachineId((current) =>
              current !== null ? current : machineData[0].id,
            );
          }
        }
      }
    } catch (error) {
      console.error("Dashboard loading error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function analyzeMachine(machineId: number) {
    try {
      setAnalysisLoading(true);

      setMachineAnalysis("");

      setSelectedMachineId(machineId);

      const response = await apiFetch(
        `${API_URL}/ai/analyze/${machineId}`,
        {
          headers: getAuthHeaders(),
        },
        router,
      );

      if (!response.ok) {
        throw new Error("Failed to analyze machine.");
      }

      const data = await response.json();

      setMachineAnalysis(data.analysis);
    } catch (error) {
      console.error(error);

      setMachineAnalysis("Unable to analyze this machine.");
    } finally {
      setAnalysisLoading(false);
    }
  }

  function createTicketFromAnalysis() {
    if (!selectedMachine || !machineAnalysis) {
      return;
    }

    setTicketTitle(`${selectedMachine.name} production performance issue`);

    setTicketDescription(machineAnalysis);

    setTicketPriority("high");

    document.getElementById("maintenance-section")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function createMaintenanceTicket() {
    if (!selectedMachineId || !ticketTitle.trim()) {
      return;
    }

    try {
      const response = await apiFetch(
        `${API_URL}/maintenance/`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            machine_id: selectedMachineId,
            title: ticketTitle,
            description: ticketDescription,
            priority: ticketPriority,
          }),
        },
        router,
      );

      if (!response.ok) {
        throw new Error("Failed to create ticket.");
      }

      setTicketTitle("");

      setTicketDescription("");

      setTicketPriority("medium");

      await refreshTickets();
    } catch (error) {
      console.error(error);

      alert("Failed to create maintenance ticket.");
    }
  }

  async function refreshTickets() {
    try {
      const response = await apiFetch(
        `${API_URL}/maintenance/`,
        {
          headers: getAuthHeaders(),
        },
        router,
      );

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      setTickets(data.tickets || []);
    } catch (error) {
      console.error(error);
    }
  }

  async function updateTicketStatus(ticketId: number, status: string) {
    try {
      const response = await apiFetch(
        `${API_URL}/maintenance/${ticketId}/status`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            status,
          }),
        },
        router,
      );

      if (!response.ok) {
        throw new Error("Failed to update ticket.");
      }

      await refreshTickets();
    } catch (error) {
      console.error(error);

      alert("Failed to update ticket status.");
    }
  }

  async function askFactorAI() {
    if (!aiQuestion.trim()) {
      return;
    }

    try {
      setAiLoading(true);

      setAiAnswer("");

      const response = await apiFetch(
        `${API_URL}/ai/ask`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            question: aiQuestion,
          }),
        },
        router,
      );

      if (!response.ok) {
        throw new Error("AI request failed.");
      }

      const data = await response.json();

      setAiAnswer(data.answer);
    } catch (error) {
      console.error(error);

      setAiAnswer("Unable to get an answer from FactorAI.");
    } finally {
      setAiLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("factorai_token");

    localStorage.removeItem("factorai_user");

    router.replace("/login");
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <AuthGuard>
        <main className="font-[Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe_UI,sans-serif] flex min-h-screen items-center justify-center bg-[#070b14]">
          <div className="text-slate-400">Loading FactorAI...</div>
        </main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <main className="factor-shell relative min-h-screen overflow-hidden bg-[#050812] text-white selection:bg-blue-500/30">
        <style jsx global>{`
          :root {
            color-scheme: dark;
          }
          .factor-shell {
            background-image:
              radial-gradient(
                circle at 10% 5%,
                rgba(37, 99, 235, 0.13),
                transparent 28%
              ),
              radial-gradient(
                circle at 92% 18%,
                rgba(6, 182, 212, 0.09),
                transparent 24%
              ),
              linear-gradient(rgba(255, 255, 255, 0.018) 1px, transparent 1px),
              linear-gradient(
                90deg,
                rgba(255, 255, 255, 0.018) 1px,
                transparent 1px
              );
            background-size:
              auto,
              auto,
              42px 42px,
              42px 42px;
            background-position: center;
          }
          .factor-shell header {
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.24);
          }
          .factor-shell section {
            position: relative;
          }
          .factor-shell section.rounded-2xl {
            border-color: rgba(148, 163, 184, 0.12);
            background: linear-gradient(
              145deg,
              rgba(15, 23, 42, 0.72),
              rgba(8, 13, 25, 0.58)
            );
            box-shadow:
              0 20px 60px rgba(0, 0, 0, 0.16),
              inset 0 1px 0 rgba(255, 255, 255, 0.025);
            backdrop-filter: blur(18px);
          }
          .factor-shell section.rounded-2xl::before {
            content: "";
            position: absolute;
            inset: 0;
            border-radius: inherit;
            pointer-events: none;
            background: linear-gradient(
              120deg,
              rgba(255, 255, 255, 0.035),
              transparent 35%,
              transparent 70%,
              rgba(59, 130, 246, 0.025)
            );
          }
          .factor-shell section.rounded-2xl:hover {
            border-color: rgba(96, 165, 250, 0.2);
            box-shadow:
              0 24px 70px rgba(0, 0, 0, 0.22),
              0 0 0 1px rgba(59, 130, 246, 0.025);
          }
          .factor-shell button:not(:disabled),
          .factor-shell select,
          .factor-shell input,
          .factor-shell textarea {
            transition: all 0.2s ease;
          }
          .factor-shell button:not(:disabled):hover {
            transform: translateY(-1px);
          }
          .factor-shell button:not(:disabled):active {
            transform: translateY(0) scale(0.985);
          }
          .factor-shell input:focus,
          .factor-shell textarea:focus,
          .factor-shell select:focus {
            box-shadow:
              0 0 0 4px rgba(59, 130, 246, 0.08),
              0 0 30px rgba(59, 130, 246, 0.06);
          }
          .factor-shell .shadow-xl,
          .factor-shell .shadow-2xl {
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.16);
          }
          @keyframes factor-pulse {
            0%,
            100% {
              opacity: 0.45;
              transform: scale(0.96);
            }
            50% {
              opacity: 1;
              transform: scale(1);
            }
          }
          .factor-live-dot {
            animation: factor-pulse 2s ease-in-out infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            .factor-live-dot {
              animation: none;
            }
            .factor-shell button:not(:disabled) {
              transition: none;
            }
          }
        `}</style>
        <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
          <div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-blue-600/[0.07] blur-3xl" />
          <div className="absolute right-0 top-[35%] h-80 w-80 rounded-full bg-cyan-500/[0.045] blur-3xl" />
        </div>
        <div className="relative z-10">
          {/* HEADER */}

          <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070b14]/85 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10 shadow-lg shadow-blue-500/10">
                    <span className="text-lg font-black text-blue-400">F</span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                      Factor<span className="text-blue-400">AI</span>
                    </h1>
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                      Operations Intelligence
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="text-sm text-slate-500">
                    AI-powered factory operations
                  </p>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                    <span className="factor-live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Live data
                  </span>
                </div>
              </div>

              <button
                onClick={logout}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 transition-all duration-200 ease-out hover:bg-white/[0.06]"
              >
                Logout
              </button>
            </div>
          </header>

          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {/* FACTORY */}

            <section className="mb-8">
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/10 backdrop-blur-sm">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Factory
                </p>

                <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                  {factory?.name || "No factory"}
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  {factory?.location || "Location unavailable"}
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500">
                  <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5">
                    Operations center
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5">
                    AI monitoring enabled
                  </span>
                  <span className="rounded-full border border-blue-400/15 bg-blue-500/[0.06] px-3 py-1.5 text-blue-300">
                    PostgreSQL connected
                  </span>
                </div>
              </div>
            </section>

            {/* METRICS */}

            {dashboard && (
              <>
                <div className="mb-3 flex items-center justify-between px-1">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                    Operations snapshot
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Live database metrics
                  </div>
                </div>
                <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.055] to-white/[0.018] p-5 shadow-xl shadow-black/10 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.05]">
                    <p className="text-sm text-slate-500">Total Machines</p>

                    <p className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                      {dashboard.total_machines}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.055] to-white/[0.018] p-5 shadow-xl shadow-black/10 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.05]">
                    <p className="text-sm text-slate-500">Active Machines</p>

                    <p className="mt-2 text-3xl font-bold text-emerald-400">
                      {dashboard.active_machines}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.055] to-white/[0.018] p-5 shadow-xl shadow-black/10 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.05]">
                    <p className="text-sm text-slate-500">
                      Production Achievement
                    </p>

                    <p className="mt-2 text-3xl font-bold text-blue-400">
                      {dashboard.production_achievement}%
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.055] to-white/[0.018] p-5 shadow-xl shadow-black/10 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.05]">
                    <p className="text-sm text-slate-500">Defect Rate</p>

                    <p className="mt-2 text-3xl font-bold text-red-400">
                      {dashboard.defect_rate}%
                    </p>
                  </div>
                </section>
              </>
            )}

            {/* PRODUCTION ANALYTICS */}

            <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.035] p-6">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Production Analytics
                  </p>

                  <h2 className="mt-1 text-xl font-semibold tracking-tight">
                    Production vs Target
                  </h2>
                </div>

                <div>
                  <label
                    htmlFor="machine-select"
                    className="mb-2 block text-xs font-medium text-slate-500"
                  >
                    Select Machine
                  </label>

                  <CustomSelect
                    value={selectedMachineId?.toString() ?? ""}
                    onChange={(value) => {
                      setSelectedMachineId(Number(value));
                      setMachineAnalysis("");
                    }}
                    className="min-w-48"
                    options={machines.map((machine) => ({
                      value: machine.id.toString(),
                      label: machine.name,
                    }))}
                  />
                </div>
              </div>

              {selectedMachineId !== null && (
                <>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-300">
                        {selectedMachine?.name}
                      </p>

                      <p className="text-xs text-slate-500">
                        {selectedMachine?.machine_type}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        selectedMachine?.status === "active"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {selectedMachine?.status}
                    </span>
                  </div>

                  <ProductionChart
                    records={productionRecords}
                    machineId={selectedMachineId}
                  />
                </>
              )}
            </section>

            {/* QUALITY ANALYTICS */}

            <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.035] p-6">
              <div className="mb-6">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Quality Analytics
                </p>

                <h2 className="mt-1 text-xl font-semibold tracking-tight">
                  Defect Rate Trend
                </h2>
              </div>

              {selectedMachineId !== null && (
                <QualityChart
                  records={qualityRecords}
                  machineId={selectedMachineId}
                />
              )}
            </section>

            {/* ANOMALIES */}

            <section className="mb-8">
              <div className="mb-4">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Operations Monitoring
                </p>

                <h2 className="mt-1 text-xl font-semibold tracking-tight">
                  Detected Anomalies
                </h2>
              </div>

              {anomalies.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 text-sm text-slate-400">
                  No anomalies detected.
                </div>
              ) : (
                <div className="grid gap-4">
                  {anomalies.map((anomaly) => (
                    <div
                      key={anomaly.machine_id}
                      className="rounded-2xl border border-red-400/15 bg-red-500/[0.045] p-6 shadow-xl shadow-red-950/10"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold">{anomaly.machine}</h3>

                            <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400">
                              {anomaly.anomaly_count} anomalies
                            </span>
                          </div>

                          <div className="mt-4 space-y-2">
                            {anomaly.anomalies.map((item, index) => (
                              <div
                                key={`${anomaly.machine_id}-${index}`}
                                className="text-sm text-slate-300"
                              >
                                <span className="mr-2 text-red-400">●</span>

                                {item.message}
                              </div>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => analyzeMachine(anomaly.machine_id)}
                          className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium transition-all duration-200 ease-out hover:bg-blue-400"
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

            {analysisLoading && (
              <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.035] p-6">
                <p className="text-sm text-slate-400">
                  FactorAI is analyzing the machine data...
                </p>
              </section>
            )}

            {machineAnalysis && (
              <section className="mb-8 overflow-hidden rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/[0.10] via-white/[0.035] to-transparent shadow-2xl shadow-blue-950/20">
                <div className="border-b border-white/10 px-6 py-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 ring-1 ring-blue-400/20">
                        <span className="text-lg">✦</span>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-400">
                          FactorAI Intelligence
                        </p>
                        <h2 className="mt-0.5 text-xl font-semibold tracking-tight">
                          {selectedMachine?.name || "Machine"} analysis
                        </h2>
                      </div>
                    </div>
                    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Data-backed insight
                    </span>
                  </div>
                </div>

                <div className="grid gap-0 lg:grid-cols-[1fr_280px]">
                  <div className="px-6 py-6">
                    <div className="whitespace-pre-line text-sm leading-7 text-slate-300">
                      {machineAnalysis}
                    </div>
                  </div>

                  <div className="border-t border-white/10 bg-black/10 px-6 py-6 lg:border-l lg:border-t-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Next action
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-200">
                      Turn this insight into an actionable maintenance task.
                    </p>
                    <button
                      onClick={createTicketFromAnalysis}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-blue-400"
                    >
                      Create Maintenance Ticket
                      <span>→</span>
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* MACHINES */}

            <section className="mb-8">
              <div className="mb-4">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Factory Assets
                </p>

                <h2 className="mt-1 text-xl font-semibold tracking-tight">
                  Machines
                </h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {machines.map((machine) => (
                  <div
                    key={machine.id}
                    className={`rounded-2xl border p-5 transition ${
                      selectedMachineId === machine.id
                        ? "border-blue-500 bg-blue-950/20"
                        : "border-white/10 bg-white/[0.035]"
                    }`}
                  >
                    <button
                      onClick={() => {
                        setSelectedMachineId(machine.id);
                        setMachineAnalysis("");
                      }}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">{machine.name}</h3>

                          <p className="mt-1 text-xs text-slate-500">
                            {machine.machine_type}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            machine.status === "active"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-amber-500/10 text-amber-400"
                          }`}
                        >
                          {machine.status}
                        </span>
                      </div>
                    </button>

                    <button
                      onClick={() => analyzeMachine(machine.id)}
                      disabled={analysisLoading}
                      className="mt-5 w-full rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium transition-all duration-200 ease-out hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {analysisLoading && selectedMachineId === machine.id
                        ? "Analyzing..."
                        : "Analyze with AI"}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* MAINTENANCE */}

            <section
              id="maintenance-section"
              className="mb-8 grid gap-6 lg:grid-cols-2"
            >
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/10 backdrop-blur-sm">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Maintenance
                </p>

                <h2 className="mt-1 text-xl font-semibold tracking-tight">
                  Create Maintenance Ticket
                </h2>

                <div className="mt-5 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm text-slate-400">
                      Machine
                    </label>

                    <CustomSelect
                      value={selectedMachineId?.toString() ?? ""}
                      onChange={(value) => setSelectedMachineId(Number(value))}
                      options={machines.map((machine) => ({
                        value: machine.id.toString(),
                        label: machine.name,
                      }))}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-slate-400">
                      Title
                    </label>

                    <input
                      value={ticketTitle}
                      onChange={(event) => setTicketTitle(event.target.value)}
                      placeholder="e.g. Investigate production drop"
                      className="w-full rounded-lg border border-white/10 bg-[#070b14] px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-slate-400">
                      Description
                    </label>

                    <textarea
                      value={ticketDescription}
                      onChange={(event) =>
                        setTicketDescription(event.target.value)
                      }
                      placeholder="Describe the maintenance issue..."
                      rows={4}
                      className="w-full resize-none rounded-lg border border-white/10 bg-[#070b14] px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-slate-400">
                      Priority
                    </label>

                    <CustomSelect
                      value={ticketPriority}
                      onChange={setTicketPriority}
                      options={[
                        { value: "low", label: "Low" },
                        { value: "medium", label: "Medium" },
                        { value: "high", label: "High" },
                      ]}
                    />
                  </div>

                  <button
                    onClick={createMaintenanceTicket}
                    className="w-full rounded-lg bg-blue-500 px-4 py-3 text-sm font-medium transition-all duration-200 ease-out hover:bg-blue-400"
                  >
                    Create Ticket
                  </button>
                </div>
              </div>

              {/* EXISTING TICKETS */}

              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/10 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      Maintenance
                    </p>

                    <h2 className="mt-1 text-xl font-semibold tracking-tight">
                      Maintenance Tickets
                    </h2>
                  </div>

                  <button
                    onClick={loadDashboard}
                    disabled={loading}
                    className="text-xs text-blue-400 transition-colors hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? "Refreshing..." : "Refresh"}
                  </button>
                </div>

                <div className="mt-5 space-y-3">
                  {tickets.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No maintenance tickets.
                    </p>
                  ) : (
                    tickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="rounded-xl border border-white/10 bg-black/20 p-4 transition-colors hover:bg-white/[0.03]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold">
                              {ticket.title}
                            </h3>

                            <p className="mt-1 text-xs text-slate-500">
                              {ticket.machine}
                            </p>
                          </div>

                          <span className="text-xs text-slate-400">
                            {ticket.priority}
                          </span>
                        </div>

                        <p className="mt-3 text-sm text-slate-400">
                          {ticket.description}
                        </p>

                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-xs text-slate-500">
                            Status: {ticket.status}
                          </span>

                          <CustomSelect
                            value={ticket.status}
                            onChange={(value) =>
                              updateTicketStatus(ticket.id, value)
                            }
                            className="w-36"
                            options={[
                              { value: "open", label: "Open" },
                              { value: "in progress", label: "In Progress" },
                              { value: "resolved", label: "Resolved" },
                            ]}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            {/* ASK FACTORAI */}

            <section className="mb-8 rounded-2xl border border-blue-400/15 bg-gradient-to-br from-blue-500/[0.07] via-slate-900/60 to-cyan-500/[0.035] p-6 shadow-2xl shadow-blue-950/10">
              <div className="mb-5">
                <p className="text-xs font-medium uppercase tracking-wider text-blue-400">
                  AI Operations Assistant
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="mt-1 text-xl font-semibold tracking-tight">
                    Ask FactorAI
                  </h2>
                  <span className="rounded-full border border-blue-400/15 bg-blue-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-blue-300">
                    Local AI
                  </span>
                </div>

                <p className="mt-2 text-sm text-slate-500">
                  Ask questions about production, machines, quality, or
                  maintenance.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={aiQuestion}
                  onChange={(event) => setAiQuestion(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      askFactorAI();
                    }
                  }}
                  placeholder="Why did CNC-01 production drop?"
                  className="flex-1 rounded-lg border border-white/10 bg-[#070b14] px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-blue-500"
                />

                <button
                  onClick={askFactorAI}
                  disabled={aiLoading}
                  className="rounded-lg bg-blue-500 px-6 py-3 text-sm font-medium transition-all duration-200 ease-out hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {aiLoading ? "Thinking..." : "Ask FactorAI"}
                </button>
              </div>

              {aiAnswer && (
                <div className="mt-5 rounded-xl border border-white/10 bg-[#070b14] p-5">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
                    FactorAI Response
                  </p>

                  <div className="whitespace-pre-line text-sm leading-7 text-slate-300">
                    {aiAnswer}
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* FOOTER */}

          <footer className="border-t border-white/10 py-8 text-center">
            <p className="text-xs font-semibold tracking-wide text-slate-500">
              Factor<span className="text-blue-400">AI</span>
            </p>
            <p className="mt-1 text-[11px] text-slate-700">
              AI-powered factory operations • Built for data-backed decisions
            </p>
          </footer>
        </div>
      </main>
    </AuthGuard>
  );
}
