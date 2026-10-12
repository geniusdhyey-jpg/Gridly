export const MAX_MESSAGES = 24;
export const MAX_MESSAGE_CHARS = 8_000;
export const MAX_CONTEXT_CHARS = 48_000;

export type InputMessage = { role: "user" | "assistant"; content: string };

export function validateChatPayload(value: unknown): { mode: "chat" | "research"; messages: InputMessage[] } {
  if (!value || typeof value !== "object") throw new Error("Invalid request body.");
  const input = value as { mode?: unknown; messages?: unknown };
  const mode = input.mode === "research" ? "research" : "chat";
  if (!Array.isArray(input.messages) || input.messages.length < 1 || input.messages.length > MAX_MESSAGES) {
    throw new Error(`Send between 1 and ${MAX_MESSAGES} messages.`);
  }
  let total = 0;
  const messages = input.messages.map((message) => {
    if (!message || typeof message !== "object") throw new Error("Each message must be an object.");
    const role = "role" in message ? message.role : undefined;
    const content = "content" in message ? message.content : undefined;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") throw new Error("Messages must use user or assistant roles with text content.");
    const clean = content.trim();
    if (!clean || clean.length > MAX_MESSAGE_CHARS) throw new Error(`Each message must contain 1–${MAX_MESSAGE_CHARS.toLocaleString()} characters.`);
    total += clean.length;
    return { role, content: clean } as InputMessage;
  });
  if (total > MAX_CONTEXT_CHARS) throw new Error("This conversation is too long. Start a new chat or clear context.");
  if (messages.at(-1)?.role !== "user") throw new Error("The last message must be from the user.");
  return { mode, messages };
}

export function systemPrompt(mode: "chat" | "research") {
  return `You are Gridly, a careful opportunity-discovery assistant. Help children, teens, high-school and college students, adults, beginners, and professionals find real opportunities across competitions, science fairs, grants, scholarships, art, music, writing, film, photography, sports, debate, robotics, coding, AI, business, volunteering, environmental challenges, and other fields.

Preserve filters stated anywhere in the conversation: age or education stage, country and residency, remote/in-person/hybrid, dates, fees, skill level, category, prizes, team size, and accessibility needs. If a request is broad, ask at most two short clarifying questions, but still provide useful direction. Never ask for exact birth dates, home addresses, school addresses, or sensitive personal data. For minors, distinguish "teen-friendly" from verified age eligibility.

For every named opportunity, search the live web during the current answer before making claims. Prefer official organizer, rules, registration, or application pages. Give only 3–5 strong matches. Verify open status when possible; separate registration deadlines, submission deadlines, and event dates. State eligibility only when verified. Say exactly "Not confirmed in the official rules." for unknown details. Include a direct official HTTPS application or rules link and cite sources. Explain fit plainly. Never invent an event, date, prize, team size, eligibility rule, link, or trust score. Do not use a directory listing as confirmation. Never claim to register, contact, monitor, or notify for the user. Never present a closed or unannounced event as open. Do not infer that "students" includes minors.

Use readable Markdown without raw HTML. ${mode === "research" ? "Research mode is on: you must use web search for this reply and state that sources were checked." : "Use web search whenever current facts or named opportunities are involved."}`;
}

export function extractProviderReply(data: unknown) {
  if (!data || typeof data !== "object") return { text: "", sources: [] as { title: string; url: string }[] };
  const response = data as { output_text?: unknown; output?: unknown };
  const text = typeof response.output_text === "string" ? response.output_text.trim() : "";
  const sources: { title: string; url: string }[] = [];
  const seen = new Set<string>();
  if (Array.isArray(response.output)) {
    for (const item of response.output) {
      if (!item || typeof item !== "object" || !("content" in item) || !Array.isArray(item.content)) continue;
      for (const content of item.content) {
        if (!content || typeof content !== "object" || !("annotations" in content) || !Array.isArray(content.annotations)) continue;
        for (const annotation of content.annotations) {
          if (!annotation || typeof annotation !== "object") continue;
          const url = "url" in annotation && typeof annotation.url === "string" ? annotation.url : "";
          if (!url.startsWith("https://") || seen.has(url)) continue;
          const title = "title" in annotation && typeof annotation.title === "string" ? annotation.title : new URL(url).hostname;
          seen.add(url);
          sources.push({ title, url });
        }
      }
    }
  }
  return { text, sources };
}
