type TokenKind = "plain" | "keyword" | "type" | "builtin" | "string" | "comment" | "number" | "function" | "operator";
type CodeToken = { kind: TokenKind; text: string };
type CodeLanguage = "python" | "java" | "c" | "cpp" | "javascript" | "typescript" | "go" | "text";

const TOKEN_CLASS: Record<TokenKind, string> = {
  plain: "text-stone-800",
  keyword: "font-semibold text-violet-700",
  type: "text-sky-700",
  builtin: "text-emerald-700",
  string: "text-amber-700",
  comment: "italic text-stone-400",
  number: "text-pink-700",
  function: "text-blue-700",
  operator: "text-stone-500",
};

const LANGUAGE_LABEL: Record<CodeLanguage, string> = {
  python: "Python",
  java: "Java",
  c: "C",
  cpp: "C++",
  javascript: "JavaScript",
  typescript: "TypeScript",
  go: "Go",
  text: "Text",
};

const KEYWORDS: Record<CodeLanguage, Set<string>> = {
  python: new Set(["and", "as", "assert", "async", "await", "break", "class", "continue", "def", "del", "elif", "else", "except", "finally", "for", "from", "global", "if", "import", "in", "is", "lambda", "nonlocal", "not", "or", "pass", "raise", "return", "try", "while", "with", "yield"]),
  java: new Set(["abstract", "assert", "break", "case", "catch", "class", "continue", "default", "do", "else", "enum", "extends", "final", "finally", "for", "if", "implements", "import", "instanceof", "interface", "new", "package", "private", "protected", "public", "return", "static", "super", "switch", "this", "throw", "throws", "try", "while"]),
  c: new Set(["auto", "break", "case", "continue", "default", "do", "else", "enum", "extern", "for", "goto", "if", "inline", "register", "return", "sizeof", "static", "struct", "switch", "typedef", "union", "volatile", "while"]),
  cpp: new Set(["alignas", "auto", "break", "case", "catch", "class", "const", "constexpr", "continue", "decltype", "default", "delete", "do", "else", "enum", "explicit", "extern", "for", "friend", "if", "inline", "namespace", "new", "noexcept", "operator", "private", "protected", "public", "return", "sizeof", "static", "struct", "switch", "template", "this", "throw", "try", "typename", "using", "virtual", "while"]),
  javascript: new Set(["async", "await", "break", "case", "catch", "class", "const", "continue", "debugger", "default", "delete", "do", "else", "export", "extends", "finally", "for", "from", "function", "if", "import", "in", "instanceof", "let", "new", "of", "return", "switch", "this", "throw", "try", "typeof", "var", "void", "while", "yield"]),
  typescript: new Set(["abstract", "as", "async", "await", "break", "case", "catch", "class", "const", "continue", "declare", "default", "delete", "do", "else", "enum", "export", "extends", "finally", "for", "from", "function", "if", "implements", "import", "in", "interface", "keyof", "let", "namespace", "new", "of", "private", "protected", "public", "readonly", "return", "satisfies", "switch", "this", "throw", "try", "type", "typeof", "var", "void", "while", "yield"]),
  go: new Set(["break", "case", "chan", "const", "continue", "defer", "else", "fallthrough", "for", "func", "go", "goto", "if", "import", "interface", "map", "package", "range", "return", "select", "struct", "switch", "type", "var"]),
  text: new Set(),
};

