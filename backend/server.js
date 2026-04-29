import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();

const app = express();

// ----------------------
// CORS CONFIGURATION (FIXED)
// ----------------------
const allowedOrigins = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "https://filmfuse-ai.netlify.app" // ❌ removed trailing slash
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like Postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    credentials: false
  })
);

// Handle preflight requests explicitly
app.options("*", cors());

app.use(express.json());

// ----------------------
// GROQ CLIENT
// ----------------------
const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ----------------------
// HEALTH CHECK (optional but useful)
// ----------------------
app.get("/", (req, res) => {
  res.send("FilmFuseAI backend is running 🚀");
});

// ----------------------
// API ENDPOINT
// ----------------------
app.post("/api/recommend", async (req, res) => {
  try {
    const { languages, genres, mood, age } = req.body;

    const prompt = `
Return STRICT JSON. No text.

Generate 10 movie recommendations based on:

Languages: ${languages}
Genres: ${genres}
Mood: ${mood}
Age Rating: ${age}

Return JSON only:
{
 "movies": [
   {
     "title": "",
     "year": "",
     "language": "",
     "age_rating": "",
     "genres": [],
     "mood_tags": [],
     "short_reason": ""
   }
 ]
}
`;

    const result = await client.chat.completions.create({
      model: "llama-3.1-70b-versatile",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You must ALWAYS return valid JSON only." },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
    });

    const content = result.choices[0].message.content;

    let json;
    try {
      json = JSON.parse(content);
    } catch {
      console.error("Invalid JSON from Groq:", content);
      return res.status(500).json({
        error: "Invalid JSON returned from AI"
      });
    }

    res.json(json);
  } catch (error) {
    console.error("Groq API error:", error);
    res.status(500).json({
      error: "AI failed to generate valid JSON. Try again."
    });
  }
});

// ----------------------
// PORT
// ----------------------
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`FilmFuseAI backend running on port ${PORT}`);
});