import axios from "axios";

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

export async function getMarketData(query) {
  const searchResp = await axios.get(`${COINGECKO_BASE}/search`, {
    params: { query },
  });

  const coins = searchResp.data.coins || [];
  if (coins.length === 0) {
    return { query, found: false, message: "No matching coins found" };
  }

  const coinId = coins[0].id;

  const coinResp = await axios.get(`${COINGECKO_BASE}/coins/${coinId}`, {
    params: {
      localization: false,
      tickers: false,
      community_data: false,
      developer_data: false,
    },
  });

  const coin = coinResp.data;
  return {
    query,
    found: true,
    data: {
      name: coin.name,
      symbol: coin.symbol,
      price_usd: coin.market_data?.current_price?.usd,
      market_cap_usd: coin.market_data?.market_cap?.usd,
      price_change_24h: coin.market_data?.price_change_percentage_24h,
      price_change_7d: coin.market_data?.price_change_percentage_7d,
      total_volume_usd: coin.market_data?.total_volume?.usd,
      description: coin.description?.en?.substring(0, 300) || "",
    },
  };
}
