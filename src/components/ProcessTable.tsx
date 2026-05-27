import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FixedSizeList as List } from "react-window";
import { Ban, ChevronDown, ChevronUp, ChevronsUpDown, Info, Search, Shield } from "lucide-react";
import clsx from "clsx";
import type { ProcessInfo } from "../lib/types";

const ROW_HEIGHT = 36;

type SortKey = "name" | "pid" | "mem_bytes" | "cpu_percent";
type SortDir = "asc" | "desc";

interface Props {
  processes: ProcessInfo[];
  selected: Set<number>;
  onToggle: (pid: number) => void;
  onDetail?: (pid: number, name: string) => void;
  loading?: boolean;
  error?: string | null;
}

interface RowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    processes: ProcessInfo[];
    selected: Set<number>;
    onToggle: (pid: number) => void;
    onDetail?: (pid: number, name: string) => void;
  };
}

const Row = ({ index, style, data }: RowProps) => {
  const p = data.processes[index];
  const isSel = data.selected.has(p.pid);
  const odd = index % 2 === 0;

  const handleClick = useCallback(() => {
    if (!p.is_system && !p.is_protected) data.onToggle(p.pid);
  }, [p, data]);

  const handleDetail = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    data.onDetail?.(p.pid, p.name);
  }, [p, data]);

  return (
    <div
      style={style}
      onClick={handleClick}
      className={clsx(
        "row-hover flex items-center px-3 text-sm transition-colors select-none",
        (p.is_system || p.is_protected) && "cursor-not-allowed",
        !(p.is_system || p.is_protected) && "cursor-pointer",
        p.is_system && ["bg-sys-bg/40 dark:bg-sys-bg-dark/60", "text-sys dark:text-sys-fg-dark"],
        p.is_protected && !p.is_system && ["bg-emerald-50/60 dark:bg-emerald-900/20", "text-emerald-700 dark:text-emerald-400"],
        !p.is_system && !p.is_protected && p.safe_kill && ["bg-rec-bg/40 dark:bg-rec-bg-dark/40", "text-rec dark:text-rec-fg-dark"],
        !p.is_system && !p.is_protected && !p.safe_kill && [
          odd ? "bg-white dark:bg-surface-dark" : "bg-slate-50/60 dark:bg-surface-dark-alt/30",
          "text-slate-700 dark:text-slate-200",
        ],
        isSel && "!bg-brand-50 dark:!bg-brand-600/20 ring-1 ring-inset ring-brand-500/40",
      )}
    >
      {/* 체크박스 */}
      <div className="w-9 flex items-center justify-center">
        {p.is_system ? (
          <Ban className="w-3.5 h-3.5 opacity-60" />
        ) : p.is_protected ? (
          <Shield className="w-3.5 h-3.5 text-emerald-500 opacity-80" />
        ) : (
          <div className={clsx(
            "w-4 h-4 rounded border-2 flex items-center justify-center transition-all",
            isSel ? "bg-brand-600 border-brand-600" : "border-slate-400 dark:border-slate-500"
          )}>
            {isSel && (
              <svg viewBox="0 0 16 16" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M3 8l3.5 3.5L13 5" />
              </svg>
            )}
          </div>
        )}
      </div>

      {/* 프로세스명 + 상세 버튼 */}
      <div className="flex-1 min-w-0 flex items-center gap-1 group/name">
        <span className="truncate font-medium" title={p.name}>{p.name}</span>
        {data.onDetail && (
          <button
            onClick={handleDetail}
            className="opacity-0 group-hover/name:opacity-60 hover:!opacity-100 transition-opacity flex-shrink-0 text-slate-400 hover:text-brand-500"
            title="프로세스 상세 보기"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* PID */}
      <div className="w-16 text-right font-mono text-xs opacity-75">{p.pid}</div>

      {/* CPU */}
      <div className="w-16 text-right font-mono text-xs tabular-nums">
        {p.cpu_percent > 0 ? `${p.cpu_percent.toFixed(1)}%` : "—"}
      </div>

      {/* 메모리 */}
      <div className="w-24 text-right font-mono font-semibold tabular-nums text-xs">
        {p.mem_mb < 1024 ? `${p.mem_mb.toFixed(1)} MB` : `${(p.mem_mb / 1024).toFixed(2)} GB`}
      </div>

      {/* 분류 */}
      <div className="w-20 flex justify-center">
        <span className={clsx(
          "chip",
          p.is_system && "chip-sys",
          p.is_protected && !p.is_system && "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400",
          !p.is_system && !p.is_protected && p.safe_kill && "chip-rec",
          !p.is_system && !p.is_protected && !p.safe_kill && "chip-nor",
        )}>
          {p.is_system ? "시스템" : p.is_protected ? "보호됨" : p.safe_kill ? "추천" : "일반"}
        </span>
      </div>
    </div>
  );
};

