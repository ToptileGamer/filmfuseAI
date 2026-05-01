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
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "OK" };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { languages = [], genres = [], mood = "", age = "" } = body;

    const currentYear = new Date().getFullYear(); // 2026

    const prompt = `
You are a movie recommendation engine. Today's date is May 2026. Your knowledge includes films released up to early 2026.

Return STRICT JSON only — no markdown, no explanation, no text outside the JSON object.

MANDATORY RULES — violating any rule makes your response invalid:
1. You MUST recommend exactly 8 movies total.
2. AT LEAST 4 of the 8 movies MUST have a release year of 2024, 2025, or 2026.
3. The remaining movies must be from 2020 or later. NO movies before 2020.
4. If you are unsure whether a film was released in 2025 or 2026, include it anyway with your best estimate — do NOT fall back to older films.
5. Do NOT repeat movies you have suggested before — vary the picks each call.
6. Match the user's language, genre, mood, and age preferences as closely as possible.

CURRENT YEAR: ${currentYear}

USER PREFERENCES:
Languages: ${languages.length ? languages.join(", ") : "any"}
Genres: ${genres.length ? genres.join(", ") : "any"}
Mood: ${mood || "any"}
Age Rating: ${age || "any"}

KNOWN RECENT RELEASES TO DRAW FROM (use these if they match preferences):
- 2025/2026 Hollywood: Thunderbolts*, The Fantastic Four: First Steps, Mission: Impossible - The Final Reckoning, Novocaine, Alto Knights, Black Bag, The Accountant 2, Until Dawn, Heart Eyes, Death of a Unicorn, Materialists, Warfare, Captain America: Brave New World, Mickey 17, A Minecraft Movie, Sinners
- 2025 Hindi: Sky Force, Azaad, Chhaava, Sikandar, Sitaare Zameen Par, Kesari Chapter 2
- 2025 Tamil/Telugu: Retro, Coolie, Dragon, Deva, Pushpa 2 The Rule
- 2025 Malayalam: L2: Empuraan, Marco, Identity
- 2025 Korean: Harbin, You Made Me, Neowahan
- 2024 highlights: Dune Part Two, Inside Out 2, Alien: Romulus, Deadpool & Wolverine, Twisters, Kingdom of the Planet of the Apes, Premalu, Manjummel Boys, Stree 2, Singham Again, Kalki 2898 AD, Devara, Vettaiyan, Meiyazhagan

Return this exact JSON format:
{
  "movies": [
    {
      "title": "",
      "year": 2025,
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
      temperature: 0.85,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a movie recommendation engine with knowledge up to early 2026. You ONLY return valid JSON. You specialise in recommending recent films from 2020 to 2026, with a strong preference for 2024, 2025 and 2026 releases. Never return films older than 2020.",
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

    // Post-filter: silently drop anything before 2020 so old movies never reach the UI
    if (Array.isArray(json.movies)) {
      json.movies = json.movies.filter((m) => !m.year || m.year >= 2020);
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