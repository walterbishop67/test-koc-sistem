import { useEffect, useRef } from "react";
import { parseInsightsText } from "../store/useAIStore";
import type { AIInsightsResponse } from "../types";

interface Props {
  insights: AIInsightsResponse | null;
  streamingText?: string;
  loading: boolean;
  error: string | null;
  onRefresh?: () => void;
}

const cardBase: React.CSSProperties = {
  background: "rgba(255,255,255,0.9)",
  border: "1px solid rgba(185,11,20,0.1)",
  borderRadius: "14px",
  padding: "14px",
};

function SectionLabel({ label, icon }: { label: string; icon: string }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <span
        className="material-symbols-outlined text-[15px]"
        style={{ color: "#906f6b" }}
      >
        {icon}
      </span>
      <span
        className="text-[10px] font-bold uppercase tracking-widest"
        style={{ color: "#906f6b" }}
      >
        {label}
      </span>
    </div>
  );
}

function StreamingView({ text }: { text: string }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [text]);

  const partial = parseInsightsText(text);
  const hasAnything = partial.summary || partial.suggestions.length > 0 || partial.risks.length > 0;

  if (!hasAnything) {
    return (
      <div className="flex flex-col items-center justify-center py-14 gap-4">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full animate-bounce [animation-delay:0ms]" style={{ background: "#b90b14" }} />
          <span className="w-2 h-2 rounded-full animate-bounce [animation-delay:150ms]" style={{ background: "#b90b14" }} />
          <span className="w-2 h-2 rounded-full animate-bounce [animation-delay:300ms]" style={{ background: "#b90b14" }} />
        </div>
        <p className="text-sm" style={{ color: "#906f6b" }}>
          AI analiz yapıyor...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {partial.summary && (
        <div style={{ ...cardBase, borderColor: "rgba(185,11,20,0.18)", background: "rgba(185,11,20,0.05)" }}>
          <SectionLabel label="Özet" icon="summarize" />
          <p className="text-sm leading-relaxed" style={{ color: "#131b2e" }}>
            {partial.summary}
            {!partial.suggestions.length && (
              <span className="inline-block w-0.5 h-3.5 ml-0.5 animate-pulse align-middle" style={{ background: "#b90b14" }} />
            )}
          </p>
        </div>
      )}

      {partial.suggestions.length > 0 && (
        <div>
          <SectionLabel label="Öneriler" icon="lightbulb" />
          <ul className="space-y-2">
            {partial.suggestions.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-sm"
                style={{ ...cardBase, borderColor: "rgba(16,185,129,0.2)", background: "rgba(16,185,129,0.06)" }}
              >
                <span
                  className="material-symbols-outlined text-[15px] flex-shrink-0 mt-0.5"
                  style={{ color: "#059669" }}
                >
                  lightbulb
                </span>
                <span style={{ color: "#131b2e" }}>
                  {s}
                  {i === partial.suggestions.length - 1 && !partial.risks.length && (
                    <span className="inline-block w-0.5 h-3.5 ml-0.5 animate-pulse align-middle" style={{ background: "#b90b14" }} />
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {partial.risks.length > 0 && (
        <div>
          <SectionLabel label="Riskler" icon="warning" />
          <ul className="space-y-2">
            {partial.risks.map((r, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-sm"
                style={{ ...cardBase, borderColor: "rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.06)" }}
              >
                <span
                  className="material-symbols-outlined text-[15px] flex-shrink-0 mt-0.5"
                  style={{ color: "#d97706" }}
                >
                  warning
                </span>
                <span style={{ color: "#131b2e" }}>
                  {r}
                  {i === partial.risks.length - 1 && (
                    <span className="inline-block w-0.5 h-3.5 ml-0.5 animate-pulse align-middle" style={{ background: "#b90b14" }} />
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

function InsightsView({ insights, onRefresh }: { insights: AIInsightsResponse; onRefresh?: () => void }) {
  return (
    <div className="space-y-4">
      <div style={{ ...cardBase, borderColor: "rgba(185,11,20,0.18)", background: "rgba(185,11,20,0.05)" }}>
        <SectionLabel label="Özet" icon="summarize" />
        <p className="text-sm leading-relaxed" style={{ color: "#131b2e" }}>
          {insights.summary}
        </p>
      </div>

      {insights.suggestions.length > 0 && (
        <div>
          <SectionLabel label="Öneriler" icon="lightbulb" />
          <ul className="space-y-2">
            {insights.suggestions.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-sm"
                style={{ ...cardBase, borderColor: "rgba(16,185,129,0.2)", background: "rgba(16,185,129,0.06)" }}
              >
                <span
                  className="material-symbols-outlined text-[15px] flex-shrink-0 mt-0.5"
                  style={{ color: "#059669" }}
                >
                  lightbulb
                </span>
                <span style={{ color: "#131b2e" }}>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {insights.risks.length > 0 && (
        <div>
          <SectionLabel label="Riskler" icon="warning" />
          <ul className="space-y-2">
            {insights.risks.map((r, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-sm"
                style={{ ...cardBase, borderColor: "rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.06)" }}
              >
                <span
                  className="material-symbols-outlined text-[15px] flex-shrink-0 mt-0.5"
                  style={{ color: "#d97706" }}
                >
                  warning
                </span>
                <span style={{ color: "#131b2e" }}>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {onRefresh && (
        <button
          onClick={onRefresh}
          className="w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 rounded-xl transition-all"
          style={{
            background: "rgba(255,255,255,0.8)",
            border: "1px dashed rgba(185,11,20,0.2)",
            color: "#906f6b",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(185,11,20,0.4)";
            (e.currentTarget as HTMLButtonElement).style.color = "#93000a";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(185,11,20,0.2)";
            (e.currentTarget as HTMLButtonElement).style.color = "#906f6b";
          }}
        >
          <span className="material-symbols-outlined text-[14px]">refresh</span>
          Yeniden Analiz Et
        </button>
      )}
    </div>
  );
}

export default function AIInsightsPanel({ insights, streamingText = "", loading, error, onRefresh }: Props) {
  if (error) {
    return (
      <div
        className="rounded-xl p-4 text-center"
        style={{ background: "rgba(185,11,20,0.06)", border: "1px solid rgba(185,11,20,0.2)" }}
      >
        <span className="material-symbols-outlined text-2xl block mb-1.5" style={{ color: "#b90b14" }}>
          error_outline
        </span>
        <p className="text-sm" style={{ color: "#b90b14" }}>
          {error}
        </p>
      </div>
    );
  }

  if (loading) {
    return <StreamingView text={streamingText} />;
  }

  if (!insights) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(185,11,20,0.08)", border: "1px solid rgba(185,11,20,0.18)" }}
        >
          <span className="material-symbols-outlined text-[28px]" style={{ color: "#b90b14" }}>
            analytics
          </span>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium" style={{ color: "#131b2e" }}>Analiz yapılmadı</p>
          <p className="text-xs mt-1" style={{ color: "#906f6b" }}>Analiz başlatmak için butona tıkla</p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="mt-1 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: "linear-gradient(135deg,#de2e2a,#b90b14)" }}
          >
            Analiz Başlat
          </button>
        )}
      </div>
    );
  }

  return <InsightsView insights={insights} onRefresh={onRefresh} />;
}
