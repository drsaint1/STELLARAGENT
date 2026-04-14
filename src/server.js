import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import { paymentMiddlewareFromConfig } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/http";
import { ExactStellarScheme } from "@x402/stellar/exact/server";

import {
  createWallet,
  fundWallet,
  getBalance,
  buildUnsignedPayment,
  submitSignedTransaction,
  HORIZON_URL,
  USDC_ISSUER,
} from "./stellar.js";
import { braveSearch } from "./services/search.js";
import { getNews } from "./services/news.js";
import { getMarketData } from "./services/market.js";
import { generateCode, explainCode } from "./services/code.js";
import { generateImage, editImage } from "./services/image.js";
import { runAgent } from "./agent.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Server wallet (receives x402 payments)
const SERVER_ADDRESS = process.env.SERVER_STELLAR_ADDRESS;

// x402 facilitator
const FACILITATOR_URL = "https://channels.openzeppelin.com/x402/testnet";

// USDC pricing for x402 routes (human-readable)
const PRICES = {
  search: "$0.01",
  news: "$0.005",
  market: "$0.002",
  code_generate: "$0.01",
  code_explain: "$0.005",
  image_generate: "$0.02",
  image_edit: "$0.015",
};

// Helper to create a route config with x402 PaymentOption
// Pass price as Money (string like "0.01") — the ExactStellarScheme.parsePrice()
// converts this to proper USDC stroops (0.01 → 100000 stroops) automatically.
function route(price, description) {
  return {
    accepts: {
      scheme: "exact",
      network: "stellar:testnet",
      payTo: SERVER_ADDRESS,
      price: price,
      maxTimeoutSeconds: 60,
    },
    description,
  };
}

// x402 route configuration (RoutesConfig format)
const x402Routes = {
  "POST /api/search": route("0.01", "Search the web using Gemini + Google Search"),
  "POST /api/news": route("0.005", "Get recent news articles"),
  "POST /api/market": route("0.002", "Get crypto market data"),
  "POST /api/code/generate": route("0.01", "Generate code using Gemini AI"),
  "POST /api/code/explain": route("0.005", "Explain and review code using Gemini AI"),
  "POST /api/image/generate": route("0.02", "Generate images using AI"),
  "POST /api/image/edit": route("0.015", "Edit images using AI"),
};

// --- Apply x402 payment middleware ---
async function setupX402() {
  const facilitatorApiKey = process.env.X402_FACILITATOR_KEY;
  const facilitatorClient = new HTTPFacilitatorClient({
    url: FACILITATOR_URL,
    createAuthHeaders: facilitatorApiKey
      ? async () => {
          const authHeader = { Authorization: `Bearer ${facilitatorApiKey}` };
          return { verify: authHeader, settle: authHeader, supported: authHeader };
        }
      : undefined,
  });

  const stellarScheme = new ExactStellarScheme();

  app.use(
    paymentMiddlewareFromConfig(
      x402Routes,
      [facilitatorClient],
      [{ network: "stellar:testnet", server: stellarScheme }],
      undefined,  // paywallConfig
      undefined,  // paywall
      true        // syncFacilitatorOnStart
    )
  );
}

// --- Service discovery ---
app.get("/api/services", (req, res) => {
  res.json({
    services: [
      {
        name: "web_search",
        endpoint: "/api/search",
        cost: PRICES.search + " USDC",
        description: "Search the web using Gemini + Google Search",
      },
      {
        name: "get_news",
        endpoint: "/api/news",
        cost: PRICES.news + " USDC",
        description: "Get recent news articles from NewsAPI",
      },
      {
        name: "get_market_data",
        endpoint: "/api/market",
        cost: PRICES.market + " USDC",
        description: "Get crypto market data from CoinGecko",
      },
      {
        name: "generate_code",
        endpoint: "/api/code/generate",
        cost: PRICES.code_generate + " USDC",
        description: "Generate code using Gemini AI",
      },
      {
        name: "explain_code",
        endpoint: "/api/code/explain",
        cost: PRICES.code_explain + " USDC",
        description: "Explain and review code using Gemini AI",
      },
      {
        name: "generate_image",
        endpoint: "/api/image/generate",
        cost: PRICES.image_generate + " USDC",
        description: "Generate images using Replicate/Gemini",
      },
      {
        name: "edit_image",
        endpoint: "/api/image/edit",
        cost: PRICES.image_edit + " USDC",
        description: "Edit images using Replicate/Gemini",
      },
    ],
    paymentAddress: SERVER_ADDRESS,
    network: "stellar:testnet",
    protocol: "x402",
  });
});

// --- Paid API endpoints (x402 middleware handles 402 + settlement) ---

