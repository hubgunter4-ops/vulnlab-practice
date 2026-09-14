import React, { useState, useRef, useEffect } from "react";
import { Terminal as TerminalIcon, Play, RotateCcw, Copy, Check, Sparkles, Shield, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface TerminalProps {
  machine: {
    id: string;
    title: string;
    terminal: {
      initial_host: string;
      ports: string;
      suggested_cmd: string;
    };
    flag_user: string;
    flag_root: string;
    hints: string[];
  };
  onFlagSolved?: (type: "user" | "root", flag: string) => void;
  solvedUser?: boolean;
  solvedRoot?: boolean;
}

interface CommandLog {
  id: string;
  type: "input" | "output" | "error" | "success" | "system";
  text: string;
}

export const LabTerminal: React.FC<TerminalProps> = ({
  machine,
  onFlagSolved,
  solvedUser = false,
  solvedRoot = false,
}) => {
  const [inputVal, setInputVal] = useState("");
  const [logs, setLogs] = useState<CommandLog[]>([
    {
      id: "1",
      type: "system",
      text: `[+] Conexión de laboratorio iniciada hacia target: ${machine.terminal.initial_host} (10.10.10.x)`,
    },
    {
      id: "2",
      type: "system",
      text: `[!] Servicios detectados en target:\n    ${machine.terminal.ports.replace(/, /g, "\n    ")}`,
    },
    {
      id: "3",
      type: "system",
      text: `[i] Escribe 'help' para comandos de auditoría o envía flags con 'submit <flag>'`,
    },
  ]);
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const executeCommand = trpc.lab.execute.useMutation();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Si cambia la máquina activa, reiniciar logs con el contexto de la nueva máquina
  useEffect(() => {
    setLogs([
      {
        id: "sys-init",
        type: "system",
        text: `[+] Target cargado: ${machine.title} [${machine.terminal.initial_host}]`,
      },
      {
        id: "sys-ports",
        type: "system",
        text: `[*] Mapeo de puertos conocidos:\n    ${machine.terminal.ports.replace(/, /g, "\n    ")}`,
      },
      {
        id: "sys-hint",
        type: "system",
        text: `[i] Comando sugerido para reconocimiento: ${machine.terminal.suggested_cmd}`,
      },
    ]);
  }, [machine.id]);

  const handleRunCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = inputVal.trim();
    if (!cmd) return;

    const newLogs: CommandLog[] = [
      ...logs,
      { id: Date.now().toString(), type: "input", text: `pentester@vulnlab:~$ ${cmd}` },
    ];

    const lower = cmd.toLowerCase();

    if (lower === "clear" || lower === "cls") {
      setLogs([]);
      setInputVal("");
      return;
    }

    if (lower.startsWith("submit ")) {
      const submitted = cmd.substring(7).trim();
      if (submitted === machine.flag_user) {
        newLogs.push({
          id: (Date.now() + 1).toString(),
          type: "success",
          text: `[✓] ¡FLAG DE USUARIO CORRECTA! Has desbloqueado el acceso inicial (+150 pts)`,
        });
        onFlagSolved?.("user", submitted);
      } else if (submitted === machine.flag_root) {
        newLogs.push({
          id: (Date.now() + 1).toString(),
          type: "success",
          text: `[✓✓] ¡¡FLAG DE ROOT CORRECTA!! Máquina comprometida totalmente (+300 pts)`,
        });
        onFlagSolved?.("root", submitted);
      } else {
        newLogs.push({
          id: (Date.now() + 1).toString(),
          type: "error",
          text: `[-] Flag inválida. Verifica sintaxis o continúa la enumeración de la máquina.`,
        });
      }
    } else {
      const result = await executeCommand.mutateAsync({ labId: machine.id, command: cmd });
      newLogs.push({
        id: (Date.now() + 1).toString(),
        type: result.exitCode === 0 ? "output" : "error",
        text: result.output,
      });
    }

    setLogs(newLogs);
    setInputVal("");
  };

  const copySuggested = () => {
    navigator.clipboard.writeText(machine.terminal.suggested_cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Cabecera de la Terminal */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="text-xs font-mono text-slate-400 font-medium ml-2 flex items-center gap-1.5">
            <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
            vulnlab@bash: {machine.terminal.initial_host}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLogs([])}
            title="Limpiar consola"
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors text-xs flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Barra de atajo / Comando sugerido */}
      <div className="px-4 py-2 bg-slate-900/40 border-b border-slate-800/80 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-400 overflow-hidden text-ellipsis whitespace-nowrap">
          <span className="text-emerald-400 font-bold">SUGGESTION:</span>
          <span className="text-slate-300 select-all">{machine.terminal.suggested_cmd}</span>
        </div>
        <button
          onClick={copySuggested}
          className="ml-2 flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors shrink-0"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? "Copiado" : "Copiar"}</span>
        </button>
      </div>

      {/* Salida de la Terminal */}
      <div className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-2 terminal-scroll bg-slate-950/95 text-slate-200">
        {logs.map((log) => (
          <div
            key={log.id}
            className={`whitespace-pre-wrap leading-relaxed ${
              log.type === "input"
                ? "text-emerald-400 font-semibold"
                : log.type === "error"
                ? "text-rose-400"
                : log.type === "success"
                ? "text-emerald-300 bg-emerald-950/40 p-2 rounded border border-emerald-800/50"
                : log.type === "system"
                ? "text-cyan-300/90"
                : "text-slate-300"
            }`}
          >
            {log.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Entrada de Comandos */}
      <form onSubmit={handleRunCommand} className="flex items-center border-t border-slate-800 bg-slate-900/80 px-3 py-2">
          <span className="text-emerald-400 font-mono text-xs font-bold mr-2 select-none">
          student@vulnlab:~$
        </span>
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Escribe 'help', 'find', 'cat', 'grep' o 'submit <flag>'..."
          className="flex-1 bg-transparent border-0 outline-none font-mono text-xs text-slate-100 placeholder:text-slate-500"
          autoFocus
        />
        <button
          type="submit"
          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded transition-colors flex items-center gap-1"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>Ejecutar</span>
        </button>
      </form>
    </div>
  );
};
