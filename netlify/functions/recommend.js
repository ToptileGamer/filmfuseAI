import Groq from "groq-sdk";

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export async function handler(event) {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "OK",
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    const { languages = [], genres = [], mood = "", age = "" } = body;

    const prompt = `
Return STRICT JSON only.

IMPORTANT RULES:
- Recommend ONLY movies from 1990 to 2026
- STRONGLY prefer latest movies (2020 ,2021, 2022, 2023, 2024, 2025, 2026)


USER PREFERENCES:
Languages: ${languages}
Genres: ${genres}
Mood: ${mood}
Age Rating: ${age}

Return format:
{
  "movies": [
    {
      "title": "",
      "year": 2024,
      "language": "",
      "age_rating": "",
      "genres": [],
      "short_reason": ""
    }
  ]
}
`;

    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You must ONLY return valid JSON. No text outside JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const raw = completion.choices[0].message.content;

    let json;
    try {
      json = JSON.parse(raw);
    } catch (e) {
      console.error("JSON parse error:", raw);
      throw new Error("Invalid JSON from AI");
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(json),
    };
  } catch (err) {
    console.error("Backend Error:", err);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: err.message || "AI failed to generate recommendations",
      }),
    };
  }
}