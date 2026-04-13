import axios from "axios";

export async function braveSearch(query) {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) throw new Error("BRAVE_API_KEY not set");

  const resp = await axios.get("https://api.search.brave.com/res/v1/web/search", {
    headers: { "X-Subscription-Token": apiKey },
    params: { q: query, count: 5 },
  });

  const results = (resp.data.web?.results || []).slice(0, 5).map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.description || "",
  }));

  return { query, results };
}
