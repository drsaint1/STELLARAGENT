import { GoogleGenAI } from "@google/genai";
import { ExactStellarScheme } from "@x402/stellar/exact/client";
import { createEd25519Signer } from "@x402/stellar";
import { x402Client, x402HTTPClient } from "@x402/core/client";

// --- Agent Configs ---
const AGENT_CONFIGS = {
  research: {
    tools: [
      {
        functionDeclarations: [
          {
            name: "web_search",
            description:
              "Search the web for information on any topic. Costs $0.01 USDC per query. Use for general research, finding recent info, or exploring a topic broadly.",
            parameters: {
              type: "object",
              properties: {
                query: { type: "string", description: "The search query" },
              },
              required: ["query"],
            },
          },
          {
            name: "get_news",
            description:
              "Get recent news articles on a topic. Costs $0.005 USDC per query. Use for current events, recent developments, or trending stories.",
            parameters: {
              type: "object",
              properties: {
                topic: {
                  type: "string",
                  description: "The news topic to search for",
                },
              },
              required: ["topic"],
            },
          },
          {
            name: "get_market_data",
            description:
              "Get financial/crypto market data for a coin or token. Costs $0.002 USDC per query. Use for price data, market caps, and crypto information.",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description:
                    "The cryptocurrency or token name to look up (e.g. 'bitcoin', 'ethereum', 'stellar')",
                },
              },
              required: ["query"],
            },
          },
        ],
      },
    ],
    systemPrompt: (budget) =>
      `You are StellarAgent, an autonomous AI research agent using the x402 payment protocol with USDC stablecoin on Stellar testnet.

CRITICAL: Your budget is $${budget} USDC. All costs are in USDC (NOT XLM). You have MORE than enough budget to call tools. ALWAYS call tools to research the user's query - never refuse due to budget concerns.

Tool costs (all in USDC, NOT XLM):
- web_search: $0.01 USDC per query - general web search
- get_news: $0.005 USDC per query - recent news articles
- get_market_data: $0.002 USDC per query - crypto/financial data

Instructions:
1. Analyze the research question carefully
2. ALWAYS call at least one tool to research the query - do NOT just respond with text
3. Make targeted, specific queries to get the most value
4. After gathering enough data, synthesize a comprehensive research report
5. Include citations/sources in your report

Budget: $${budget} USDC. Each tool call costs at most $0.01 USDC, so you can make at least ${Math.floor(budget / 0.01)} calls.`,
  },

  code: {
    tools: [
      {
        functionDeclarations: [
          {
            name: "generate_code",
            description:
              "Generate code in any programming language. Costs $0.01 USDC. Use when the user wants you to write new code, functions, or programs.",
            parameters: {
              type: "object",
              properties: {
                language: {
                  type: "string",
                  description:
                    "The programming language (e.g. python, javascript, rust)",
                },
                description: {
                  type: "string",
                  description: "What the code should do",
                },
              },
              required: ["language", "description"],
            },
          },
          {
            name: "explain_code",
            description:
              "Explain existing code and suggest improvements. Costs $0.005 USDC. Use when analyzing or reviewing code.",
            parameters: {
              type: "object",
              properties: {
                code: {
                  type: "string",
                  description: "The code to explain",
                },
                language: {
                  type: "string",
                  description: "The programming language of the code",
                },
              },
              required: ["code"],
            },
          },
          {
            name: "web_search",
            description:
              "Search the web for programming docs, examples, or references. Costs $0.01 USDC per query.",
            parameters: {
              type: "object",
              properties: {
                query: { type: "string", description: "The search query" },
              },
              required: ["query"],
            },
          },
        ],
      },
    ],
    systemPrompt: (budget) =>
      `You are StellarAgent, an autonomous AI coding assistant using the x402 payment protocol with USDC stablecoin on Stellar testnet.

CRITICAL: Your budget is $${budget} USDC. All costs are in USDC (NOT XLM). You have MORE than enough budget to call any tool. ALWAYS call tools when the user asks you to do something - never refuse due to budget concerns.

Tool costs (all in USDC, NOT XLM):
- generate_code: $0.01 USDC - generate code in any language
- explain_code: $0.005 USDC - explain code and suggest improvements
- web_search: $0.01 USDC - search for docs, examples, or references

Instructions:
1. Understand the coding request carefully
2. ALWAYS call generate_code when asked to write code - do NOT just respond with text
3. Use explain_code if the user provides code to review
4. Use web_search to look up docs or examples when needed
5. Present the final code with clear explanations

Budget: $${budget} USDC. Each tool call costs at most $0.01 USDC, so you can make at least ${Math.floor(budget / 0.01)} calls.`,
  },

  image: {
    tools: [
      {
        functionDeclarations: [
          {
            name: "generate_image",
            description:
              "Generate an image from a text description. Costs $0.02 USDC. Use to create new images, artwork, illustrations, etc.",
            parameters: {
              type: "object",
              properties: {
                prompt: {
                  type: "string",
                  description:
                    "Detailed description of the image to generate",
                },
                style: {
                  type: "string",
                  description:
                    "Optional style (e.g. photorealistic, cartoon, oil painting, pixel art)",
                },
              },
              required: ["prompt"],
            },
          },
          {
            name: "edit_image",
            description:
              "Edit an existing image with instructions. Costs $0.015 USDC. Use to modify, transform, or enhance an existing image.",
            parameters: {
              type: "object",
              properties: {
                imageUrl: {
                  type: "string",
                  description: "URL of the image to edit",
                },
                instructions: {
                  type: "string",
                  description: "What changes to make to the image",
                },
              },
              required: ["imageUrl", "instructions"],
            },
          },
          {
            name: "web_search",
            description:
              "Search the web for image references or inspiration. Costs $0.01 USDC per query.",
            parameters: {
              type: "object",
              properties: {
                query: { type: "string", description: "The search query" },
              },
              required: ["query"],
            },
          },
        ],
      },
    ],
    systemPrompt: (budget) =>
      `You are StellarAgent, an autonomous AI image creation assistant using the x402 payment protocol with USDC stablecoin on Stellar testnet.

CRITICAL: Your budget is $${budget} USDC. All costs are in USDC (NOT XLM). You have MORE than enough budget to call tools. ALWAYS call tools when the user asks for an image - never refuse due to budget concerns.

Tool costs (all in USDC, NOT XLM):
- generate_image: $0.02 USDC - generate an image from a text prompt
- edit_image: $0.015 USDC - edit/modify an existing image
- web_search: $0.01 USDC - search for references or inspiration

Instructions:
1. Understand the image request carefully
2. ALWAYS call generate_image when asked to create an image - do NOT just respond with text
3. Craft a detailed, descriptive prompt for the best results
4. Use web_search if you need reference or inspiration first
5. Present the results with the image and description

Budget: $${budget} USDC. Each tool call costs at most $0.02 USDC, so you can make at least ${Math.floor(budget / 0.02)} calls.`,
  },
};

