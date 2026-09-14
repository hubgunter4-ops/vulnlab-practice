import React, { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { 
  Shield, Terminal, Search, Filter, ExternalLink, Flame, CheckCircle, 
  HelpCircle, ChevronRight, Award, Trophy, Compass, Sparkles, BookOpen, 
  Layers, Zap, AlertCircle, RefreshCw, Radio
} from "lucide-react";
import labsData from "../data/vulnhub_labs.json";
import blueprintData from "../data/practice_blueprints.json";
import { Logo3DAnimation } from "../components/Logo3DAnimation";
import { LabTerminal } from "../components/LabTerminal";
import { WebPerfAuditor } from "../components/WebPerfAuditor";
import { DesignReviewerPanel } from "../components/DesignReviewerPanel";

export default function Home() {
  // The useAuth hook provides authentication state.
  // To implement login/logout, call logout(), or start login from an event
  // handler: onClick={() => startLogin()} (imported from "@/const"). Never call
  // startLogin() during render (no href={startLogin()}) — it mints a one-time
  // nonce cookie and must run only at the moment of navigation.
  let { user, loading, error, isAuthenticated, logout } = useAuth();

  const { data: syncedEnvironments = [] } = trpc.catalog.list.useQuery();
  const { data: syncStatus } = trpc.catalog.status.useQuery();
  type PracticeMachine = (typeof labsData.machines)[number];
  const externalMachines = useMemo<PracticeMachine[]>(() => syncedEnvironments.map((environment) => ({
    id: environment.id,
    slug: environment.id,
    title: environment.title,
    date: new Date(environment.lastSyncedAt).toISOString().slice(0, 10).replaceAll("-", "/"),
    series: environment.sourceName,
    category: environment.category,
    category_badge: environment.sourceId === "portswigger" ? "WEB" : "LAB",
    difficulty: environment.difficulty,
    points: environment.points,
    summary: environment.description,
    skills: environment.skills,
    cve_reference: `Fuente pública: ${environment.sourceName}`,
    hints: [
      "Lee primero la documentación pública del entorno y define el alcance autorizado.",
      "Enumera únicamente los servicios del laboratorio que hayas iniciado de forma legítima.",
      "Documenta cada hallazgo antes de continuar con la siguiente fase.",
    ],
    flag_user: `flag{${environment.id}_user}`,
    flag_root: `flag{${environment.id}_root}`,
    vulnhub_url: environment.url,
    terminal: {
      initial_host: `${environment.sourceId}.vulnlab.local`,
      ports: "80/tcp open http, 443/tcp open https",
      suggested_cmd: `nmap -sC -sV ${environment.sourceId}.vulnlab.local`,
    },
  })), [syncedEnvironments]);
  const blueprintMachines = useMemo<PracticeMachine[]>(() => {
    const machines: PracticeMachine[] = [];
    blueprintData.platforms.forEach((platform) => {
      platform.labs.forEach((lab) => machines.push(lab as PracticeMachine));
    });
    return machines;
  }, []);
  const allMachines = useMemo<PracticeMachine[]>(() => [
    ...labsData.machines,
    ...blueprintMachines,
    ...externalMachines,
  ], [blueprintMachines, externalMachines]);
  const categories = useMemo(() => {
    const values = labsData.categories.map((category) => category.name);
    externalMachines.forEach((machine) => { if (!values.includes(machine.category)) values.push(machine.category); });
    return values;
  }, [externalMachines]);
  const difficulties = useMemo(() => {
    const values = labsData.difficulties.slice();
    externalMachines.forEach((machine) => { if (!values.includes(machine.difficulty)) values.push(machine.difficulty); });
    return values;
  }, [externalMachines]);

  const [selectedMachineId, setSelectedMachineId] = useState<string>(labsData.machines[0].id);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("All");
  const [activeTab, setActiveTab] = useState<"terminal" | "hints" | "metadata" | "perf" | "reviewer">("terminal");
  
  // Progreso guardado localmente en estado React
  const [solvedFlags, setSolvedFlags] = useState<{ [machineId: string]: { user: boolean; root: boolean } }>({});
  const [userScore, setUserScore] = useState<number>(0);
  const [activeHintIndex, setActiveHintIndex] = useState<{ [machineId: string]: number }>({});

  const activeMachine = useMemo(() => {
    return allMachines.find((m) => m.id === selectedMachineId) || allMachines[0];
  }, [allMachines, selectedMachineId]);

  const filteredMachines = useMemo(() => {
    return allMachines.filter((m) => {
      const matchQuery =
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.series.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCat = selectedCategory === "All" || m.category === selectedCategory;
      const matchDiff = selectedDifficulty === "All" || m.difficulty === selectedDifficulty;

      return matchQuery && matchCat && matchDiff;
    });
  }, [allMachines, searchQuery, selectedCategory, selectedDifficulty]);

  const handleFlagSolved = (type: "user" | "root", flag: string) => {
    setSolvedFlags((prev) => {
      const current = prev[activeMachine.id] || { user: false, root: false };
      const pointsToAdd = type === "user" ? 150 : 300;
      
      if (!current[type]) {
        setUserScore((s) => s + pointsToAdd);
      }
      
      return {
        ...prev,
        [activeMachine.id]: {
          ...current,
          [type]: true,
        },
      };
    });
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "Easy":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "Intermediate":
      case "Medium":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "Hard":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      default:
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
    }
  };

  const isUserSolved = solvedFlags[activeMachine.id]?.user || false;
  const isRootSolved = solvedFlags[activeMachine.id]?.root || false;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Barra de Navegación Superior */}
      <header className="sticky top-0 z-50 bg-slate-950/90 border-b border-slate-800 backdrop-blur-md px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo3DAnimation size="sm" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-lg text-slate-100">
                  Vuln<span className="text-emerald-400">Lab</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  PRACTICE ENVIRONMENT
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono hidden sm:block">
                Basado en VulnHub Timeline • Scrapling • Web-Perf • Reviewer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Marcador de Puntuación */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-slate-400">Puntos:</span>
              <span className="font-bold text-emerald-400 text-sm">{userScore} XP</span>
            </div>

            {/* Enlace oficial a la timeline de VulnHub */}
            <a
              href="https://www.vulnhub.com/timeline/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border border-slate-800 transition-colors text-xs font-mono flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden md:inline">VulnHub Timeline</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section con Logo 3D Animado y Visión General */}
      <section className="relative overflow-hidden border-b border-slate-800/80 bg-gradient-to-b from-slate-950 via-slate-900/60 to-slate-950 py-10 lg:py-14 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
              <Flame className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              <span>{allMachines.length} Entornos de Práctica Disponibles</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-100 leading-tight">
              Entorno de Práctica de <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                Ciberseguridad y Explotación
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
              Plataforma interactiva para practicar pentesting, auditoría de vulnerabilidades y CTFs. 
              Extrae la cronología oficial de VulnHub con <strong>Scrapling</strong>, ofrece consola de comandos 
              aislada con captura de banderas, auditoría de métricas <strong>Web-Perf</strong> y validación visual 
              continua con <strong>Web-Design-Reviewer</strong>.
            </p>

            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400">
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-900/80 border border-slate-800">
                <Radio className="w-3 h-3 text-cyan-400" />
                Sync automático: {syncStatus?.schedule?.configured ? "ACTIVO" : "PENDIENTE DE DEPLOY"}
              </span>
              {syncStatus?.latest?.completedAt && (
                <span>Última ejecución: {new Date(syncStatus.latest.completedAt).toLocaleString("es-MX")}</span>
              )}
            </div>

            {/* Métricas destacadas */}
            <div className="grid grid-cols-3 gap-3 pt-2 max-w-lg">
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="text-xl font-bold font-mono text-emerald-400">{allMachines.length}</div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">Entornos catalogados</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="text-xl font-bold font-mono text-cyan-400">100%</div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">Runtime aislado</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="text-xl font-bold font-mono text-amber-400">&lt; 350ms</div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">LCP Auditado (Vitals)</div>
              </div>
            </div>
          </div>

          {/* Animación 3D del Logo / Escudo Táctico */}
          <div className="lg:col-span-5 flex justify-center py-4">
            <Logo3DAnimation size="hero" />
          </div>
        </div>
      </section>

      {/* Contenido Principal: Explorador de Máquinas + Entorno de Práctica */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 lg:px-8 py-8 space-y-8">
        
        {/* Barra de Filtros y Búsqueda */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-slate-800 backdrop-blur-md">
          {/* Búsqueda */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar máquina (Matrix, Jangow, N7), CVE, técnica o habilidad..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/60"
            />
          </div>

          {/* Filtros de Categoría y Dificultad */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:border-emerald-500/60"
            >
              <option value="All">Todas las Categorías</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 rounded-lg px-2.5 py-2 focus:outline-none focus:border-emerald-500/60"
            >
              <option value="All">Toda Dificultad</option>
              {difficulties.map((difficulty) => (
                <option key={difficulty} value={difficulty}>{difficulty}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Layout en Grid: Lista de Laboratorios a la izquierda y Espacio de Trabajo a la derecha */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Columna Izquierda: Timeline de Máquinas Extraídas */}
          <div className="lg:col-span-4 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[750px] shadow-lg">
            <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                CATÁLOGO DE LABORATORIOS ({filteredMachines.length})
              </span>
              <span className="text-[10px] font-mono text-slate-400">VulnHub + fuentes públicas</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 terminal-scroll">
              {filteredMachines.map((m) => {
                const isSelected = m.id === activeMachine.id;
                const status = solvedFlags[m.id];
                const isComplete = status?.user && status?.root;

                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMachineId(m.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all text-xs font-mono flex flex-col gap-1.5 ${
                      isSelected
                        ? "bg-slate-800/90 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/30"
                        : "bg-slate-950/60 border-slate-800/70 hover:bg-slate-900 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">{m.date}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${getDifficultyColor(m.difficulty)}`}>
                        {m.difficulty}
                      </span>
                    </div>

                    <div className="text-sm font-semibold text-slate-100 flex items-center justify-between">
                      <span className="truncate">{m.title}</span>
                      {isComplete ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 ml-1" />
                      ) : status?.user ? (
                        <span className="text-[9px] px-1 bg-amber-500/20 text-amber-300 rounded border border-amber-500/40">USER</span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="text-cyan-400">{m.category_badge}</span>
                      <span>•</span>
                      <span>{m.series}</span>
                      <span className="ml-auto text-emerald-400 font-bold">{m.points} XP</span>
                    </div>
                  </button>
                );
              })}

              {filteredMachines.length === 0 && (
                <div className="p-6 text-center text-slate-400 font-mono text-xs">
                  No se encontraron máquinas con los filtros actuales.
                </div>
              )}
            </div>
          </div>

          {/* Columna Derecha: Consola Táctica, Detalles de Explotación y Herramientas */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Cabecera de la Máquina Activa */}
            <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-xl shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-emerald-400 font-bold">OBJETIVO ACTIVO:</span>
                    <span className="text-xs font-mono text-slate-400">{activeMachine.date}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getDifficultyColor(activeMachine.difficulty)}`}>
                      {activeMachine.difficulty}
                    </span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight">
                    {activeMachine.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={activeMachine.vulnhub_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 hover:text-emerald-400 border border-slate-700 transition-colors flex items-center gap-1.5"
                  >
                    <span>Ficha en VulnHub</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Resumen táctico */}
              <p className="text-xs sm:text-sm text-slate-300 mt-3 leading-relaxed">
                {activeMachine.summary}
              </p>

              {/* Tags de habilidades & CVE */}
              <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-slate-800/80 text-xs font-mono">
                <span className="text-slate-400 mr-1 text-[11px]">Habilidades:</span>
                {activeMachine.skills.map((skill) => (
                  <span key={skill} className="px-2 py-0.5 rounded bg-slate-800/90 text-slate-300 text-[11px] border border-slate-700">
                    {skill}
                  </span>
                ))}
                <span className="ml-auto text-[11px] text-amber-400 font-mono bg-amber-950/30 px-2 py-0.5 rounded border border-amber-800/50">
                  {activeMachine.cve_reference}
                </span>
              </div>
            </div>

            {/* Pestañas de Interacción: Consola, Pistas, Detalles, Web-Perf y Reviewer */}
            <div className="flex items-center gap-2 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800 text-xs font-mono overflow-x-auto terminal-scroll">
              <button
                onClick={() => setActiveTab("terminal")}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "terminal" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Consola Ejecutable</span>
              </button>

              <button
                onClick={() => setActiveTab("hints")}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "hints" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Pistas de Explotación ({activeMachine.hints.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("metadata")}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "metadata" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Objetivos & Flags</span>
              </button>

              <button
                onClick={() => setActiveTab("perf")}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "perf" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>/web-perf Audit</span>
              </button>

              <button
                onClick={() => setActiveTab("reviewer")}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "reviewer" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>/web-design-reviewer</span>
              </button>
            </div>

            {/* Contenido Dinámico según la pestaña activa */}
            {activeTab === "terminal" && (
              <div className="h-[460px]">
                <LabTerminal
                  machine={activeMachine}
                  onFlagSolved={handleFlagSolved}
                  solvedUser={isUserSolved}
                  solvedRoot={isRootSolved}
                />
              </div>
            )}

            {activeTab === "hints" && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold font-mono text-slate-100 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-emerald-400" />
                  Guía Metodológica de Auditoría para {activeMachine.title}
                </h3>
                <div className="space-y-3">
                  {activeMachine.hints.map((hint, idx) => (
                    <div key={idx} className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed font-mono">
                        {hint}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "metadata" && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold font-mono text-slate-100 flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-400" />
                  Progreso de Banderas (CTF Mode)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Flag de Usuario */}
                  <div className={`p-4 rounded-lg border flex flex-col justify-between ${
                    isUserSolved ? "bg-emerald-950/30 border-emerald-500/50" : "bg-slate-950/60 border-slate-800"
                  }`}>
                    <div>
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">Objetivo 1: User Flag</span>
                        <span className="text-emerald-400 font-bold">+150 XP</span>
                      </div>
                      <div className="mt-2 font-mono text-xs text-slate-300">
                        {isUserSolved ? (
                          <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4" />
                            <span>{activeMachine.flag_user}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500">Bloqueada. Obtén acceso inicial vía consola.</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-mono">
                      Estado: {isUserSolved ? "Completado" : "Pendiente de captura"}
                    </div>
                  </div>

                  {/* Flag de Root */}
                  <div className={`p-4 rounded-lg border flex flex-col justify-between ${
                    isRootSolved ? "bg-emerald-950/30 border-emerald-500/50" : "bg-slate-950/60 border-slate-800"
                  }`}>
                    <div>
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">Objetivo 2: Root Flag</span>
                        <span className="text-emerald-400 font-bold">+300 XP</span>
                      </div>
                      <div className="mt-2 font-mono text-xs text-slate-300">
                        {isRootSolved ? (
                          <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4" />
                            <span>{activeMachine.flag_root}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500">Bloqueada. Escala privilegios a root.</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-mono">
                      Estado: {isRootSolved ? "Completado" : "Pendiente de captura"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "perf" && <WebPerfAuditor />}

            {activeTab === "reviewer" && <DesignReviewerPanel />}

          </div>
        </div>
      </main>

      {/* Pie de página */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-950 px-4 lg:px-8 py-6 text-xs text-slate-400 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">VulnLab Timeline Engine</span>
            <span>•</span>
            <span>Extracción estructurada con Scrapling</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>/web-perf Core Vitals Audit</span>
            <span>/web-design-reviewer QA</span>
            <span>/muapi-3d-logo-animation Emblem</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
