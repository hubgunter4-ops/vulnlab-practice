import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ROOT = resolve(process.env.VULNLAB_WORKSPACE_ROOT ?? "/tmp/vulnlab-workspaces");
const TOKEN_PATTERN = /^[a-zA-Z0-9_./:=+@?,-]+$/;
const MAX_COMMAND_LENGTH = 220;
const MAX_OUTPUT_LENGTH = 12_000;

const LAB_CONTEXT: Record<string, { objective: string; files: Record<string, string> }> = {
  "htb-web-forge": {
    objective: "revisar rutas HTTP y autorización sin atacar una red real",
    files: {
      "README.md": "# Web Forge\nScope: aplicación HTTP local del laboratorio.\nObjetivo: documentar rutas y roles.\n",
      "scope.txt": "ALLOWED_HOST=web-forge.htb.lab\nSERVICES=ssh,http\nNETWORK=disabled\n",
      "evidence/routes.txt": "/\n/login\n/admin/\n/api/v1/auth\n",
    },
  },
  "htb-sherlock-cloud-trail": {
    objective: "correlacionar eventos cloud sintéticos y crear una línea temporal",
    files: {
      "README.md": "# Cloud Trail\nCaso DFIR sintético. No contiene datos reales.\n",
      "scope.txt": "SOURCE=evidence-console.htb.lab\nDATA=synthetic\nNETWORK=disabled\n",
      "evidence/events.log": "2026-09-14T08:10Z user.login source=10.0.0.20\n2026-09-14T08:14Z role.change actor=service\n2026-09-14T08:21Z export.create actor=service\n",
    },
  },
  "htb-ad-pivot": {
    objective: "mapear zonas de confianza y diseñar un pivot documentado",
    files: {
      "README.md": "# Northbridge Pivot\nEscenario empresarial sintético.\n",
      "scope.txt": "ZONES=workstation,app,identity\nTRUST=workstation->app\nNETWORK=disabled\n",
      "evidence/identity.txt": "GROUP=analyst\nROLE=read-only\nPRIVILEGE=none\n",
    },
  },
  "thm-common-attacks": {
    objective: "clasificar señales de phishing y proponer controles preventivos",
    files: {
      "README.md": "# Common Attacks\nMensajes sintéticos para awareness.\n",
      "scope.txt": "DATA=synthetic\nREAL_USERS=none\n",
      "evidence/messages.txt": "message=invoice-review\nlink_domain=invoice-review.invalid\ncontrol=report-and-block\n",
    },
  },
  "thm-researching": {
    objective: "validar fuentes públicas y separar evidencia de hipótesis",
    files: {
      "README.md": "# Introductory Researching\nUsa solo fuentes públicas y no datos personales.\n",
      "scope.txt": "SCOPE=public-documentation\nPII=prohibited\n",
      "evidence/sources.txt": "source_1=vendor-advisory\nsource_2=standards-body\nsource_3=community-summary\n",
    },
  },
  "thm-web-fundamentals": {
    objective: "inspeccionar HTTP, sesiones y validación de entradas",
    files: {
      "README.md": "# Web Fundamentals\nAplicación web local sintética.\n",
      "scope.txt": "HOST=webfundamentals.thm.lab\nPROTOCOLS=http,https\n",
      "evidence/headers.txt": "content-type=text/html\ncache-control=no-store\nset-cookie=session; HttpOnly\n",
    },
  },
  "ps-sql-injection": {
    objective: "identificar una entrada vulnerable y proponer consultas parametrizadas",
    files: {
      "README.md": "# SQL Injection\nAnaliza el contexto; no envíes payloads a sistemas externos.\n",
      "scope.txt": "HOST=academy-sqli.lab\nINPUT=category\nDEFENSE=parameterized-query\n",
      "evidence/query.txt": "SELECT name FROM products WHERE category = ?\n",
    },
  },
  "ps-xss-reflected": {
    objective: "localizar el contexto de salida y seleccionar codificación HTML",
    files: {
      "README.md": "# Reflected XSS\nEjercicio de revisión de salida en una aplicación sintética.\n",
      "scope.txt": "HOST=academy-xss.lab\nCONTEXT=html-text\nDEFENSE=contextual-encoding\n",
      "evidence/response.txt": "content-type=text/html\ncontent-security-policy=report-only\n",
    },
  },
  "ps-access-control": {
    objective: "construir una matriz de roles y revisar autorización server-side",
    files: {
      "README.md": "# Access Control\nRoles y endpoints sintéticos para pruebas negativas.\n",
      "scope.txt": "HOST=academy-authz.lab\nROLES=visitor,user,admin\nAUTHZ=server-side-required\n",
      "evidence/roles.csv": "role,endpoint,expected\nvisitor,/admin,403\nuser,/profile,200\nadmin,/admin,200\n",
    },
  },
};

