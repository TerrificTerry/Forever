type GenerateOptions = {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
};

export class AIConfigurationError extends Error {}

export const aiClient = {
  async generate({ systemPrompt, userPrompt, temperature = 0.3, maxTokens = 1200 }: GenerateOptions) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new AIConfigurationError("OpenAI is not configured. Add OPENAI_API_KEY to .env and restart the app.");
    const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
      }),
      cache: "no-store",
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`AI provider returned ${response.status}: ${detail.slice(0, 240)}`);
    }
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("AI provider returned an empty response.");
    return content;
  },
};

const evidenceRule = "Use only the supplied personal records. Never invent context. Clearly separate observed evidence, interpretation, and suggestions. Say when evidence is insufficient.";

export async function commentDiaryEntry(entry: { title: string; body: string; mood?: string | null; date: Date }) {
  return aiClient.generate({
    systemPrompt: `You are a thoughtful private journal companion. ${evidenceRule} Be warm, specific, and concise. Do not diagnose.`,
    userPrompt: `Comment on this diary entry with: what stands out, a possible pattern, one blind spot, and one useful question.\n\n${JSON.stringify(entry)}`,
  });
}

export async function summarizeDiaryEntry(entry: { title: string; body: string; mood?: string | null; location?: string | null; people?: string[]; date: Date }) {
  return aiClient.generate({
    systemPrompt: `You summarize one private diary entry. ${evidenceRule} Preserve concrete details and the writer's uncertainty. Be concise and do not evaluate or advise.`,
    userPrompt: `Summarize this entry under three short headings: What happened, Inner state, Details worth remembering.\n\n${JSON.stringify(entry)}`,
    maxTokens: 700,
  });
}

export async function summarizeDiaryRange(entries: unknown[], style: string) {
  return aiClient.generate({
    systemPrompt: `You summarize a private diary. ${evidenceRule} Preserve concrete details worth remembering.`,
    userPrompt: `Summary style: ${style}. Cover what happened, emotional patterns, repeated concerns, key decisions, relationship changes, blind spots, memorable details, and future reminders.\n\nEntries:\n${JSON.stringify(entries)}`,
    maxTokens: 1800,
  });
}

export async function followUpQuestion(question: unknown) {
  return aiClient.generate({
    systemPrompt: `You ask one incisive follow-up to deepen self-reflection. ${evidenceRule}`,
    userPrompt: `Read the question and answer. Return one follow-up question only.\n\n${JSON.stringify(question)}`,
    maxTokens: 180,
  });
}

export async function summarizeQuestion(question: unknown) {
  return aiClient.generate({
    systemPrompt: `You distill personal reflection without flattening ambiguity. ${evidenceRule}`,
    userPrompt: `Summarize the core belief, tension, evidence, and next question in this response:\n\n${JSON.stringify(question)}`,
    maxTokens: 600,
  });
}

export async function evaluateLeetCodeReflection(record: unknown) {
  return aiClient.generate({
    systemPrompt: `You are a rigorous but encouraging coding interview coach. ${evidenceRule} Evaluate only the stored prompt, topics, solutions, reflections, and notes. Focus on correctness, pattern recognition, complexity, edge cases, and what to practice next.`,
    userPrompt: `Evaluate this LeetCode reflection. Return concise sections: Overall verdict, Correctness risks, Complexity check, Pattern lesson, Edge cases, Next drill.\n\n${JSON.stringify(record)}`,
    maxTokens: 1200,
  });
}

export async function evaluateInterviewPractice(record: unknown) {
  return aiClient.generate({
    systemPrompt: `You are a practical interview coach. ${evidenceRule} Evaluate the supplied question, topics, answers, and reflection. Be specific about clarity, structure, tradeoffs, missing evidence, and next rehearsal steps.`,
    userPrompt: `Evaluate this interview practice record. Return concise sections: Strong points, Weak points, Missing follow-ups, Better answer structure, Next rehearsal.\n\n${JSON.stringify(record)}`,
    maxTokens: 1200,
  });
}

