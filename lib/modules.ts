export type FieldType = "text" | "textarea" | "date" | "number" | "select" | "checkbox" | "file" | "tags";

export type ModuleField = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  help?: string;
  wide?: boolean;
  newOnly?: boolean;
  accept?: string;
};

export type ModuleConfig = {
  slug: string;
  singular: string;
  title: string;
  eyebrow: string;
  description: string;
  newLabel: string;
  secondary?: "diary" | "private";
  aiLabel?: string;
  fastPath?: string;
  fields: ModuleField[];
};

const tags: ModuleField = { name: "tags", label: "Tags", type: "tags", placeholder: "reflection, growth, work", wide: true };

export const modules: Record<string, ModuleConfig> = {
  tasks: {
    slug: "tasks", singular: "Task", title: "Tasks", eyebrow: "What comes next",
    description: "Keep the next useful actions visible without letting them take over the rest of your archive.",
    newLabel: "New task",
    fields: [
      { name: "title", label: "Task", type: "text", required: true, placeholder: "What needs to be done?", wide: true },
      { name: "listName", label: "List", type: "text", placeholder: "Personal, work, errands..." },
      { name: "dueDate", label: "Due date", type: "date" },
      { name: "priority", label: "Priority", type: "select", options: ["1", "2", "3", "4", "5"], help: "5 is the highest priority." },
      { name: "status", label: "Status", type: "select", required: true, options: ["TODO", "IN_PROGRESS", "DONE"] },
      tags,
      { name: "details", label: "Notes", type: "textarea", placeholder: "Context, links, or the next concrete step.", wide: true },
    ],
  },
  diary: {
    slug: "diary", singular: "Diary entry", title: "Diary", eyebrow: "Private reflection",
    description: "A quiet record of events, people, feelings, and the details your future self may want back.",
    newLabel: "New diary", secondary: "diary", aiLabel: "AI evaluate",
    fields: [
      { name: "title", label: "Title", type: "text", required: true, placeholder: "What should this day be called?", wide: true },
      { name: "date", label: "Date", type: "date", required: true },
      { name: "mood", label: "Mood", type: "text", placeholder: "Calm, restless, hopeful…" },
      { name: "location", label: "Location", type: "text" },
      { name: "people", label: "People", type: "text", placeholder: "Comma separated" },
      { name: "importance", label: "Importance", type: "select", options: ["1", "2", "3", "4", "5"] },
      tags,
      { name: "body", label: "Reflection", type: "textarea", required: true, placeholder: "Write without polishing. Markdown is welcome.", wide: true },
    ],
  },
  questions: {
    slug: "questions", singular: "Question", title: "Daily questions", eyebrow: "A better prompt",
    description: "Questions you choose for yourself, with enough room to think past the first answer.",
    newLabel: "New question", aiLabel: "AI follow-up",
    fields: [
      { name: "question", label: "Question", type: "textarea", required: true, placeholder: "What deserves an honest answer today?", wide: true },
      { name: "date", label: "Date", type: "date", required: true },
      { name: "source", label: "Source", type: "select", options: ["SELF", "AI"] },
      { name: "category", label: "Category", type: "text", placeholder: "Relationships, career, values…" },
      { name: "importance", label: "Importance", type: "select", options: ["1", "2", "3", "4", "5"] },
      tags,
      { name: "answer", label: "Your answer", type: "textarea", placeholder: "Start with what feels true, not impressive.", wide: true },
      { name: "secondAnswer", label: "Second answer", type: "textarea", placeholder: "Optional response to the AI follow-up", wide: true },
    ],
  },
  appearance: {
    slug: "appearance", singular: "Appearance record", title: "Appearance", eyebrow: "Change over time",
    description: "A low-pressure visual timeline for noticing changes in style, context, and presentation.",
    newLabel: "Add photo", aiLabel: "AI observation",
    fields: [
      { name: "photo", label: "Photo", type: "file", required: true, newOnly: true, accept: "image/jpeg,image/png,image/webp", wide: true, help: "JPEG, PNG, or WebP." },
      { name: "date", label: "Date", type: "date", required: true },
      { name: "weight", label: "Weight", type: "number", placeholder: "Optional" },
      { name: "hairstyle", label: "Hairstyle", type: "text" },
      { name: "outfit", label: "Outfit", type: "text" },
      { name: "context", label: "Context", type: "text", placeholder: "Work, gym, date…" },
      tags,
      { name: "note", label: "Notes", type: "textarea", placeholder: "What do you want to remember about this photo?", wide: true },
    ],
  },
  stocks: {
    slug: "stocks", singular: "Stock record", title: "Stock records", eyebrow: "Decision journal",
    description: "Capture the thesis before the outcome changes the story you tell yourself.",
    newLabel: "New stock record", aiLabel: "AI evaluate",
    fields: [
      { name: "ticker", label: "Ticker", type: "text", required: true, placeholder: "NVDA" },
      { name: "companyName", label: "Company", type: "text" },
      { name: "date", label: "Decision date", type: "date", required: true },
      { name: "action", label: "Action", type: "select", required: true, options: ["BUY", "SELL", "WATCH", "ADD", "REDUCE"] },
      { name: "price", label: "Price", type: "number" },
      { name: "quantity", label: "Quantity", type: "number" },
      { name: "amount", label: "Amount", type: "number" },
      { name: "confidence", label: "Confidence (1–100)", type: "number" },
      { name: "reason", label: "Core reason", type: "textarea", required: true, placeholder: "What must be true for this decision to work?", wide: true },
      { name: "companyUnderstanding", label: "Company understanding", type: "textarea", wide: true },
      { name: "industryUnderstanding", label: "Industry understanding", type: "textarea", wide: true },
      { name: "riskFactors", label: "Risk factors", type: "textarea", wide: true },
      { name: "marketContext", label: "Market context", type: "textarea", wide: true },
      { name: "predictionEnabled", label: "Add prediction", type: "checkbox", help: "Prediction is optional." },
      { name: "predictionOneWeek", label: "1 week", type: "select", options: ["UNKNOWN", "UP", "DOWN", "FLAT"] },
      { name: "predictionOneMonth", label: "1 month", type: "select", options: ["UNKNOWN", "UP", "DOWN", "FLAT"] },
      { name: "predictionThreeMonths", label: "3 months", type: "select", options: ["UNKNOWN", "UP", "DOWN", "FLAT"] },
      { name: "predictionReason", label: "Prediction reasoning", type: "textarea", wide: true },
      { name: "resultReflection", label: "Later reflection", type: "textarea", wide: true },
    ],
  },
  "stock-tips": {
    slug: "stock-tips", singular: "Stock tip", title: "Stock tips", eyebrow: "Working principles",
    description: "Small lessons, market mechanics, and rules you want available at decision time.",
    newLabel: "New tip",
    fields: [
      { name: "title", label: "Title", type: "text", required: true, wide: true },
      { name: "category", label: "Category", type: "select", options: ["Earnings", "Valuation", "AI Industry", "Semiconductors", "Big Tech", "Macro", "Trading Mechanics", "Emotion Control", "Risk Management", "Tools"] },
      { name: "importance", label: "Importance", type: "select", options: ["1", "2", "3", "4", "5"] },
      { name: "relatedTickers", label: "Related tickers", type: "text", placeholder: "NVDA, AMD" },
      { name: "scenario", label: "When this applies", type: "textarea", wide: true },
      { name: "content", label: "The lesson", type: "textarea", required: true, wide: true },
      { name: "example", label: "Example", type: "textarea", wide: true },
      tags,
    ],
  },
  game: {
    slug: "game", singular: "Game reflection", title: "Game reflection", eyebrow: "Between matches",
    description: "Thirty seconds of honesty now can save another twenty minutes of repeating the same mistake.",
    newLabel: "Add full reflection", fastPath: "/game/quick-add",
    fields: [
      { name: "date", label: "Date", type: "date", required: true },
      { name: "gameName", label: "Game", type: "text", required: true },
      { name: "hero", label: "Hero", type: "text" },
      { name: "role", label: "Role", type: "text" },
      { name: "rank", label: "Rank", type: "text" },
      { name: "result", label: "Result", type: "select", options: ["WIN", "LOSS", "DRAW", "UNKNOWN"] },
      { name: "kills", label: "Kills", type: "number" },
      { name: "deaths", label: "Deaths", type: "number" },
      { name: "assists", label: "Assists", type: "number" },
      { name: "summary", label: "One-sentence summary", type: "textarea", wide: true },
      { name: "winningMove", label: "Winning move", type: "textarea", wide: true },
      { name: "badMove", label: "Bad move", type: "textarea", wide: true },
      { name: "deathReason", label: "Death pattern", type: "textarea", wide: true },
      { name: "myProblem", label: "My problem", type: "textarea", wide: true },
      { name: "nextReminder", label: "Reminder for next game", type: "textarea", wide: true },
      tags,
    ],
  },
  "data-feed": {
    slug: "data-feed", singular: "Data item", title: "Data feed", eyebrow: "Thinking materials",
    description: "Bring useful conversations, documents, and notes into one searchable private dataset.",
    newLabel: "Add material", secondary: "private", aiLabel: "AI extract ideas",
    fields: [
      { name: "title", label: "Title", type: "text", required: true, wide: true },
      { name: "source", label: "Source", type: "text", placeholder: "Chat, article, note…" },
      { name: "date", label: "Original date", type: "date" },
      { name: "file", label: "Upload file", type: "file", newOnly: true, accept: ".txt,.md,.json,.csv,.pdf", wide: true, help: "TXT, Markdown, JSON, CSV, or PDF. You may paste text instead." },
      { name: "rawText", label: "Paste text", type: "textarea", placeholder: "Paste the source material here…", wide: true },
      { name: "includeInAIMemory", label: "Include in My AI memory", type: "checkbox" },
      tags,
    ],
  },
};

export function getModule(slug: string) {
  return modules[slug] ?? null;
}

export const navigation = [
  ["/home", "Home"], ["/tasks", "Tasks"], ["/diary", "Diary"], ["/questions", "Daily Questions"],
  ["/appearance", "Appearance"], ["/stocks", "Stocks"], ["/stock-tips", "Stock Tips"],
  ["/game", "Game Reflection"], ["/data-feed", "Data Feed"], ["/my-ai", "My AI"],
  ["/settings", "Settings"],
] as const;
