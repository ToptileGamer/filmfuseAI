import Groq from "groq-sdk";

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function handler() {
  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: `
Return JSON:
{
  "movies":[
    {"title":"","year":2024,"short_reason":""}
  ]
}

Rules:
- Only 2020–2025 movies
- Prefer latest
`
      }
    ]
  });

  return {
    statusCode: 200,
    body: completion.choices[0].message.content
  };
}