// --- Tool endpoint routing ---
const TOOL_ENDPOINTS = {
  web_search: {
    endpoint: "/api/search",
    bodyFn: (args) => ({ query: args.query }),
  },
  get_news: {
    endpoint: "/api/news",
    bodyFn: (args) => ({ topic: args.topic }),
  },
  get_market_data: {
    endpoint: "/api/market",
    bodyFn: (args) => ({ query: args.query }),
  },
  generate_code: {
    endpoint: "/api/code/generate",
    bodyFn: (args) => ({ language: args.language, description: args.description }),
  },
  explain_code: {
    endpoint: "/api/code/explain",
    bodyFn: (args) => ({ code: args.code, language: args.language }),
  },
  generate_image: {
    endpoint: "/api/image/generate",
    bodyFn: (args) => ({ prompt: args.prompt, style: args.style }),
  },
  edit_image: {
    endpoint: "/api/image/edit",
    bodyFn: (args) => ({ imageUrl: args.imageUrl, instructions: args.instructions }),
  },
};

/**
 * Make an x402-enabled API call:
 * 1. POST to endpoint → expect 402 with PAYMENT-REQUIRED header
 * 2. Create payment payload using ExactStellarScheme
 * 3. Retry with PAYMENT-SIGNATURE header → get 200 + data
 */
