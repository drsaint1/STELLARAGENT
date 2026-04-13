# StellarAgent: Pay-per-Query AI Research Agent

An autonomous AI research agent that pays for premium data sources via Stellar testnet micropayments. Built for **Stellar Hacks: Agents** hackathon.

## How It Works

```
User → Web UI → Agent (Gemini 2.5 Flash + tool calling)
                  ↓
          Decides which paid APIs to call
                  ↓
          For each call:
            1. Agent wallet sends XLM payment on Stellar testnet
            2. Server verifies payment on-chain
            3. Server calls real API (Brave/NewsAPI/CoinGecko)
            4. Returns data to agent
                  ↓
          Agent synthesizes research report
                  ↓
User ← Report + transaction log + Stellar explorer links
```

The agent receives a research question, autonomously decides which paid APIs to query, makes **real Stellar payments** for each call, and synthesizes a comprehensive research report.

Each API call follows an **x402-inspired payment flow**:
- The agent sends XLM on Stellar testnet before each API call
- The server verifies the on-chain payment
- Only then does the server call the external API and return data

## Available Data Sources

| Service | Cost | Source |
|---------|------|--------|
| Web Search | 2 XLM | Brave Search API |
| News | 1 XLM | NewsAPI.org |
| Market Data | 0.5 XLM | CoinGecko |

## Tech Stack

- **Runtime:** Node.js
- **Server:** Express.js
- **AI:** Google Gemini 2.5 Flash (function calling)
- **Blockchain:** Stellar testnet via `@stellar/stellar-sdk`
- **Frontend:** Vanilla HTML/CSS/JS

## Setup

### 1. Get API Keys (all free)

- **Gemini:** https://aistudio.google.com/apikey
- **Brave Search:** https://brave.com/search/api/
- **NewsAPI:** https://newsapi.org/register

### 2. Configure

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 3. Install & Run

```bash
npm install
npm start
```

### 4. Use

Open http://localhost:3000 in your browser.

1. Enter a research question (e.g., "State of AI in healthcare 2026")
2. Set your XLM budget with the slider
3. Click **Research** and watch the agent work
4. Each API call triggers a real Stellar testnet payment
5. Verify transactions on [Stellar Expert](https://stellar.expert/explorer/testnet)

## Project Structure

```
src/
├── server.js           # Express server + paid endpoints
├── agent.js            # Gemini agent with tool calling loop
├── stellar.js          # Wallet creation, payments, verification
├── services/
│   ├── search.js       # Brave Search API wrapper
│   ├── news.js         # NewsAPI wrapper
│   └── market.js       # CoinGecko wrapper
└── public/
    └── index.html      # Single-page web UI
```

## Cost to Build

**$0** - All services use free tiers and Stellar testnet (free XLM from friendbot).

## License

MIT