// ── 정렬 헤더 셀 ──────────────────────────────────────────────────────────

function SortHeader({
  label, sortKey, current, dir, onSort, className,
}: {
  label: string; sortKey: SortKey; current: SortKey; dir: SortDir;
  onSort: (k: SortKey) => void; className?: string;
}) {
  const active = current === sortKey;
  const Icon = !active ? ChevronsUpDown : dir === "asc" ? ChevronUp : ChevronDown;
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={clsx(
        "flex items-center gap-0.5 hover:text-brand-600 transition-colors",
        active && "text-brand-600",
        className
      )}
    >
      {label}
      <Icon className="w-3 h-3 opacity-70" />
    </button>
  );
}

// ── ProcessTable ──────────────────────────────────────────────────────────

export function ProcessTable({ processes, selected, onToggle, onDetail, loading, error }: Props) {
  const listRef = useRef<List>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(400);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("mem_bytes");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // 리스트 컨테이너 높이를 직접 측정
  useEffect(() => {
    const el = listContainerRef.current;
    if (!el) return;
    const measure = () => setListHeight(el.clientHeight);
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const filtered = useMemo(() => {
    let list = search
      ? processes.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
      : processes;

    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "pid") cmp = a.pid - b.pid;
      else if (sortKey === "mem_bytes") cmp = a.mem_bytes - b.mem_bytes;
      else if (sortKey === "cpu_percent") cmp = a.cpu_percent - b.cpu_percent;
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [processes, search, sortKey, sortDir]);

  const itemData = useMemo(
    () => ({ processes: filtered, selected, onToggle, onDetail }),
    [filtered, selected, onToggle, onDetail]
  );

  return (
    <div className="card overflow-hidden flex flex-col h-full">
      {/* 검색 */}
      <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="프로세스 검색…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >✕</button>
          )}
        </div>
      </div>

      {/* 컬럼 헤더 */}
      <div className="flex items-center px-3 py-2 bg-slate-100/70 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
        <div className="w-9 text-center">✓</div>
        <SortHeader label="프로세스명" sortKey="name"        current={sortKey} dir={sortDir} onSort={handleSort} className="flex-1" />
        <SortHeader label="PID"        sortKey="pid"         current={sortKey} dir={sortDir} onSort={handleSort} className="w-16 justify-end" />
        <SortHeader label="CPU"        sortKey="cpu_percent" current={sortKey} dir={sortDir} onSort={handleSort} className="w-16 justify-end" />
        <SortHeader label="메모리"      sortKey="mem_bytes"   current={sortKey} dir={sortDir} onSort={handleSort} className="w-24 justify-end" />
        <div className="w-20 text-center">분류</div>
      </div>

      {/* 목록 */}
      <div className="flex-1 min-h-0" ref={listContainerRef}>
        {error ? (
          <div className="p-8 text-center text-red-500 text-sm space-y-1">
            <div className="font-semibold">불러오기 실패</div>
            <div className="text-xs font-mono opacity-80 break-all">{error}</div>
          </div>
        ) : loading && filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">프로세스 목록을 불러오는 중…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            {search ? `"${search}" 검색 결과 없음` : "표시할 프로세스가 없습니다."}
          </div>
        ) : (
          <List
            ref={listRef}
            height={listHeight || 400}
            width="100%"
            itemCount={filtered.length}
            itemSize={ROW_HEIGHT}
            itemData={itemData}
            overscanCount={6}
            className="!overflow-y-auto"
          >
            {Row}
          </List>
        )}
      </div>
    </div>
  );
}