export async function evaluateStockDecision(record: unknown) {
  const raw = await aiClient.generate({
    systemPrompt: `You review an investment decision journal, not give financial advice. ${evidenceRule} Return valid JSON only. Rating must be GREEN, YELLOW, ORANGE, RED, or BLUE.`,
    userPrompt: `Evaluate reasoning quality and risk control. GREEN=strong logic/control; YELLOW=reasonable/incomplete; ORANGE=emotional/timing risk; RED=poor logic/high risk; BLUE=small learning position. Return {"rating":"YELLOW","shortConclusion":"","reasonablePoints":"","risks":"","emotionalRisk":"","watchNext":"","reflectionQuestion":""}.\n\nRecord:\n${JSON.stringify(record)}`,
    maxTokens: 900,
  });
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;
  const ratings = ["GREEN", "YELLOW", "ORANGE", "RED", "BLUE"];
  if (!ratings.includes(String(parsed.rating))) throw new Error("AI returned an invalid stock rating.");
  for (const key of ["shortConclusion", "reasonablePoints", "risks", "emotionalRisk", "watchNext", "reflectionQuestion"]) {
    if (typeof parsed[key] !== "string") throw new Error("AI returned an incomplete stock evaluation.");
  }
  return parsed as { rating: "GREEN" | "YELLOW" | "ORANGE" | "RED" | "BLUE"; shortConclusion: string; reasonablePoints: string; risks: string; emotionalRisk: string; watchNext: string; reflectionQuestion: string };
}

export async function summarizeGameStyle(records: unknown[]) {
  return aiClient.generate({
    systemPrompt: `You are a direct but constructive game review coach. ${evidenceRule}`,
    userPrompt: `Analyze current playstyle, winning patterns, losing patterns, repeated bad moves, valuable winning moves, next training focus, and end with one sentence for the next match.\n\nGames:\n${JSON.stringify(records)}`,
  });
}

export async function summarizeDataItem(item: unknown) {
  return aiClient.generate({
    systemPrompt: `You organize private source material. ${evidenceRule}`,
    userPrompt: `Return four labeled sections: Summary, Key ideas, People, Events. Keep names and claims grounded in the source.\n\n${JSON.stringify(item)}`,
  });
}

export async function summarizeNewsItems(topic: string, items: unknown[]) {
  return aiClient.generate({
    systemPrompt: `You summarize current news search results. Use only the supplied headline, source, date, URL, and snippet. Do not invent facts or imply you read the full article. Return valid JSON only.`,
    userPrompt: `Topic: ${topic}\n\nReturn exactly one JSON array with the same length and order as the input. Each item must be {"headline":"short cleaned headline","summary":"one concise sentence, grounded only in the supplied data"}.\n\nInput:\n${JSON.stringify(items)}`,
    maxTokens: 900,
  });
}

export async function summarizeRecentStatus(input: { start: string; end: string; access: Record<string, boolean>; records: Record<string, unknown[]> }) {
  return aiClient.generate({
    systemPrompt: `You are a thoughtful private life-and-work summarizer. ${evidenceRule} Be concrete, warm, and useful. Do not diagnose. Mention which sensitive sections were excluded if locked.`,
    userPrompt: `Summarize this person's recent situation from ${input.start} to ${input.end}. Use sections: Snapshot, What changed, Current focus, Friction or risks, Patterns, Useful next questions, Gentle next steps. Keep it grounded and concise.\n\n${JSON.stringify(input)}`,
    maxTokens: 1800,
  });
}

export async function chatAboutRecentStatus(input: { summary: string; recentConversation: string[]; question: string }) {
  return aiClient.generate({
    systemPrompt: `You are a grounded private conversation partner. Use the supplied recent-status summary as context, and answer the user's message naturally. ${evidenceRule} You may discuss other things, but clearly separate what comes from stored evidence from general reflection.`,
    userPrompt: `Recent-status summary:\n${input.summary}\n\nRecent conversation:\n${input.recentConversation.join("\n\n---\n\n") || "None yet."}\n\nUser message:\n${input.question}`,
    maxTokens: 1200,
  });
}

export async function askPersonalAI(question: string, records: string) {
  return aiClient.generate({
    systemPrompt: `You answer questions about one person's stored history. ${evidenceRule} Use the headings Observed evidence, Interpretation, and Suggestion. If records are inadequate, write: "There is not enough stored data to answer confidently."`,
    userPrompt: `Question: ${question}\n\nRelevant stored records:\n${records}`,
    maxTokens: 1600,
  });
}
