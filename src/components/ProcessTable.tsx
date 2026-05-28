import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FixedSizeList as List } from "react-window";
import {
  Ban, ChevronDown, ChevronUp, ChevronsUpDown,
  Info, Layers, Search, Shield,
} from "lucide-react";
import clsx from "clsx";
import type { ProcessInfo } from "../lib/types";

const ROW_HEIGHT = 36;

type SortKey = "name" | "pid" | "mem_bytes" | "cpu_percent";
type SortDir = "asc" | "desc";

// ── 표시 행 타입 (단일/그룹 통합) ────────────────────────────────────────────

interface DisplayRow {
  key: string;
  name: string;
  pids: number[];       // 단일: [pid], 그룹: [pid1, pid2, ...]
  mem_mb: number;       // 그룹: 합산
  mem_bytes: number;    // 그룹: 합산
  cpu_percent: number;  // 그룹: 합산
  is_system: boolean;
  safe_kill: boolean;
  is_protected: boolean;
  count: number;        // 단일: 1
}

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  processes: ProcessInfo[];
  selected: Set<number>;
  onToggle: (pids: number[]) => void;
  onDetail?: (pid: number, name: string) => void;
  loading?: boolean;
  error?: string | null;
}

// ── 행 컴포넌트 ───────────────────────────────────────────────────────────────

interface RowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    rows: DisplayRow[];
    selected: Set<number>;
    onToggle: (pids: number[]) => void;
    onDetail?: (pid: number, name: string) => void;
  };
}

const Row = ({ index, style, data }: RowProps) => {
  const row = data.rows[index];
  const odd = index % 2 === 0;

  // 선택 상태: all / some / none
  const selectedCount = row.pids.filter(p => data.selected.has(p)).length;
  const isAll  = selectedCount === row.pids.length;
  const isSome = selectedCount > 0 && !isAll;

  const canSelect = !row.is_system && !row.is_protected;

  const handleClick = useCallback(() => {
    if (canSelect) data.onToggle(row.pids);
  }, [row, data, canSelect]);

  const handleDetail = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (row.count === 1) data.onDetail?.(row.pids[0], row.name);
  }, [row, data]);

  return (
    <div
      style={style}
      onClick={handleClick}
      className={clsx(
        "row-hover flex items-center px-3 text-sm transition-colors select-none",
        !canSelect && "cursor-not-allowed",
        canSelect  && "cursor-pointer",
        row.is_system && ["bg-sys-bg/40 dark:bg-sys-bg-dark/60", "text-sys dark:text-sys-fg-dark"],
        row.is_protected && !row.is_system && ["bg-emerald-50/60 dark:bg-emerald-900/20", "text-emerald-700 dark:text-emerald-400"],
        !row.is_system && !row.is_protected && row.safe_kill && ["bg-rec-bg/40 dark:bg-rec-bg-dark/40", "text-rec dark:text-rec-fg-dark"],
        !row.is_system && !row.is_protected && !row.safe_kill && [
          odd ? "bg-white dark:bg-surface-dark" : "bg-slate-50/60 dark:bg-surface-dark-alt/30",
          "text-slate-700 dark:text-slate-200",
        ],
        isAll  && "!bg-brand-50 dark:!bg-brand-600/20 ring-1 ring-inset ring-brand-500/40",
        isSome && "!bg-brand-50/60 dark:!bg-brand-600/10",
      )}
    >
      {/* 체크박스 */}
      <div className="w-9 flex items-center justify-center">
        {row.is_system ? (
          <Ban className="w-3.5 h-3.5 opacity-60" />
        ) : row.is_protected ? (
          <Shield className="w-3.5 h-3.5 text-emerald-500 opacity-80" />
        ) : (
          <div className={clsx(
            "w-4 h-4 rounded border-2 flex items-center justify-center transition-all",
            isAll  ? "bg-brand-600 border-brand-600" :
            isSome ? "bg-brand-300 border-brand-400" :
                     "border-slate-400 dark:border-slate-500"
          )}>
            {isAll && (
              <svg viewBox="0 0 16 16" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M3 8l3.5 3.5L13 5" />
              </svg>
            )}
            {isSome && <div className="w-2 h-0.5 bg-white rounded-full" />}
          </div>
        )}
      </div>

      {/* 프로세스명 */}
      <div className="flex-1 min-w-0 flex items-center gap-1.5 group/name">
        <span className="truncate font-medium" title={row.name}>{row.name}</span>
        {/* 그룹 배지 */}
        {row.count > 1 && (
          <span className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400">
            ×{row.count}
          </span>
        )}
        {/* 상세 버튼 (단일 프로세스일 때만) */}
        {data.onDetail && row.count === 1 && (
          <button
            onClick={handleDetail}
            className="opacity-0 group-hover/name:opacity-60 hover:!opacity-100 transition-opacity flex-shrink-0 text-slate-400 hover:text-brand-500"
            title="프로세스 상세 보기"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* PID (그룹이면 "—") */}
      <div className="w-16 text-right font-mono text-xs opacity-75">
        {row.count === 1 ? row.pids[0] : "—"}
      </div>

      {/* CPU */}
      <div className="w-16 text-right font-mono text-xs tabular-nums">
        {row.cpu_percent > 0 ? `${row.cpu_percent.toFixed(1)}%` : "—"}
      </div>

      {/* 메모리 */}
      <div className="w-24 text-right font-mono font-semibold tabular-nums text-xs">
        {row.mem_mb < 1024 ? `${row.mem_mb.toFixed(1)} MB` : `${(row.mem_mb / 1024).toFixed(2)} GB`}
      </div>

      {/* 분류 */}
      <div className="w-20 flex justify-center">
        <span className={clsx(
          "chip",
          row.is_system && "chip-sys",
          row.is_protected && !row.is_system && "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400",
          !row.is_system && !row.is_protected && row.safe_kill && "chip-rec",
          !row.is_system && !row.is_protected && !row.safe_kill && "chip-nor",
        )}>
          {row.is_system ? "시스템" : row.is_protected ? "보호됨" : row.safe_kill ? "추천" : "일반"}
        </span>
      </div>
    </div>
  );
};

