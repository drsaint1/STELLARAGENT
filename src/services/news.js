import axios from "axios";

export async function getNews(topic) {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) throw new Error("NEWS_API_KEY not set");

  const resp = await axios.get("https://newsapi.org/v2/everything", {
    params: {
      q: topic,
      sortBy: "publishedAt",
      pageSize: 5,
      language: "en",
      apiKey,
    },
  });

  const articles = (resp.data.articles || []).slice(0, 5).map((a) => ({
    title: a.title,
    source: a.source?.name || "",
    description: a.description || "",
    url: a.url,
    publishedAt: a.publishedAt,
  }));

  return { topic, articles };
}
