import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Column, Sprint } from "../types";
import { useAIStore } from "../store/useAIStore";

interface Props {
  boardTitle: string;
  columns: Column[];
  sprint: Sprint | null;
  memberCount: number;
}

export default function AICoachChat({ boardTitle, columns, sprint, memberCount }: Props) {
  const { chatMessages, chatStreaming, chatError, chatStreamingText, sendChatMessage } = useAIStore();
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const boardContext = useMemo(
    () => ({ boardTitle, columns, sprint, memberCount }),
    [boardTitle, columns, sprint, memberCount]
  );

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [chatMessages, chatStreamingText]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const msg = input.trim();
    if (!msg || chatStreaming) return;
    setInput("");
    await sendChatMessage(msg, boardContext);
  };

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Message list */}
      <div ref={listRef} className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
        {chatMessages.length === 0 && !chatStreaming && !chatError && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(185,11,20,0.08)", border: "1px solid rgba(185,11,20,0.18)" }}
            >
              <span className="material-symbols-outlined text-[28px]" style={{ color: "#b90b14" }}>psychology</span>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: "#131b2e" }}>AI Koç hazır</p>
              <p className="text-xs mt-1" style={{ color: "#906f6b" }}>Board hakkında bir şeyler sorabilirsin</p>
            </div>
            {/* Quick prompts */}
            <div className="w-full mt-2 space-y-2">
              {[
                "Hangi görevler gecikmiş?",
                "Sprint durumunu özetle",
                "Ne yapmalıyım bu hafta?",
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => {
                    setInput(prompt);
                    void sendChatMessage(prompt, boardContext);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all"
                  style={{
                    background: "rgba(255,255,255,0.8)",
                    border: "1px solid rgba(185,11,20,0.1)",
                    color: "#5c403c",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(185,11,20,0.06)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(185,11,20,0.25)";
                    (e.currentTarget as HTMLButtonElement).style.color = "#93000a";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.8)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(185,11,20,0.1)";
                    (e.currentTarget as HTMLButtonElement).style.color = "#5c403c";
                  }}
                >
                  <span className="material-symbols-outlined text-[12px] mr-1.5 align-middle opacity-60">arrow_forward</span>
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatMessages.map((msg, i) => (
          <div key={`${msg.role}-${i}`} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div
                className="w-6 h-6 rounded-lg flex-shrink-0 mt-0.5 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#de2e2a,#b90b14)" }}
              >
                <span className="material-symbols-outlined text-white text-[12px]">auto_awesome</span>
              </div>
            )}
            <div
              className="max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
              style={
                msg.role === "user"
                  ? {
                      background: "linear-gradient(135deg,#de2e2a,#b90b14)",
                      color: "#fff",
                      borderRadius: "18px 18px 4px 18px",
                    }
                  : {
                      background: "rgba(255,255,255,0.9)",
                      border: "1px solid rgba(185,11,20,0.1)",
                      color: "#131b2e",
                      borderRadius: "18px 18px 18px 4px",
                    }
              }
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {chatStreaming && (
          <div className="flex gap-2 justify-start">
            <div
              className="w-6 h-6 rounded-lg flex-shrink-0 mt-0.5 flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#de2e2a,#b90b14)" }}
            >
              <span className="material-symbols-outlined text-white text-[12px]">auto_awesome</span>
            </div>
            <div
              className="max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm"
              style={{
                background: "rgba(255,255,255,0.9)",
                border: "1px solid rgba(185,11,20,0.1)",
                color: "#131b2e",
                borderRadius: "18px 18px 18px 4px",
              }}
            >
              {chatStreamingText ? (
                <p className="whitespace-pre-wrap leading-relaxed">{chatStreamingText}</p>
              ) : (
                <div className="flex items-center gap-1 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0ms]" style={{ background: "#b90b14" }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:150ms]" style={{ background: "#b90b14" }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:300ms]" style={{ background: "#b90b14" }} />
                </div>
              )}
            </div>
          </div>
        )}

        {chatError && (
          <div
            className="rounded-xl p-3 text-sm flex items-start gap-2"
            style={{ background: "rgba(185,11,20,0.06)", border: "1px solid rgba(185,11,20,0.2)", color: "#b90b14" }}
          >
            <span className="material-symbols-outlined text-[16px] flex-shrink-0 mt-0.5">error_outline</span>
            {chatError}
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={onSubmit}
        className="flex-shrink-0 flex items-end gap-2 pt-3"
        style={{ borderTop: "1px solid rgba(185,11,20,0.08)" }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              const msg = input.trim();
              if (!msg || chatStreaming) return;
              setInput("");
              void sendChatMessage(msg, boardContext);
            }
          }}
          rows={2}
          placeholder="Bir şeyler sor..."
          className="flex-1 resize-none text-sm outline-none"
          style={{
            background: "rgba(255,255,255,0.9)",
            border: "1px solid rgba(185,11,20,0.12)",
            borderRadius: "14px",
            padding: "10px 14px",
            color: "#131b2e",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(185,11,20,0.4)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(185,11,20,0.12)"; }}
        />
        <button
          type="submit"
          disabled={chatStreaming || !input.trim()}
          className="flex-shrink-0 w-[42px] h-[42px] rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
          style={{ background: "linear-gradient(135deg,#de2e2a,#b90b14)" }}
        >
          <span className="material-symbols-outlined text-white text-[18px]">send</span>
        </button>
      </form>
    </div>
  );
}
