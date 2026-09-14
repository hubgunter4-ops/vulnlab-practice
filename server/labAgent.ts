import { z } from "zod";
import { invokeLLM } from "./_core/llm";

const blueprintSchema = z.object({
  title: z.string().min(3).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/).max(80),
  category: z.string().min(2).max(60),
  category_badge: z.string().min(2).max(16),
  difficulty: z.string().min(2).max(24),
  points: z.number().int().min(50).max(1000),
  summary: z.string().min(20).max(500),
  skills: z.array(z.string().min(2).max(60)).min(2).max(8),
  hints: z.array(z.string().min(20).max(280)).min(2).max(5),
  terminal: z.object({
    initial_host: z.string().min(3).max(100),
    ports: z.string().min(3).max(240),
    suggested_cmd: z.string().min(3).max(180),
  }),
});

export type GeneratedLabBlueprint = z.infer<typeof blueprintSchema> & {
  id: string;
  date: string;
  series: string;
  cve_reference: string;
  flag_user: string;
  flag_root: string;
  vulnhub_url: string;
};

const responseFormat = {
  type: "json_schema" as const,
  json_schema: {
    name: "practice_lab_blueprint",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        slug: { type: "string" },
        category: { type: "string" },
        category_badge: { type: "string" },
        difficulty: { type: "string" },
        points: { type: "integer" },
        summary: { type: "string" },
        skills: { type: "array", items: { type: "string" } },
        hints: { type: "array", items: { type: "string" } },
        terminal: {
          type: "object",
          additionalProperties: false,
          properties: {
            initial_host: { type: "string" },
            ports: { type: "string" },
            suggested_cmd: { type: "string" },
          },
          required: ["initial_host", "ports", "suggested_cmd"],
        },
      },
      required: ["title", "slug", "category", "category_badge", "difficulty", "points", "summary", "skills", "hints", "terminal"],
    },
  },
};

const safeSystemPrompt = `You create safe, reproducible cybersecurity practice blueprints for a browser lab.
Return only a blueprint, never exploit code, malware, credentials, payloads, persistence, destructive actions, or real targets.
The terminal is an isolated allowlisted workspace with no network access. Use fictional hostnames and educational hints focused on observation, documentation, and remediation.
Do not claim that a real machine has been downloaded or deployed. Keep all identifiers suitable for a URL slug.`;

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "generated-lab";

function finalizeBlueprint(raw: unknown, request: string, provider: string): GeneratedLabBlueprint {
  const blueprint = blueprintSchema.parse(raw);
  const suffix = `${Date.now()}`;
  const id = `generated-${slugify(blueprint.slug || blueprint.title)}-${suffix}`;
  return {
    ...blueprint,
    id,
    slug: id,
    date: new Date().toISOString().slice(0, 10).replaceAll("-", "/"),
    series: provider === "custom" ? "API configurable" : "VulnLab AI Agent",
    cve_reference: `Blueprint generado para: ${request.slice(0, 80)}`,
    flag_user: `flag{${id}_user}`,
    flag_root: `flag{${id}_root}`,
    vulnhub_url: "https://www.vulnhub.com/",
  };
}

async function callCustomApi(input: { endpoint: string; apiKey: string; model?: string; request: string }) {
  const endpoint = input.endpoint.trim().replace(/\/$/, "");
  if (!/^https?:\/\//i.test(endpoint)) throw new Error("La URL de la API debe comenzar con http:// o https://.");
  const parsed = new URL(endpoint);
  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || hostname === "metadata.google.internal" || hostname === "0.0.0.0" || hostname === "127.0.0.1" || hostname === "::1" || /^10\./.test(hostname) || /^192\.168\./.test(hostname) || /^169\.254\./.test(hostname) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) {
    throw new Error("Por seguridad, la API configurable debe ser un endpoint público y no una red privada.");
  }
  const url = endpoint.endsWith("/chat/completions") ? endpoint : `${endpoint}/v1/chat/completions`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${input.apiKey}` },
    body: JSON.stringify({
      model: input.model || "gpt-4o-mini",
      messages: [
        { role: "system", content: safeSystemPrompt },
        { role: "user", content: `Create one lab blueprint for this request: ${input.request}` },
      ],
      temperature: 0.3,
      response_format: responseFormat,
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new Error(`La API configurable respondió ${response.status}.`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("La API configurable no devolvió un blueprint.");
  return JSON.parse(content);
}

export async function generateLabBlueprint(input: {
  request: string;
  provider: "builtin" | "custom";
  endpoint?: string;
  apiKey?: string;
  model?: string;
}) {
  const request = input.request.trim();
  if (request.length < 8 || request.length > 600) throw new Error("Describe el laboratorio con entre 8 y 600 caracteres.");

  let raw: unknown;
  if (input.provider === "custom") {
    if (!input.endpoint || !input.apiKey) throw new Error("Indica la URL y la API key para usar una API configurable.");
    raw = await callCustomApi({ endpoint: input.endpoint, apiKey: input.apiKey, model: input.model, request });
  } else {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: safeSystemPrompt },
        { role: "user", content: `Create one lab blueprint for this request: ${request}` },
      ],
      response_format: responseFormat,
      maxTokens: 2400,
    });
    const content = response.choices[0]?.message.content;
    raw = typeof content === "string" ? JSON.parse(content) : null;
  }

  return finalizeBlueprint(raw, request, input.provider);
}
