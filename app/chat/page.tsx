"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Role = "user" | "assistant";
type ChatMsg = {
  role: Role;
  content: string;
  meta?: { hidden?: boolean; raw_json?: string };
};

type ApiResponse = {
  retrieved: { id: string; score: number }[];
  result: {
    status: "forbidden" | "need_info" | "ready";
    message: string;
    payload: Record<string, any>;
    missing_fields: string[];
    next_question: string;
    instructions: string;
    policy_used: string[];
  };
};

function pretty(obj: any) {
  return JSON.stringify(obj, null, 2);
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const [lastResult, setLastResult] = useState<ApiResponse["result"] | null>(null);
  const [lastRetrieved, setLastRetrieved] = useState<ApiResponse["retrieved"] | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const visibleMessages = useMemo(
    () => messages.filter((m) => !m.meta?.hidden),
    [messages]
  );

  const badgeClass = (status?: string) => {
    const base = "px-2 py-1 rounded bg-[#2d2d2d] text-gray-100 text-sm border border-[#2d2d2d]";
    if (status === "ready") return `${base} border-green-400/40`;
    if (status === "need_info") return `${base} border-sky-400/40`;
    if (status === "forbidden") return `${base} border-red-400/40`;
    return base;
  };

  const reset = () => {
    setMessages([
      {
        role: "assistant",
        content:
          "Spune-mi motivul pentru care ai nevoie de adeverinta (ex: Work & Travel, angajare, pensie urmas etc.).",
      },
    ]);
    setLastResult(null);
    setLastRetrieved(null);
    setInput("");
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;

    const nextMsgs: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages(nextMsgs);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMsgs.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Eroare la /api/chat. Verifica serverul si OPENAI_API_KEY.",
            meta: { raw_json: t },
          },
        ]);
        return;
      }

      const data = (await res.json()) as ApiResponse;
      setLastResult(data.result);
      setLastRetrieved(data.retrieved);

      const assistantJson = pretty(data.result);

        const msg = (data.result.message || "").trim();
        const q = (data.result.next_question || "").trim();

        const needInfoText = (() => {
        if (!q) return msg;
        if (!msg) return q;
        if (msg.toLowerCase() === q.toLowerCase()) return q;
        return `${msg}\n\n${q}`;
        })();

        const uiText =
        data.result.status === "need_info"
            ? (data.result.next_question || data.result.message)
            : data.result.status === "ready"
            ? [data.result.message, data.result.instructions].filter(Boolean).join("\n\n")
            : data.result.message;

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: uiText, meta: { raw_json: assistantJson } },
      ]);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: assistantJson, meta: { hidden: true } },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white">
      <header className="bg-[#1a1a1a] border-b border-[#2d2d2d] px-6 py-5 sticky top-0 z-[120]">
        <div className="max-w-7xl mx-auto flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-semibold text-xl">UBB Adeverinte Agent</div>
              <div className="text-gray-200 italic text-sm">
                Demo: Chat + RAG (kb/*.md) + /api/chat
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={badgeClass(lastResult?.status)}>{lastResult?.status ?? "idle"}</div>
            <button
              onClick={reset}
              className="px-3 py-2 rounded-2xl bg-[#2d2d2d] text-gray-100 text-sm border border-[#2d2d2d] hover:border-green-400/40"
              type="button"
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-2xl overflow-hidden flex flex-col min-h-[70vh]">
          <div className="border-b border-[#2d2d2d] px-6 py-4">
            <div className="text-white font-semibold">Chat</div>
            <div className="text-gray-300 text-sm">
              Exemplu: "Vreau adeverinta pentru Work and Travel" sau "Vreau adeverinta pentru CAS"
            </div>
          </div>

          <div className="flex-1 px-6 py-5 overflow-y-auto space-y-3">
            {visibleMessages.map((m, i) => {
              const isUser = m.role === "user";
              return (
                <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={[
                      "max-w-[85%] rounded-2xl border px-4 py-3 shadow-sm",
                      isUser
                        ? "bg-[#0f172a] border-sky-400/30 text-gray-100"
                        : "bg-[#111] border-[#2d2d2d] text-gray-200",
                    ].join(" ")}
                  >
                    <div className="text-gray-400 text-xs mb-1">{isUser ? "Tu" : "Agent"}</div>
                    <div className="whitespace-pre-wrap leading-relaxed text-sm">{m.content}</div>

                    {m.meta?.raw_json ? (
                      <details className="mt-3">
                        <summary className="text-xs text-sky-400 underline cursor-pointer select-none">
                          JSON (debug)
                        </summary>
                        <pre className="my-3 max-w-full overflow-x-auto text-xs bg-black/30 border border-[#2d2d2d] rounded-2xl p-3">
                          {m.meta.raw_json}
                        </pre>
                      </details>
                    ) : null}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-[#2d2d2d] px-6 py-4">
            <div className="flex gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") send();
                }}
                placeholder='Ex: "Vreau adeverinta pentru Work & Travel"'
                className="flex-1 bg-[#0f172a] border border-[#2d2d2d] rounded-2xl px-4 py-3 text-sm outline-none focus:border-green-400/40 text-gray-100"
                disabled={busy}
              />
              <button
                onClick={send}
                disabled={busy || !input.trim()}
                className="px-4 py-3 rounded-2xl bg-[#2d2d2d] text-gray-100 text-sm border border-[#2d2d2d] hover:border-green-400/40 disabled:opacity-50"
                type="button"
              >
                {busy ? "..." : "Trimite"}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-2xl p-4">
            <div className="text-white font-semibold mb-2">Payload (formular)</div>
            <pre className="text-xs bg-black/30 border border-[#2d2d2d] rounded-2xl p-3 overflow-x-auto text-gray-200">
              {pretty(lastResult?.payload ?? {})}
            </pre>
          </div>

          <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-2xl p-4">
            <div className="text-white font-semibold mb-2">Missing fields</div>
            <pre className="text-xs bg-black/30 border border-[#2d2d2d] rounded-2xl p-3 overflow-x-auto text-gray-200">
              {pretty(lastResult?.missing_fields ?? [])}
            </pre>
          </div>

          <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-2xl p-4">
            <div className="text-white font-semibold mb-2">Policy used</div>
            <div className="flex flex-wrap gap-2">
              {(lastResult?.policy_used ?? []).length ? (
                lastResult!.policy_used.map((id) => (
                  <span
                    key={id}
                    className="px-2 py-1 rounded bg-[#2d2d2d] text-gray-100 text-sm border border-[#2d2d2d]"
                  >
                    {id}
                  </span>
                ))
              ) : (
                <span className="text-gray-400 text-sm">-</span>
              )}
            </div>
          </div>

          <div className="bg-[#1a1a1a] border border-[#2d2d2d] rounded-2xl p-4">
            <div className="text-white font-semibold mb-2">Retrieved (top-k)</div>
            <pre className="text-xs bg-black/30 border border-[#2d2d2d] rounded-2xl p-3 overflow-x-auto text-gray-200">
              {pretty(lastRetrieved ?? [])}
            </pre>
          </div>
        </div>
      </main>
    </div>
  );
}