// ── 정렬 헤더 ────────────────────────────────────────────────────────────────

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

// ── ProcessTable ──────────────────────────────────────────────────────────────

export function ProcessTable({ processes, selected, onToggle, onDetail, loading, error }: Props) {
  const listRef = useRef<List>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(400);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("mem_bytes");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [isGrouped, setIsGrouped] = useState(false);

  // 리스트 컨테이너 높이 측정
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
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir(key === "name" ? "asc" : "desc"); }
  };

  // ── 검색 + 정렬된 원본 목록 ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = search
      ? processes.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
      : processes;

    list = [...list].sort((a, b) => {
      let cmp = 0;
      if      (sortKey === "name")        cmp = a.name.localeCompare(b.name);
      else if (sortKey === "pid")         cmp = a.pid - b.pid;
      else if (sortKey === "mem_bytes")   cmp = a.mem_bytes - b.mem_bytes;
      else if (sortKey === "cpu_percent") cmp = a.cpu_percent - b.cpu_percent;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [processes, search, sortKey, sortDir]);

  // ── 그룹화된 표시 목록 ───────────────────────────────────────────────────
  const displayRows = useMemo((): DisplayRow[] => {
    if (!isGrouped) {
      return filtered.map(p => ({
        key:         String(p.pid),
        name:        p.name,
        pids:        [p.pid],
        mem_mb:      p.mem_mb,
        mem_bytes:   p.mem_bytes,
        cpu_percent: p.cpu_percent,
        is_system:   p.is_system,
        safe_kill:   p.safe_kill,
        is_protected: p.is_protected,
        count: 1,
      }));
    }

    // 이름 기준 그룹화 (filtered는 이미 정렬됨)
    const map = new Map<string, DisplayRow>();
    for (const p of filtered) {
      const key = p.name.toLowerCase();
      if (map.has(key)) {
        const g = map.get(key)!;
        g.pids.push(p.pid);
        g.mem_mb      += p.mem_mb;
        g.mem_bytes   += p.mem_bytes;
        g.cpu_percent += p.cpu_percent;
        g.count++;
        if (p.safe_kill) g.safe_kill = true;
      } else {
        map.set(key, {
          key:          p.name,
          name:         p.name,
          pids:         [p.pid],
          mem_mb:       p.mem_mb,
          mem_bytes:    p.mem_bytes,
          cpu_percent:  p.cpu_percent,
          is_system:    p.is_system,
          safe_kill:    p.safe_kill,
          is_protected: p.is_protected,
          count: 1,
        });
      }
    }

    // 그룹 재정렬
    return [...map.values()].sort((a, b) => {
      let cmp = 0;
      if      (sortKey === "name")        cmp = a.name.localeCompare(b.name);
      else if (sortKey === "cpu_percent") cmp = a.cpu_percent - b.cpu_percent;
      else                                cmp = a.mem_bytes - b.mem_bytes;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, isGrouped, sortKey, sortDir]);

  const itemData = useMemo(
    () => ({ rows: displayRows, selected, onToggle, onDetail }),
    [displayRows, selected, onToggle, onDetail]
  );

  return (
    <div className="card overflow-hidden flex flex-col h-full">
      {/* 검색 + 그룹화 토글 */}
      <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <div className="relative flex-1">
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

        {/* 그룹화 토글 */}
        <button
          onClick={() => setIsGrouped(v => !v)}
          title={isGrouped ? "그룹화 해제" : "같은 이름 프로세스 그룹화"}
          className={clsx(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors",
            isGrouped
              ? "bg-brand-600 border-brand-600 text-white"
              : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-brand-600"
          )}
        >
          <Layers className="w-3.5 h-3.5" />
          그룹화
        </button>
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
        ) : loading && displayRows.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">프로세스 목록을 불러오는 중…</div>
        ) : displayRows.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            {search ? `"${search}" 검색 결과 없음` : "표시할 프로세스가 없습니다."}
          </div>
        ) : (
          <List
            ref={listRef}
            height={listHeight || 400}
            width="100%"
            itemCount={displayRows.length}
            itemSize={ROW_HEIGHT}
            itemData={itemData}
            overscanCount={6}
            className="!overflow-y-auto"
          >
            {Row}
          </List>
        )}
      </div>

      {/* 그룹화 상태 표시 */}
      {isGrouped && (
        <div className="px-3 py-1.5 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-400 flex items-center gap-1.5">
          <Layers className="w-3 h-3" />
          그룹화 ON — {filtered.length}개 프로세스 → {displayRows.length}개 그룹
        </div>
      )}
    </div>
  );
}
