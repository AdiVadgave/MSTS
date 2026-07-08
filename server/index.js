// ─────────────────────────────────────────────────────────────
// MSTS One — AI proxy server
// Holds the Azure OpenAI key server-side and exposes /api/ai/*.
// The browser never sees the key. If Azure isn't configured, it
// falls back to a realistic mock so the prototype always works.
// ─────────────────────────────────────────────────────────────
import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "25mb" }));

const PORT = process.env.API_PORT || 8787;
const {
  AZURE_OPENAI_API_KEY,
  AZURE_OPENAI_ENDPOINT,
  AZURE_OPENAI_DEPLOYMENT_NAME = "gpt-4o",
  AZURE_OPENAI_API_VERSION = "2024-08-01-preview",
} = process.env;

const azureConfigured =
  !!AZURE_OPENAI_API_KEY && !!AZURE_OPENAI_ENDPOINT;

const EXTRACTION_PROMPT = `You are an expert at reading European vehicle registration certificates (RC cards / "kentekenbewijs" / "Fahrzeugschein").
Extract the following fields from the provided image and return ONLY a JSON object (no markdown, no prose) with these exact keys:
{
  "plate": string,               // registration / license plate
  "vin": string,                 // chassis / VIN
  "make": string,
  "model": string,
  "firstRegistration": string,   // ISO date or DD.MM.YYYY as printed
  "euronorm": string,            // e.g. "EURO 6"
  "totalWeightKg": number,       // max permissible mass in kg
  "axles": number,
  "co2Emission": number,         // g/km, 0 if unknown
  "countryCode": string          // ISO 3166 alpha-2, e.g. "NL"
}
If a field is not present, use an empty string for strings and 0 for numbers. Do not invent values.`;

function healthPayload() {
  return {
    ok: true,
    azureConfigured,
    deployment: AZURE_OPENAI_DEPLOYMENT_NAME,
    apiVersion: AZURE_OPENAI_API_VERSION,
  };
}

app.get("/api/ai/health", (_req, res) => res.json(healthPayload()));

app.post("/api/ai/rc-card", async (req, res) => {
  const { imageBase64 } = req.body ?? {};
  if (!imageBase64) {
    return res.status(400).json({ error: "imageBase64 is required" });
  }

  // Fallback mock when Azure credentials are absent.
  if (!azureConfigured) {
    await new Promise((r) => setTimeout(r, 1600));
    return res.json(mockExtraction());
  }

  try {
    const url = `${AZURE_OPENAI_ENDPOINT.replace(/\/$/, "")}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT_NAME}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`;

    const dataUrl = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    const body = {
      messages: [
        { role: "system", content: EXTRACTION_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the vehicle registration fields from this RC card." },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      temperature: 0,
      max_tokens: 800,
      response_format: { type: "json_object" },
    };

    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": AZURE_OPENAI_API_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      console.error("Azure OpenAI error:", r.status, detail);
      // Graceful fallback so the demo keeps working.
      return res.json({ ...mockExtraction(), source: "mock" });
    }

    const json = await r.json();
    const content = json.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);

    return res.json({
      plate: parsed.plate ?? "",
      vin: parsed.vin ?? "",
      make: parsed.make ?? "",
      model: parsed.model ?? "",
      firstRegistration: parsed.firstRegistration ?? "",
      euronorm: parsed.euronorm ?? "",
      totalWeightKg: Number(parsed.totalWeightKg) || 0,
      axles: Number(parsed.axles) || 0,
      co2Emission: Number(parsed.co2Emission) || 0,
      countryCode: parsed.countryCode ?? "",
      confidence: 0.94,
      source: "azure-openai",
      raw: parsed,
    });
  } catch (err) {
    console.error("Extraction failure:", err);
    return res.json({ ...mockExtraction(), source: "mock" });
  }
});

