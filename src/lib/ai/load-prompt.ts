import { readFileSync } from "fs";
import { join } from "path";
import { parse } from "yaml";

// Cache for loaded prompts
const promptCache = new Map<string, PromptFile>();

// Keep reads explicit so Next.js traces only these runtime files instead of
// including the entire repository for a variable path under process.cwd().
const promptReaders: Record<string, () => string> = {
  "src/lib/ai/generate-example.prompt.yml": () =>
    readFileSync(join(process.cwd(), "src/lib/ai/generate-example.prompt.yml"), "utf-8"),
  "src/lib/ai/translate.prompt.yml": () =>
    readFileSync(join(process.cwd(), "src/lib/ai/translate.prompt.yml"), "utf-8"),
  "src/lib/ai/query-translator.prompt.yml": () =>
    readFileSync(join(process.cwd(), "src/lib/ai/query-translator.prompt.yml"), "utf-8"),
  "src/lib/ai/improve-prompt.prompt.yml": () =>
    readFileSync(join(process.cwd(), "src/lib/ai/improve-prompt.prompt.yml"), "utf-8"),
  "src/lib/ai/quality-check.prompt.yml": () =>
    readFileSync(join(process.cwd(), "src/lib/ai/quality-check.prompt.yml"), "utf-8"),
  "src/lib/ai/sql-generation.prompt.yml": () =>
    readFileSync(join(process.cwd(), "src/lib/ai/sql-generation.prompt.yml"), "utf-8"),
  "src/app/api/prompt-builder/chat/prompt-builder-agent.prompt.yml": () =>
    readFileSync(join(process.cwd(), "src/app/api/prompt-builder/chat/prompt-builder-agent.prompt.yml"), "utf-8"),
};

export interface PromptMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface PromptFile {
  name: string;
  description: string;
  model?: string;
  modelParameters?: {
    temperature?: number;
    maxTokens?: number;
  };
  messages: PromptMessage[];
  testData?: Array<Record<string, unknown>>;
}

/**
 * Load and parse a .prompt.yml file
 * @param relativePath - Path relative to project root (e.g., "src/lib/ai/translate.prompt.yml")
 * @returns Parsed prompt file content
 */
export function loadPrompt(relativePath: string): PromptFile {
  // Check cache first
  if (promptCache.has(relativePath)) {
    return promptCache.get(relativePath)!;
  }

  const readPrompt = Object.hasOwn(promptReaders, relativePath)
    ? promptReaders[relativePath]
    : undefined;
  if (!readPrompt) {
    throw new Error(`Unknown prompt file: ${relativePath}`);
  }
  const content = readPrompt();
  const prompt = parse(content) as PromptFile;
  
  // Cache the result
  promptCache.set(relativePath, prompt);
  
  return prompt;
}

/**
 * Get the system message content from a prompt file
 * @param prompt - The parsed prompt file
 * @returns The system message content or empty string if not found
 */
export function getSystemPrompt(prompt: PromptFile): string {
  const systemMessage = prompt.messages.find((m) => m.role === "system");
  return systemMessage?.content || "";
}

/**
 * Interpolate variables in a prompt template
 * @param template - The prompt template with {{variable}} placeholders
 * @param variables - Object containing variable values
 * @returns The interpolated string
 */
export function interpolatePrompt(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}