async function x402ApiCall(endpoint, body, httpClient, onEvent) {
  const baseUrl = `http://localhost:${process.env.PORT || 3000}`;
  const url = `${baseUrl}${endpoint}`;
  const { default: axios } = await import("axios");

  // Step 1: Initial request → expect 402
  let initialResp;
  try {
    initialResp = await axios.post(url, body, {
      validateStatus: (status) => true, // Don't throw on 402
    });
  } catch (err) {
    throw new Error(`Request to ${endpoint} failed: ${err.message}`);
  }

  // If we got 200 directly (no payment needed), return
  if (initialResp.status === 200) {
    return { data: initialResp.data, cost: 0 };
  }

  // Step 2: Parse 402 response
  if (initialResp.status !== 402) {
    throw new Error(`Unexpected status ${initialResp.status} from ${endpoint}: ${JSON.stringify(initialResp.data)}`);
  }

  onEvent({
    type: "x402_payment_required",
    message: `Received 402 Payment Required from ${endpoint}`,
  });

  // Decode the payment requirements from response headers
  const paymentRequired = httpClient.getPaymentRequiredResponse(
    (name) => initialResp.headers[name.toLowerCase()],
    initialResp.data
  );

  // Extract cost from payment requirements
  let cost = 0;
  const reqs = paymentRequired?.paymentRequirements || [];
  if (reqs.length > 0) {
    const req = reqs[0];
    cost = parseFloat(req.maxAmountRequired || req.amount || "0") / 1e7; // Convert from stroops
  }

  // Step 3: Create payment payload and encode as headers
  const paymentPayload = await httpClient.createPaymentPayload(paymentRequired);
  const paymentHeaders = httpClient.encodePaymentSignatureHeader(paymentPayload);

  onEvent({
    type: "x402_payment_signed",
    message: `Payment signed for ${endpoint} ($${cost.toFixed(4)} USDC)`,
    cost,
  });

  // Step 4: Retry with payment signature headers
  const paidResp = await axios.post(url, body, {
    headers: paymentHeaders,
    validateStatus: (status) => true,
  });

  if (paidResp.status !== 200) {
    throw new Error(`Paid request to ${endpoint} failed with status ${paidResp.status}: ${JSON.stringify(paidResp.data)}`);
  }

  // Check for settlement info from response headers
  let txHash = null;
  try {
    const settleResponse = httpClient.getPaymentSettleResponse(
      (name) => paidResp.headers[name.toLowerCase()]
    );
    txHash = settleResponse?.txHash || settleResponse?.transaction?.hash || null;
  } catch {
    // Settlement header parsing is best-effort
  }

  onEvent({
    type: "x402_settled",
    message: `Payment settled on Stellar${txHash ? ` (TX: ${txHash.substring(0, 12)}...)` : ""}`,
    txHash,
  });

  return { data: paidResp.data, cost, txHash };
}

