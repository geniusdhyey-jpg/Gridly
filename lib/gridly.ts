export type ChatRole = "user" | "assistant";

export type Source = { title: string; url: string };

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  sources?: Source[];
  researched?: boolean;
  createdAt: number;
};

export type Chat = {
  id: string;
  title: string;
  messages: ChatMessage[];
  mode: "chat" | "research";
  projectId?: string;
  updatedAt: number;
};

export type Project = { id: string; name: string; createdAt: number };
export type SavedResponse = {
  id: string;
  chatId: string;
  messageId: string;
  title: string;
  content: string;
  sources?: Source[];
  savedAt: number;
};

export type Workspace = {
  chats: Chat[];
  projects: Project[];
  library: SavedResponse[];
  activeChatId: string | null;
};

export const STORAGE_KEY = "gridly-workspace-v1";

export function makeId(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function blankChat(mode: "chat" | "research" = "chat"): Chat {
  return { id: makeId("chat"), title: "New exploration", messages: [], mode, updatedAt: Date.now() };
}

export function initialWorkspace(): Workspace {
  const first = blankChat();
  return { chats: [first], projects: [], library: [], activeChatId: first.id };
}

export function loadWorkspace(raw: string | null): Workspace {
  if (!raw) return initialWorkspace();
  try {
    const parsed = JSON.parse(raw) as Partial<Workspace>;
    if (!Array.isArray(parsed.chats) || !Array.isArray(parsed.projects) || !Array.isArray(parsed.library)) return initialWorkspace();
    const chats = parsed.chats.filter((chat) => chat && typeof chat.id === "string" && Array.isArray(chat.messages));
    if (!chats.length) return initialWorkspace();
    return { chats, projects: parsed.projects, library: parsed.library, activeChatId: chats.some((c) => c.id === parsed.activeChatId) ? parsed.activeChatId! : chats[0].id };
  } catch {
    return initialWorkspace();
  }
}

export function titleFromPrompt(prompt: string) {
  const clean = prompt.replace(/\s+/g, " ").trim();
  return clean.length > 42 ? `${clean.slice(0, 41).trim()}…` : clean || "New exploration";
}

export function matchesChat(chat: Chat, query: string) {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return true;
  return [chat.title, ...chat.messages.map((message) => message.content)].some((value) => value.toLocaleLowerCase().includes(needle));
}

export function isSafeExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeSources(value: unknown): Source[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const title = "title" in item && typeof item.title === "string" ? item.title.trim() : "Official source";
    const url = "url" in item && typeof item.url === "string" ? item.url.trim() : "";
    if (!isSafeExternalUrl(url) || seen.has(url)) return [];
    seen.add(url);
    return [{ title: title || "Official source", url }];
  }).slice(0, 12);
}

export function exportChatMarkdown(chat: Chat) {
  const body = chat.messages.map((message) => {
    const sources = message.sources?.length
      ? `\n\nSources:\n${message.sources.map((source) => `- [${source.title}](${source.url})`).join("\n")}`
      : "";
    return `## ${message.role === "user" ? "You" : "Gridly"}\n\n${message.content}${sources}`;
  }).join("\n\n---\n\n");
  return `# ${chat.title}\n\n${body}\n`;
}

export function nextRateLimitState(current: { count: number; windowStart: number } | null, now: number, windowMs = 3_600_000) {
  const windowStart = Math.floor(now / windowMs) * windowMs;
  if (!current || current.windowStart !== windowStart) return { count: 1, windowStart };
  return { count: current.count + 1, windowStart };
}
