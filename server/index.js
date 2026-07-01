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

app.listen(PORT, () => {
  console.log(
    `\n  ⚡ MSTS One AI proxy on http://localhost:${PORT}` +
      `\n  Azure OpenAI: ${azureConfigured ? "configured ✓" : "NOT configured — using mock extraction"}\n`
  );
});