const TYPES: Record<CodeLanguage, Set<string>> = {
  python: new Set(["bool", "dict", "float", "frozenset", "int", "list", "set", "str", "tuple", "Deque", "Dict", "List", "Optional", "Set", "Tuple"]),
  java: new Set(["boolean", "byte", "char", "double", "float", "int", "long", "short", "void", "String", "Integer", "Long", "Double", "Boolean", "List", "ArrayList", "Map", "HashMap", "Set", "HashSet", "Deque", "ArrayDeque", "Queue", "PriorityQueue", "TreeNode", "ListNode"]),
  c: new Set(["bool", "char", "double", "float", "int", "long", "short", "signed", "size_t", "unsigned", "void"]),
  cpp: new Set(["bool", "char", "double", "float", "int", "long", "short", "signed", "size_t", "string", "unsigned", "void", "vector", "unordered_map", "unordered_set", "map", "set", "queue", "deque", "priority_queue", "pair", "TreeNode", "ListNode"]),
  javascript: new Set(["Array", "BigInt", "Boolean", "Date", "Map", "Number", "Object", "Promise", "Set", "String", "WeakMap", "WeakSet"]),
  typescript: new Set(["Array", "Record", "Promise", "Map", "Set", "string", "number", "boolean", "unknown", "never", "any", "void", "null", "undefined"]),
  go: new Set(["bool", "byte", "complex64", "complex128", "error", "float32", "float64", "int", "int8", "int16", "int32", "int64", "rune", "string", "uint", "uint8", "uint16", "uint32", "uint64", "uintptr"]),
  text: new Set(),
};

const BUILTINS: Record<CodeLanguage, Set<string>> = {
  python: new Set(["all", "any", "bin", "bool", "dict", "enumerate", "filter", "float", "int", "len", "list", "map", "max", "min", "print", "range", "reversed", "set", "sorted", "str", "sum", "tuple", "zip", "True", "False", "None"]),
  java: new Set(["Arrays", "Collections", "Math", "System", "Integer", "Long", "Double", "Boolean", "true", "false", "null"]),
  c: new Set(["malloc", "free", "printf", "scanf", "memset", "memcpy", "true", "false", "NULL"]),
  cpp: new Set(["begin", "end", "make_pair", "max", "min", "sort", "true", "false", "nullptr", "NULL"]),
  javascript: new Set(["Array", "Boolean", "console", "Math", "Number", "Object", "String", "true", "false", "null", "undefined"]),
  typescript: new Set(["Array", "Boolean", "console", "Math", "Number", "Object", "String", "true", "false", "null", "undefined"]),
  go: new Set(["append", "cap", "close", "copy", "delete", "false", "len", "make", "new", "nil", "panic", "print", "println", "true"]),
  text: new Set(),
};

function normalizeLanguage(value: string | null | undefined): CodeLanguage {
  const normalized = String(value || "").trim().toLowerCase();
  if (["py", "python3"].includes(normalized)) return "python";
  if (["js", "node"].includes(normalized)) return "javascript";
  if (["ts"].includes(normalized)) return "typescript";
  if (["c++", "cc", "cxx"].includes(normalized)) return "cpp";
  if (["golang"].includes(normalized)) return "go";
  if (["python", "java", "c", "cpp", "javascript", "typescript", "go"].includes(normalized)) return normalized as CodeLanguage;
  return "text";
}

function readString(line: string, start: number) {
  const quote = line[start];
  let index = start + 1;
  while (index < line.length) {
    if (line[index] === "\\") {
      index += 2;
      continue;
    }
    if (line[index] === quote) return index + 1;
    index += 1;
  }
  return line.length;
}

function nextNonSpace(line: string, index: number) {
  let cursor = index;
  while (cursor < line.length && /\s/.test(line[cursor])) cursor += 1;
  return line[cursor] || "";
}

function pushToken(tokens: CodeToken[], kind: TokenKind, text: string) {
  if (!text) return;
  const last = tokens[tokens.length - 1];
  if (last?.kind === kind) last.text += text;
  else tokens.push({ kind, text });
}

