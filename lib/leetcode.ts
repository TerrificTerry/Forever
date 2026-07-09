type LeetCodeTopic = { name?: string | null; slug?: string | null };
type LeetCodeListQuestion = {
  frontendQuestionId?: string | null;
  questionFrontendId?: string | null;
  title?: string | null;
  titleSlug?: string | null;
  difficulty?: string | null;
  topicTags?: LeetCodeTopic[] | null;
};
type LeetCodeQuestion = LeetCodeListQuestion & {
  questionId?: string | null;
  content?: string | null;
  translatedContent?: string | null;
};

const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql";
const LEETCODE_ALGORITHMS_URL = "https://leetcode.com/api/problems/algorithms/";

async function leetcodeGraphQL<T>(query: string, variables: Record<string, unknown>, operationName?: string) {
  const response = await fetch(LEETCODE_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Referer: "https://leetcode.com/problemset/",
      "User-Agent": "SpiritArchive/1.0",
    },
    body: JSON.stringify({ query, variables, operationName }),
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`LeetCode returned HTTP ${response.status}${text ? `: ${text.slice(0, 180)}` : ""}.`);
  const payload = JSON.parse(text) as { data?: T; errors?: Array<{ message?: string }> };
  if (payload.errors?.length) throw new Error(payload.errors.map((error) => error.message).filter(Boolean).join("; ") || "LeetCode returned a GraphQL error.");
  if (!payload.data) throw new Error("LeetCode returned an empty response.");
  return payload.data;
}

async function leetcodeJson<T>(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Referer: "https://leetcode.com/problemset/",
      "User-Agent": "SpiritArchive/1.0",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`LeetCode returned HTTP ${response.status}.`);
  return response.json() as Promise<T>;
}

function decodeHtmlEntities(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: "\"",
    apos: "'",
    nbsp: " ",
    ndash: "–",
    mdash: "—",
    hellip: "…",
  };
  return value
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
      if (entity[0] === "#") {
        const isHex = entity[1]?.toLowerCase() === "x";
        const codePoint = Number.parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);
        return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
      }
      return named[entity.toLowerCase()] ?? match;
    })
    .replace(/\u00a0/g, " ");
}

function htmlToText(html: string | null | undefined) {
  if (!html) return "";
  return decodeHtmlEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<li>/gi, "- ")
      .replace(/<pre>/gi, "\n```\n")
      .replace(/<\/pre>/gi, "\n```\n")
      .replace(/<code>/gi, "`")
      .replace(/<\/code>/gi, "`")
      .replace(/<[^>]+>/g, "")
  )
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeNumber(value: unknown) {
  return Number.parseInt(String(value || "").replace(/\D+/g, ""), 10);
}

function difficultyFromLevel(level: unknown) {
  return level === 1 ? "Easy" : level === 2 ? "Medium" : level === 3 ? "Hard" : "";
}

async function findProblemSummaryByNumber(problemNumber: number) {
  const currentListQuery = `
    query problemsetQuestionList($categorySlug: String, $skip: Int, $limit: Int, $filters: QuestionListFilterInput) {
      problemsetQuestionList: questionList(categorySlug: $categorySlug, skip: $skip, limit: $limit, filters: $filters) {
        questions: data {
          frontendQuestionId: questionFrontendId
          title
          titleSlug
          difficulty
          topicTags { name slug }
        }
      }
    }
  `;
  try {
    const listData = await leetcodeGraphQL<{ problemsetQuestionList?: { questions?: LeetCodeListQuestion[] } }>(currentListQuery, {
      categorySlug: "",
      skip: 0,
      limit: 30,
      filters: { searchKeywords: String(problemNumber) },
    }, "problemsetQuestionList");
    const questions = listData.problemsetQuestionList?.questions || [];
    const match = questions.find((question) => normalizeNumber(question.frontendQuestionId || question.questionFrontendId) === problemNumber);
    if (match?.titleSlug) return match;
  } catch {
    // LeetCode changes this GraphQL list field occasionally. Fall through to the older public REST list.
  }

  const restData = await leetcodeJson<{
    stat_status_pairs?: Array<{
      stat?: {
        frontend_question_id?: number | string | null;
        question__title?: string | null;
        question__title_slug?: string | null;
      };
      difficulty?: { level?: number | null } | null;
    }>;
  }>(LEETCODE_ALGORITHMS_URL);
  const match = restData.stat_status_pairs?.find((item) => normalizeNumber(item.stat?.frontend_question_id) === problemNumber);
  if (!match?.stat?.question__title_slug) return null;
  return {
    frontendQuestionId: String(match.stat.frontend_question_id || problemNumber),
    title: match.stat.question__title || "",
    titleSlug: match.stat.question__title_slug,
    difficulty: difficultyFromLevel(match.difficulty?.level),
    topicTags: [],
  };
}

export async function fetchLeetCodeProblemByNumber(problemNumber: number) {
  const match = await findProblemSummaryByNumber(problemNumber);
  if (!match?.titleSlug) throw new Error(`LeetCode problem #${problemNumber} was not found.`);

  const detailQuery = `
    query questionData($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionId
        questionFrontendId
        title
        titleSlug
        content
        translatedContent
        difficulty
        topicTags { name slug }
      }
    }
  `;
  const detailData = await leetcodeGraphQL<{ question?: LeetCodeQuestion | null }>(detailQuery, { titleSlug: match.titleSlug }, "questionData");
  const question = detailData.question;
  if (!question) throw new Error(`LeetCode problem #${problemNumber} details were not found.`);
  const frontendId = normalizeNumber(question.questionFrontendId || match.frontendQuestionId || match.questionFrontendId) || problemNumber;
  const titleSlug = question.titleSlug || match.titleSlug;
  return {
    problemNumber: frontendId,
    title: question.title || match.title || "",
    difficulty: question.difficulty || match.difficulty || "",
    topics: (question.topicTags || match.topicTags || []).map((topic) => topic.name).filter((name): name is string => !!name),
    sourceUrl: titleSlug ? `https://leetcode.com/problems/${titleSlug}/` : "",
    problemDescription: htmlToText(question.translatedContent || question.content),
  };
}