// Research tools
app.post("/api/search", async (req, res) => {
  try {
    const data = await braveSearch(req.body.query);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/news", async (req, res) => {
  try {
    const data = await getNews(req.body.topic);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/market", async (req, res) => {
  try {
    const data = await getMarketData(req.body.query);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Code tools
app.post("/api/code/generate", async (req, res) => {
  try {
    const data = await generateCode(req.body.language, req.body.description);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/code/explain", async (req, res) => {
  try {
    const data = await explainCode(req.body.code, req.body.language);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Image tools
app.post("/api/image/generate", async (req, res) => {
  try {
    const data = await generateImage(req.body.prompt, req.body.style);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/image/edit", async (req, res) => {
  try {
    const data = await editImage(req.body.imageUrl, req.body.instructions);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Wallet endpoints ---
app.get("/api/wallet/create", async (req, res) => {
  try {
    const wallet = createWallet();
    await fundWallet(wallet.publicKey);
    const balance = await getBalance(wallet.publicKey);
    res.json({ ...wallet, balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/wallet/balance/:publicKey", async (req, res) => {
  try {
    const balance = await getBalance(req.params.publicKey);
    res.json({ publicKey: req.params.publicKey, balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- API status endpoint ---
app.get("/api/status", (req, res) => {
  res.json({
    keys: {
      gemini: !!process.env.GEMINI_API_KEY,
      search: !!process.env.GEMINI_API_KEY,
      newsapi: !!process.env.NEWS_API_KEY,
      replicate: !!process.env.REPLICATE_API_TOKEN,
    },
    serverWallet: SERVER_ADDRESS,
    network: "stellar:testnet",
    x402: true,
    protocol: "x402",
    facilitator: FACILITATOR_URL,
  });
});

// --- Build unsigned transaction (for Freighter signing) ---
app.post("/api/transaction/build", async (req, res) => {
  const { senderPublic, receiverPublic, amount, memo } = req.body;
  if (!senderPublic || !receiverPublic || !amount) {
    return res.status(400).json({ error: "senderPublic, receiverPublic, and amount are required" });
  }
  try {
    const xdr = await buildUnsignedPayment(senderPublic, receiverPublic, amount, memo || "");
    res.json({ xdr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Submit signed transaction (for Freighter path) ---
app.post("/api/transaction/submit", async (req, res) => {
  const { signedXdr } = req.body;
  if (!signedXdr) {
    return res.status(400).json({ error: "signedXdr is required" });
  }
  try {
    const result = await submitSignedTransaction(signedXdr);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Main agent endpoint ---
app.post("/api/research", async (req, res) => {
  const { query, budget = 0.10, agentWalletKeys, agentType = "research" } = req.body;
  if (!query) {
    return res.status(400).json({ error: "Query is required" });
  }

  let agentWallet;

  if (agentWalletKeys) {
    agentWallet = agentWalletKeys;
  } else {
    agentWallet = createWallet();
    try {
      await fundWallet(agentWallet.publicKey);
    } catch (err) {
      return res
        .status(500)
        .json({ error: "Failed to create agent wallet: " + err.message });
    }
  }

  // SSE stream
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent({
    type: "wallet",
    message: "Agent wallet ready for x402 payments",
    agentWallet: {
      publicKey: agentWallet.publicKey,
      explorerUrl: `https://stellar.expert/explorer/testnet/account/${agentWallet.publicKey}`,
    },
    serverWallet: {
      publicKey: SERVER_ADDRESS,
      explorerUrl: `https://stellar.expert/explorer/testnet/account/${SERVER_ADDRESS}`,
    },
    protocol: "x402",
  });

  // Derive base URL from request — works on Vercel, localhost, etc.
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const baseUrl = `${protocol}://${host}`;

  try {
    const result = await runAgent(
      query,
      budget,
      agentWallet,
      SERVER_ADDRESS,
      sendEvent,
      baseUrl,
      agentType
    );

    sendEvent({
      type: "complete",
      report: result.report,
      transactionLog: result.transactionLog,
      totalSpent: result.totalSpent,
      remainingBudget: result.remainingBudget,
      agentWallet: agentWallet.publicKey,
    });
  } catch (err) {
    sendEvent({ type: "error", message: err.message });
  }

  res.write("data: [DONE]\n\n");
  res.end();
});

// --- Server info ---
app.get("/api/info", (req, res) => {
  res.json({
    name: "StellarAgent",
    description: "AI agents with x402 micropayments on Stellar",
    serverWallet: SERVER_ADDRESS,
    horizonUrl: HORIZON_URL,
    network: "stellar:testnet",
    protocol: "x402",
    facilitator: FACILITATOR_URL,
  });
});

// --- Start ---
const PORT = process.env.PORT || 3000;

async function start() {
  console.log(`Server wallet: ${SERVER_ADDRESS}`);

  await setupX402();
  console.log("x402 payment middleware initialized");

  app.listen(PORT, () => {
    console.log(`StellarAgent server running on http://localhost:${PORT}`);
    console.log(`x402 facilitator: ${FACILITATOR_URL}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