export async function runAgent(
  query,
  budget,
  agentWallet,
  serverPublicKey,
  onEvent,
  agentType = "research"
) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const config = AGENT_CONFIGS[agentType] || AGENT_CONFIGS.research;

  const transactionLog = [];
  let spent = 0;

  // Set up x402 client with agent's Stellar key
  const signer = createEd25519Signer(agentWallet.secretKey, "stellar:testnet");
  const stellarScheme = new ExactStellarScheme(signer);
  const client = x402Client.fromConfig({
    schemes: [{ network: "stellar:testnet", client: stellarScheme }],
  });
  const httpClient = new x402HTTPClient(client);

  const systemPrompt = config.systemPrompt(budget);

  const contents = [{ role: "user", parts: [{ text: query }] }];

  onEvent({
    type: "thinking",
    message: `Agent (${agentType}) is analyzing your request via x402 protocol...`,
  });

  const MAX_TURNS = 10;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
          tools: config.tools,
          systemInstruction:
            systemPrompt +
            `\n\nBudget spent so far: $${spent.toFixed(4)} USDC. Remaining: $${(budget - spent).toFixed(4)} USDC.`,
          temperature: 0.7,
        },
      });
    } catch (err) {
      onEvent({ type: "error", message: `Gemini API error: ${err.message}` });
      break;
    }

    const candidate = response.candidates?.[0];
    if (!candidate) {
      onEvent({ type: "error", message: "No response from Gemini" });
      break;
    }

    const parts = candidate.content?.parts || [];
    const functionCalls = parts.filter((p) => p.functionCall);
    const textParts = parts.filter((p) => p.text);

    // If model returned text (final answer), we're done
    if (functionCalls.length === 0 && textParts.length > 0) {
      const report = textParts.map((p) => p.text).join("\n");
      onEvent({ type: "report", message: report });
      return {
        report,
        transactionLog,
        totalSpent: spent,
        remainingBudget: budget - spent,
      };
    }

    // Add model's response to conversation
    contents.push({ role: "model", parts });

    // Process function calls
    const functionResponses = [];

    for (const part of functionCalls) {
      const fc = part.functionCall;
      const route = TOOL_ENDPOINTS[fc.name];

      if (!route) {
        functionResponses.push({
          functionResponse: {
            name: fc.name,
            response: { error: `Unknown tool: ${fc.name}` },
          },
        });
        continue;
      }

      onEvent({
        type: "api_call",
        message: `Calling ${fc.name} via x402 protocol...`,
        tool: fc.name,
      });

      let apiResult;
      let cost = 0;
      let txHash = null;

      try {
        const result = await x402ApiCall(
          route.endpoint,
          route.bodyFn(fc.args || {}),
          httpClient,
          onEvent
        );
        apiResult = result.data;
        cost = result.cost;
        txHash = result.txHash;
      } catch (err) {
        onEvent({
          type: "error",
          message: `x402 payment failed for ${fc.name}: ${err.message}`,
        });
        functionResponses.push({
          functionResponse: {
            name: fc.name,
            response: { error: `x402 payment failed: ${err.message}` },
          },
        });
        continue;
      }

      spent += cost;

      // Check budget after payment
      if (spent > budget) {
        onEvent({
          type: "budget",
          message: `Budget exceeded after ${fc.name} ($${spent.toFixed(4)}/$${budget} USDC)`,
        });
      }

      const logEntry = {
        tool: fc.name,
        query: fc.args?.query || fc.args?.topic || fc.args?.description || fc.args?.prompt || "",
        cost,
        txHash,
        timestamp: new Date().toISOString(),
        explorerUrl: txHash
          ? `https://stellar.expert/explorer/testnet/tx/${txHash}`
          : null,
        protocol: "x402",
      };
      transactionLog.push(logEntry);

      onEvent({
        type: "transaction",
        message: `x402 payment complete: $${cost.toFixed(4)} USDC for ${fc.name}`,
        ...logEntry,
      });

      onEvent({
        type: "data",
        message: `Received data from ${fc.name}`,
        tool: fc.name,
        result: apiResult,
      });

      functionResponses.push({
        functionResponse: {
          name: fc.name,
          response: { output: apiResult },
        },
      });
    }

    // Send function responses back to model
    contents.push({ role: "user", parts: functionResponses });

    onEvent({
      type: "thinking",
      message: `Agent is processing results... ($${spent.toFixed(4)}/$${budget} USDC spent)`,
    });
  }

  // If we exhausted turns, ask for final summary
  return {
    report:
      "The agent reached the maximum number of turns. Please try with a simpler query or higher budget.",
    transactionLog,
    totalSpent: spent,
    remainingBudget: budget - spent,
  };
}