function highlightLine(line: string, language: CodeLanguage, inBlockComment: boolean) {
  const tokens: CodeToken[] = [];
  const cLike = !["python", "text"].includes(language);
  const python = language === "python";
  let index = 0;
  let blockComment = inBlockComment;

  while (index < line.length) {
    if (blockComment) {
      const end = line.indexOf("*/", index);
      if (end === -1) {
        pushToken(tokens, "comment", line.slice(index));
        return { tokens, inBlockComment: true };
      }
      pushToken(tokens, "comment", line.slice(index, end + 2));
      index = end + 2;
      blockComment = false;
      continue;
    }

    if (cLike && line.startsWith("/*", index)) {
      blockComment = true;
      continue;
    }
    if (cLike && line.startsWith("//", index)) {
      pushToken(tokens, "comment", line.slice(index));
      break;
    }
    if (python && line[index] === "#") {
      pushToken(tokens, "comment", line.slice(index));
      break;
    }
    if ((language === "c" || language === "cpp") && line[index] === "#" && line.slice(0, index).trim() === "") {
      pushToken(tokens, "keyword", line.slice(index));
      break;
    }

    const char = line[index];
    if (/\s/.test(char)) {
      const match = line.slice(index).match(/^\s+/)?.[0] || char;
      pushToken(tokens, "plain", match);
      index += match.length;
      continue;
    }

    if (char === "\"" || char === "'" || (char === "`" && ["javascript", "typescript"].includes(language))) {
      const triple = line.slice(index, index + 3);
      if (python && (triple === "'''" || triple === "\"\"\"")) {
        const end = line.indexOf(triple, index + 3);
        const next = end === -1 ? line.length : end + 3;
        pushToken(tokens, "string", line.slice(index, next));
        index = next;
      } else {
        const next = readString(line, index);
        pushToken(tokens, "string", line.slice(index, next));
        index = next;
      }
      continue;
    }

    const number = line.slice(index).match(/^(?:0x[\da-f]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)/i)?.[0];
    if (number) {
      pushToken(tokens, "number", number);
      index += number.length;
      continue;
    }

    const identifier = line.slice(index).match(/^[A-Za-z_][\w]*/)?.[0];
    if (identifier) {
      const after = nextNonSpace(line, index + identifier.length);
      const kind: TokenKind = KEYWORDS[language].has(identifier)
        ? "keyword"
        : TYPES[language].has(identifier)
          ? "type"
          : BUILTINS[language].has(identifier)
            ? "builtin"
            : after === "("
              ? "function"
              : "plain";
      pushToken(tokens, kind, identifier);
      index += identifier.length;
      continue;
    }

    pushToken(tokens, /[+\-*/%=!<>|&^~?:.,;()[\]{}]/.test(char) ? "operator" : "plain", char);
    index += 1;
  }

  return { tokens, inBlockComment: blockComment };
}

function highlightCode(code: string, language: CodeLanguage) {
  let inBlockComment = false;
  return code.replace(/\r\n/g, "\n").split("\n").map((line) => {
    const result = highlightLine(line, language, inBlockComment);
    inBlockComment = result.inBlockComment;
    return result.tokens;
  });
}

export function CodeBlock({ code, language }: { code: string; language?: string | null }) {
  const normalizedLanguage = normalizeLanguage(language);
  const lines = normalizedLanguage === "text" ? code.replace(/\r\n/g, "\n").split("\n").map((line) => [{ kind: "plain" as const, text: line }]) : highlightCode(code, normalizedLanguage);
  return (
    <details className="group mt-2 overflow-hidden rounded-xl border border-line bg-[#fbfaf6] shadow-inner">
      <summary className="flex cursor-pointer list-none items-center justify-between border-b border-line bg-moss-soft/35 px-4 py-2 marker:hidden">
        <span className="text-[11px] font-bold uppercase tracking-[.18em] text-stone-500">{LANGUAGE_LABEL[normalizedLanguage]}</span>
        <span className="text-[11px] text-stone-400 group-open:hidden">expand code</span>
        <span className="text-[11px] text-stone-400 hidden group-open:inline">collapse code</span>
      </summary>
      <pre className="overflow-x-auto px-4 py-3 text-xs leading-6">
        <code>
          {lines.map((line, lineIndex) => (
            <span key={lineIndex} className="block min-h-6">
              {line.length ? line.map((token, tokenIndex) => <span key={tokenIndex} className={TOKEN_CLASS[token.kind]}>{token.text}</span>) : " "}
            </span>
          ))}
        </code>
      </pre>
    </details>
  );
}