function tokenize(command: string): string[] {
  if (command.length > MAX_COMMAND_LENGTH || /[;|&><`$()\n\r]/.test(command)) {
    throw new Error("Comando rechazado: solo se permiten comandos simples sin shell operators.");
  }
  const tokens = command.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || tokens.length > 10 || tokens.some(token => !TOKEN_PATTERN.test(token))) {
    throw new Error("Sintaxis no permitida en el sandbox.");
  }
  return tokens;
}

function safePath(workspace: string, input: string): string {
  if (input.startsWith("-") || isAbsolute(input)) throw new Error("Ruta no permitida.");
  const target = resolve(workspace, input);
  const rel = relative(workspace, target);
  if (rel.startsWith("..") || isAbsolute(rel)) throw new Error("Ruta fuera del workspace.");
  return target;
}

async function ensureWorkspace(labId: string): Promise<string> {
  const workspace = resolve(ROOT, labId.replace(/[^a-zA-Z0-9_-]/g, "-"));
  const context = LAB_CONTEXT[labId] ?? {
    objective: "examinar evidencia sintética del laboratorio",
    files: {
      "README.md": `# ${labId}\nWorkspace sintético y aislado.\n`,
      "scope.txt": "NETWORK=disabled\nDATA=synthetic\n",
    },
  };
  for (const [path, content] of Object.entries(context.files)) {
    const target = safePath(workspace, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, { encoding: "utf8", flag: "wx" }).catch(error => {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    });
  }
  return workspace;
}

function helpText(labId: string): string {
  const objective = LAB_CONTEXT[labId]?.objective ?? "examinar evidencia sintética";
  return `[sandbox] Objetivo: ${objective}\nComandos reales permitidos:\n  pwd\n  ls [ruta]\n  find . -maxdepth 2 -type f\n  cat <archivo>\n  head <archivo>\n  grep <patrón> <archivo>\n  whoami\n  id\nNo hay red, shell arbitraria, sudo, ejecución de payloads ni acceso fuera de este workspace.`;
}

export async function executeLabCommand(labId: string, command: string) {
  const tokens = tokenize(command);
  const workspace = await ensureWorkspace(labId);
  const [program, ...rawArgs] = tokens;

  if (program === "help") return { output: helpText(labId), exitCode: 0 };
  if (["nmap", "curl", "gobuster", "enum", "scan", "exploit", "privesc"].includes(program)) {
    return {
      output: `[sandbox] ${program}: este laboratorio no tiene red ni objetivos externos. Usa 'find', 'cat', 'grep' y 'head' sobre la evidencia local.`,
      exitCode: 126,
    };
  }

  let args = rawArgs;
  if (program === "ls") {
    args = args.filter(arg => arg !== "-la" && arg !== "-l" && arg !== "-a");
    args = args.length ? [safePath(workspace, args[0])] : [workspace];
  } else if (program === "cat") {
    if (args.length !== 1) throw new Error("Uso: cat <archivo>");
    args = [safePath(workspace, args[0])];
  } else if (program === "head") {
    if (args.length === 1) args = [safePath(workspace, args[0])];
    else if (args.length === 2 && args[0] === "-n") args = ["-n", "20", safePath(workspace, args[1])];
    else throw new Error("Uso: head <archivo>");
  } else if (program === "grep") {
    if (args.length !== 2 || args[0].startsWith("-")) throw new Error("Uso: grep <patrón> <archivo>");
    args = [args[0], safePath(workspace, args[1])];
  } else if (program === "find") {
    if (args.length !== 5 || args[0] !== "." || args[1] !== "-maxdepth" || args[2] !== "2" || args[3] !== "-type" || args[4] !== "f") {
      throw new Error("Uso: find . -maxdepth 2 -type f");
    }
    args = [workspace, "-maxdepth", "2", "-type", "f"];
  } else if (program === "pwd") {
    return { output: workspace, exitCode: 0 };
  } else if (program === "whoami") {
    return { output: "student", exitCode: 0 };
  } else if (program === "id") {
    return { output: "uid=1000(student) gid=1000(student) groups=1000(student)", exitCode: 0 };
  } else {
    throw new Error(`Comando no permitido: ${program}. Escribe 'help'.`);
  }

  const result = await execFileAsync(program, args, {
    cwd: workspace,
    timeout: 2_000,
    maxBuffer: MAX_OUTPUT_LENGTH,
    shell: false,
    env: { PATH: "/usr/bin:/bin", HOME: homedir(), LANG: "C" },
  });
  return { output: result.stdout.slice(0, MAX_OUTPUT_LENGTH), exitCode: 0 };
}
