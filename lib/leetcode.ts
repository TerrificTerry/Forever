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

async function leetcodeGraphQL<T>(query: string, variables: Record<string, unknown>) {
  const response = await fetch(LEETCODE_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Referer: "https://leetcode.com/problemset/",
      "User-Agent": "SpiritArchive/1.0",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`LeetCode returned HTTP ${response.status}.`);
  const payload = await response.json() as { data?: T; errors?: Array<{ message?: string }> };
  if (payload.errors?.length) throw new Error(payload.errors.map((error) => error.message).filter(Boolean).join("; ") || "LeetCode returned a GraphQL error.");
  if (!payload.data) throw new Error("LeetCode returned an empty response.");
  return payload.data;
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

export async function fetchLeetCodeProblemByNumber(problemNumber: number) {
  const listQuery = `
    query problemsetQuestionList($categorySlug: String, $skip: Int, $limit: Int, $filters: QuestionListFilterInput) {
      problemsetQuestionList(categorySlug: $categorySlug, skip: $skip, limit: $limit, filters: $filters) {
        questions {
          frontendQuestionId
          title
          titleSlug
          difficulty
          topicTags { name slug }
        }
      }
    }
  `;
  const listData = await leetcodeGraphQL<{ problemsetQuestionList?: { questions?: LeetCodeListQuestion[] } }>(listQuery, {
    categorySlug: "",
    skip: 0,
    limit: 30,
    filters: { searchKeywords: String(problemNumber) },
  });
  const questions = listData.problemsetQuestionList?.questions || [];
  const match = questions.find((question) => normalizeNumber(question.frontendQuestionId) === problemNumber);
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
  const detailData = await leetcodeGraphQL<{ question?: LeetCodeQuestion | null }>(detailQuery, { titleSlug: match.titleSlug });
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