function mockExtraction() {
  const makes = [
    ["Volvo", "FH16"],
    ["Scania", "R500"],
    ["DAF", "XF 480"],
    ["MAN", "TGX 18.510"],
    ["Mercedes-Benz", "Actros 1851"],
  ];
  const [make, model] = makes[Math.floor(Math.random() * makes.length)];
  const n = () => Math.floor(Math.random() * 9);
  return {
    plate: `${n()}${n()}-ABC-${n()}`,
    vin: `WVN${Array.from({ length: 14 }, () => "ABCDEFGHJKLMNPRSTUVWXYZ0123456789"[Math.floor(Math.random() * 33)]).join("")}`,
    make,
    model,
    firstRegistration: "12.06.2022",
    euronorm: "EURO 6",
    totalWeightKg: 40000,
    axles: 5,
    co2Emission: 0,
    countryCode: "NL",
    confidence: 0.88,
    source: "mock",
  };
}

// ── Whitelabel solution-builder assists ─────────────────────────
// Same conventions as /api/ai/rc-card: real Azure when configured,
// deterministic mock otherwise, graceful fallback on any failure.

async function azureJson(messages, maxTokens = 600) {
  const url = `${AZURE_OPENAI_ENDPOINT.replace(/\/$/, "")}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT_NAME}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": AZURE_OPENAI_API_KEY },
    body: JSON.stringify({
      messages,
      temperature: 0.4,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => "");
    throw new Error(`Azure OpenAI ${r.status}: ${detail.slice(0, 300)}`);
  }
  const json = await r.json();
  return JSON.parse(json.choices?.[0]?.message?.content ?? "{}");
}

const MODULE_CATALOG = `Available module flags (use ONLY these exact strings):
dashboard (fleet KPIs), vehicles (vehicle management), obu (on-board devices),
hauliers (carrier companies), products (toll product ordering), domains (toll coverage),
transactions (toll passages), reports (reporting & exports), finance (invoices & AR),
users (user & access management), onboarding (customer self-registration),
api-access (partner API), branded-invoicing (partner-branded documents),
scheduled-reports (recurring reports).
Packages: basic = dashboard,vehicles,obu,hauliers,products,domains ·
professional = basic + transactions,reports,branded-invoicing,scheduled-reports ·
enterprise = professional + finance,users,onboarding,api-access.`;

app.post("/api/ai/brand-from-logo", async (req, res) => {
  const { imageBase64 } = req.body ?? {};
  if (!imageBase64) return res.status(400).json({ error: "imageBase64 is required" });
  if (!azureConfigured) {
    await new Promise((r) => setTimeout(r, 1200));
    return res.json(mockBrandFromLogo());
  }
  try {
    const dataUrl = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:image/png;base64,${imageBase64}`;
    const parsed = await azureJson([
      {
        role: "system",
        content: `You are a brand designer. Analyse the company logo image and return ONLY JSON:
{
  "palette": string[],          // 3-5 dominant hex colors, "#RRGGBB"
  "suggestedAccent": string,    // ONE hex best suited as a UI accent (saturated, mid-luminance; avoid near-white/near-black)
  "suggestedTemplate": string,  // "signage" | "executive" | "carbon" — carbon for dark/tech brands, executive for corporate/clean, signage for bold/industrial
  "rationale": string           // one sentence
}`,
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Extract the brand palette and suggest a portal accent + design template." },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ]);
    return res.json({
      palette: Array.isArray(parsed.palette) ? parsed.palette : [],
      suggestedAccent: parsed.suggestedAccent ?? "",
      suggestedTemplate: parsed.suggestedTemplate ?? "executive",
      rationale: parsed.rationale ?? "",
      source: "azure-openai",
    });
  } catch (err) {
    console.error("brand-from-logo failure:", err);
    return res.json(mockBrandFromLogo());
  }
});

app.post("/api/ai/recommend-solution", async (req, res) => {
  const { description } = req.body ?? {};
  if (!description) return res.status(400).json({ error: "description is required" });
  const desc = String(description).slice(0, 2000);
  if (!azureConfigured) {
    await new Promise((r) => setTimeout(r, 1200));
    return res.json(mockRecommendation(desc));
  }
  try {
    const parsed = await azureJson([
      {
        role: "system",
        content: `You configure whitelabel tolling portals for business partners. ${MODULE_CATALOG}
Given a partner's business description, return ONLY JSON:
{
  "package": string,        // "basic" | "professional" | "enterprise" — closest tier
  "modules": string[],      // exact flags the partner needs (may deviate from the tier)
  "reasoning": [ { "module": string, "why": string } ]  // one short line per chosen module
}`,
      },
      { role: "user", content: desc },
    ], 900);
    return res.json({
      package: parsed.package ?? "professional",
      modules: Array.isArray(parsed.modules) ? parsed.modules : [],
      reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning : [],
      source: "azure-openai",
    });
  } catch (err) {
    console.error("recommend-solution failure:", err);
    return res.json(mockRecommendation(desc));
  }
});

app.post("/api/ai/portal-copy", async (req, res) => {
  const { companyName, description } = req.body ?? {};
  if (!companyName) return res.status(400).json({ error: "companyName is required" });
  if (!azureConfigured) {
    await new Promise((r) => setTimeout(r, 900));
    return res.json(mockPortalCopy(companyName));
  }
  try {
    const parsed = await azureJson([
      {
        role: "system",
        content: `You write concise product copy for a whitelabel tolling portal. Return ONLY JSON:
{
  "portalName": string,   // short portal name incorporating the company brand, max 4 words
  "tagline": string,      // positioning line, max 8 words, no trailing period rules — natural
  "welcomeText": string   // one warm login-screen sentence, max 14 words
}`,
      },
      {
        role: "user",
        content: `Company: ${companyName}\n${description ? `About them: ${description}` : ""}`,
      },
    ]);
    return res.json({
      portalName: parsed.portalName ?? `${companyName} Tolls`,
      tagline: parsed.tagline ?? "",
      welcomeText: parsed.welcomeText ?? "",
      source: "azure-openai",
    });
  } catch (err) {
    console.error("portal-copy failure:", err);
    return res.json(mockPortalCopy(companyName));
  }
});

function mockBrandFromLogo() {
  const options = [
    { palette: ["#0E4DA4", "#12B5CB", "#0A2540", "#F4F7FA"], suggestedAccent: "#0E4DA4", suggestedTemplate: "executive", rationale: "Corporate blues suit a clean executive look." },
    { palette: ["#C2410C", "#F59E0B", "#1C1917", "#FFFBEB"], suggestedAccent: "#C2410C", suggestedTemplate: "signage", rationale: "Bold industrial tones fit the signage aesthetic." },
    { palette: ["#22D3EE", "#0F172A", "#334155", "#E2E8F0"], suggestedAccent: "#22D3EE", suggestedTemplate: "carbon", rationale: "High-contrast tech palette works best on a dark console." },
  ];
  const pick = options[Math.floor(Math.random() * options.length)];
  return { ...pick, source: "mock" };
}

function mockRecommendation(description) {
  const d = String(description).toLowerCase();
  const wantsFinance = /invoic|billing|finance|account/i.test(d);
  const wantsApi = /api|integrat|erp|crm/i.test(d);
  const modules = ["dashboard", "vehicles", "obu", "hauliers", "products", "domains", "transactions", "reports", "branded-invoicing", "scheduled-reports"];
  if (wantsFinance) modules.push("finance");
  if (wantsApi) modules.push("api-access", "users", "onboarding");
  return {
    package: wantsApi ? "enterprise" : "professional",
    modules,
    reasoning: [
      { module: "vehicles", why: "Fleet operators need vehicle lifecycle management." },
      { module: "transactions", why: "Toll passage visibility is core to reconciliation." },
      { module: "reports", why: "Recurring exports keep finance teams out of the portal." },
      ...(wantsFinance ? [{ module: "finance", why: "You mentioned invoicing — include receivables handling." }] : []),
      ...(wantsApi ? [{ module: "api-access", why: "System integration calls for API access." }] : []),
    ],
    source: "mock",
  };
}

function mockPortalCopy(companyName) {
  const first = String(companyName).split(/\s+/)[0] || "Partner";
  return {
    portalName: `${first} Toll Portal`,
    tagline: "Every toll, one place.",
    welcomeText: `Welcome to ${first}'s tolling portal — let's get you moving.`,
    source: "mock",
  };
}

app.listen(PORT, () => {
  console.log(
    `\n  ⚡ MSTS One AI proxy on http://localhost:${PORT}` +
      `\n  Azure OpenAI: ${azureConfigured ? "configured ✓" : "NOT configured — using mock extraction"}\n`
  );
});
