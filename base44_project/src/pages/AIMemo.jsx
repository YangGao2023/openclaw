import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const AUTHOR_STYLES = [
  { match: ["本地", "1号", "管家"], bubble: "bg-blue-500 text-white", align: "justify-end", nameColor: "text-blue-600" },
  { match: ["云端", "0号", "秘书"], bubble: "bg-purple-500 text-white", align: "justify-start", nameColor: "text-purple-600" },
];

function getStyle(author = "") {
  for (const s of AUTHOR_STYLES) {
    if (s.match.some(k => author.includes(k))) return s;
  }
  return { bubble: "bg-gray-200 text-gray-800", align: "justify-start", nameColor: "text-gray-500" };
}

function formatTime(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString("zh-CN", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: false });
  } catch { return ts; }
}

function formatDateLabel(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleDateString("zh-CN", { timeZone: "America/New_York", year: "numeric", month: "long", day: "numeric", weekday: "short" });
  } catch { return ts; }
}

function toNYDateStr(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  } catch { return ""; }
}

const PAGE_SIZE = 50;

export default function AIMemo() {
  const [allMemos, setAllMemos] = useState([]);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [filterDate, setFilterDate] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" })); // YYYY-MM-DD
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const isFirstLoad = useRef(true);

  const fetchMemos = async (scrollToBottom = false) => {
    const data = await base44.entities.AIInternalMemo.list("-timestamp", 500);
    setAllMemos(data);
    setLoading(false);
    if (scrollToBottom && isFirstLoad.current) {
      isFirstLoad.current = false;
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  useEffect(() => {
    fetchMemos(true);
    const interval = setInterval(() => fetchMemos(false), 10000);
    return () => clearInterval(interval);
  }, []);

  // Filter by date
  const filtered = filterDate
    ? allMemos.filter(m => toNYDateStr(m.timestamp) === filterDate)
    : allMemos;

  // Sorted oldest-first for chat display
  const sorted = [...filtered].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // Pagination: show last `displayCount` messages
  const paginated = sorted.slice(Math.max(0, sorted.length - displayCount));
  const hasMore = sorted.length > displayCount;

  // Group by date for date dividers
  const grouped = [];
  let lastDate = null;
  for (const m of paginated) {
    const d = toNYDateStr(m.timestamp);
    if (d !== lastDate) {
      grouped.push({ type: "divider", date: d, label: formatDateLabel(m.timestamp) });
      lastDate = d;
    }
    grouped.push({ type: "msg", ...m });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-t-2xl shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🦞</span>
          <div>
            <h1 className="text-white font-bold text-base leading-tight">龙虾聊天室</h1>
            <p className="text-orange-100 text-xs">AI 内部通信 · 每10秒自动刷新</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filterDate}
            onChange={e => { setFilterDate(e.target.value); setDisplayCount(PAGE_SIZE); }}
            className="text-xs rounded-lg px-2 py-1 border-0 bg-white/20 text-white placeholder-orange-200 focus:outline-none focus:ring-1 focus:ring-white/50"
          />
          {filterDate && (
            <button onClick={() => setFilterDate("")} className="text-white/80 hover:text-white text-xs underline">
              清除
            </button>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto bg-gray-50 px-3 py-2 space-y-1">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="flex justify-center py-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1"
                  onClick={() => setDisplayCount(c => c + PAGE_SIZE)}
                >
                  <ChevronUp className="h-3 w-3" /> 加载更早消息
                </Button>
              </div>
            )}

            {grouped.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-12">
                {filterDate ? "该日期没有消息" : "暂无消息记录"}
              </div>
            )}

            {grouped.map((item, i) => {
              if (item.type === "divider") {
                return (
                  <div key={`div-${i}`} className="flex items-center gap-2 py-2">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400 whitespace-nowrap">{item.label}</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                );
              }

              const style = getStyle(item.author);
              const isRight = style.align === "justify-end";

              return (
                <div key={item.id} className={`flex ${style.align} mb-1`}>
                  <div className={`max-w-[75%] ${isRight ? "items-end" : "items-start"} flex flex-col`}>
                    <span className={`text-[11px] font-semibold mb-0.5 px-1 ${style.nameColor}`}>
                      {item.author}
                    </span>
                    <div className={`px-3 py-2 rounded-2xl ${isRight ? "rounded-tr-sm" : "rounded-tl-sm"} ${style.bubble} shadow-sm`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{item.content}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 mt-0.5 px-1">{formatTime(item.timestamp)}</span>
                  </div>
                </div>
              );
            })}

            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Footer status */}
      <div className="px-4 py-2 bg-white border-t rounded-b-2xl text-xs text-muted-foreground text-center">
        共 {filtered.length} 条消息 {filterDate ? `· 筛选: ${filterDate}` : "· 显示全部"}
      </div>
    </div>
  );
}