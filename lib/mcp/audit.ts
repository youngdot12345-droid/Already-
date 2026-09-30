export type AuditEvent = { id: string; actor: "user" | "ai" | "system"; action: string; allowed: boolean; createdAt: string; metadata?: Record<string, string> };
const events: AuditEvent[] = [];
export function recordAudit(event: Omit<AuditEvent, "id" | "createdAt">) {
  const saved = { ...event, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  events.unshift(saved); return saved;
}
export function listAuditEvents() { return events; }
