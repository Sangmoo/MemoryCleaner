import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FixedSizeList as List } from "react-window";
import {
  Ban, ChevronDown, ChevronUp, ChevronsUpDown,
  Info, Layers, Search, Shield, TrendingUp, ShieldPlus, GaugeCircle,
  GitBranch, Zap,
} from "lucide-react";
import clsx from "clsx";
import type { ProcessInfo, KillPreset } from "../lib/types";
import { api } from "../lib/api";
import { toast } from "../lib/toast";
import { useT } from "../lib/i18n";

// ── 메모리 누수 감지 ────────────────────────────────────────────────────────
// PID별 최근 메모리 측정값 추적 → 지속적 증가 시 누수 의심

const LEAK_HISTORY_SIZE = 12;     // 최근 12개 측정 (10초 간격이면 약 2분)
const LEAK_MIN_SAMPLES  = 8;      // 최소 8개 있어야 판정
const LEAK_GROW_RATIO   = 1.25;   // 후반 평균이 전반의 1.25배 이상
const LEAK_MIN_GROW_MB  = 30;     // 최소 30MB 이상 증가

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
  leaking: boolean;     // 메모리 누수 의심
  // 트리뷰 (기능 #11)
  depth?: number;       // 들여쓰기 깊이 (0 = root)
  hasChildren?: boolean;
  expanded?: boolean;
}

// ── 컨텍스트 메뉴 ────────────────────────────────────────────────────────────

interface ContextMenuState {
  x: number;
  y: number;
  row: DisplayRow;
}

function ContextMenu({
  state, onClose, onProtect,
}: {
  state: ContextMenuState;
  onClose: () => void;
  onProtect: (name: string) => void;
}) {
  const t = useT();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const setPriority = async (level: "idle" | "below_normal" | "normal") => {
    onClose();
    const pids = state.row.pids;
    let ok = 0; let fail = 0;
    for (const pid of pids) {
      try { await api.setProcessPriority(pid, level); ok++; }
      catch { fail++; }
    }
    const label = level === "normal"
      ? t("contextMenu.priorityNormalLabel")
      : level === "idle"
        ? t("contextMenu.priorityIdleLabel")
        : t("contextMenu.priorityLowLabel");
    if (fail === 0) {
      toast.success(t("contextMenu.priorityDone", label, ok), t("contextMenu.priorityTitle"));
    } else {
      toast.warning(t("contextMenu.priorityPartial", label, ok, fail), t("contextMenu.priorityTitle"));
    }
  };

  const menuItems: Array<{ icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }> = [
    {
      icon: <ShieldPlus className="w-3.5 h-3.5 text-emerald-500" />,
      label: t("contextMenu.protect"),
      onClick: () => { onClose(); onProtect(state.row.name); },
    },
    {
      icon: <GaugeCircle className="w-3.5 h-3.5 text-amber-500" />,
      label: t("contextMenu.priorityLow"),
      onClick: () => setPriority("below_normal"),
    },
    {
      icon: <GaugeCircle className="w-3.5 h-3.5 text-red-400" />,
      label: t("contextMenu.priorityIdle"),
      onClick: () => setPriority("idle"),
    },
    {
      icon: <GaugeCircle className="w-3.5 h-3.5 text-slate-400" />,
      label: t("contextMenu.priorityNormal"),
      onClick: () => setPriority("normal"),
    },
  ];

  return createPortal(
    <div
      ref={menuRef}
      style={{ position: "fixed", top: state.y, left: state.x, zIndex: 9999 }}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-1 min-w-[180px] animate-fade-in"
    >
      <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 border-b border-slate-100 dark:border-slate-700 truncate">
        {state.row.name}
        {state.row.count > 1 && ` (×${state.row.count})`}
      </div>
      {menuItems.map((item) => (
        <button
          key={item.label}
          onClick={item.onClick}
          className={clsx(
            "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-200",
            "hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left",
            item.danger && "text-red-600 dark:text-red-400"
          )}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>,
    document.body
  );
}

// ── 스파크라인 (기능 #8) ────────────────────────────────────────────────

function Sparkline({ data }: { data: number[] }) {
  if (!data || data.length < 2) return null;
  const w = 24;
  const h = 14;
  const max = Math.max(...data, 1);
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - (v / max) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const last = data[data.length - 1];
  const color = last < 30 ? "#10b981" : last < 70 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={w} height={h} className="inline-block ml-1 align-middle" aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  processes: ProcessInfo[];
  selected: Set<number>;
  onToggle: (pids: number[]) => void;
  onDetail?: (pid: number, name: string) => void;
  onProtect?: (name: string) => void;
  loading?: boolean;
  error?: string | null;
  cpuHistory?: Map<number, number[]>;
  killPresets?: KillPreset[];
  onSelectPids?: (pids: number[]) => void;
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
    onContextMenu?: (x: number, y: number, row: DisplayRow) => void;
    cpuHistory?: Map<number, number[]>;
    onToggleExpand?: (key: string) => void;
  };
}

const Row = ({ index, style, data }: RowProps) => {
  const t = useT();
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

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (row.is_system) return;
    e.preventDefault();
    data.onContextMenu?.(e.clientX, e.clientY, row);
  }, [row, data]);

  return (
    <div
      style={style}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
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
      <div className="flex-1 min-w-0 flex items-center gap-1.5 group/name" style={{ paddingLeft: (row.depth ?? 0) * 16 }}>
        {row.hasChildren ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); data.onToggleExpand?.(row.key); }}
            className="flex-shrink-0 text-slate-400 hover:text-brand-500"
            title={row.expanded ? t("process.collapseTree") : t("process.expandTree")}
          >
            {row.expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3 rotate-90" />}
          </button>
        ) : (row.depth ?? 0) > 0 ? (
          <span className="flex-shrink-0 w-3 inline-block" />
        ) : null}
        <span className="truncate font-medium" title={row.name}>{row.name}</span>
        {/* 누수 의심 배지 */}
        {row.leaking && (
          <span
            title={t("process.leakTooltip")}
            className="flex-shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
          >
            <TrendingUp className="w-2.5 h-2.5" />
            {t("process.leak")}
          </span>
        )}
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
            title={t("process.detailTooltip")}
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* PID (그룹이면 "—") */}
      <div className="w-16 text-right font-mono text-xs opacity-75">
        {row.count === 1 ? row.pids[0] : "—"}
      </div>

      {/* CPU + 스파크라인 (기능 #8) */}
      <div className="w-24 text-right font-mono text-xs tabular-nums flex items-center justify-end gap-0.5">
        <span>{row.cpu_percent > 0 ? `${row.cpu_percent.toFixed(1)}%` : "—"}</span>
        {row.count === 1 && data.cpuHistory && (
          <Sparkline data={data.cpuHistory.get(row.pids[0]) ?? []} />
        )}
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
          {row.is_system ? t("process.typeSystem") : row.is_protected ? t("process.typeProtected") : row.safe_kill ? t("process.typeRecommended") : t("process.typeNormal")}
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

export function ProcessTable({
  processes, selected, onToggle, onDetail, onProtect, loading, error,
  cpuHistory, killPresets, onSelectPids,
}: Props) {
  const t = useT();
  const listRef = useRef<List>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(400);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("mem_bytes");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [isGrouped, setIsGrouped] = useState(false);
  const [isTree, setIsTree] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [showPresets, setShowPresets] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // 트리와 그룹화는 동시에 불가
  const enableGroup = () => { setIsGrouped(v => !v); if (!isGrouped) setIsTree(false); };
  const enableTree = () => { setIsTree(v => !v); if (!isTree) setIsGrouped(false); };

  const toggleExpand = useCallback((key: string) => {
    setExpandedKeys(prev => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  }, []);

  // ── 스크롤 위치 유지 ──────────────────────────────────────────────────
  const scrollOffsetRef = useRef(0);
  const handleScroll = useCallback(({ scrollOffset }: { scrollOffset: number }) => {
    scrollOffsetRef.current = scrollOffset;
  }, []);

  useLayoutEffect(() => {
    // processes가 갱신될 때 스크롤 위치 복원
    if (listRef.current && scrollOffsetRef.current > 0) {
      listRef.current.scrollTo(scrollOffsetRef.current);
    }
  }, [processes]);

  // ── 메모리 누수 감지 ──────────────────────────────────────────────────
  const memHistoryByPid = useRef<Map<number, number[]>>(new Map());
  const leakingPids = useRef<Set<number>>(new Set());

  useEffect(() => {
    const history = memHistoryByPid.current;
    const currentPids = new Set(processes.map(p => p.pid));

    // 종료된 PID 제거
    for (const pid of Array.from(history.keys())) {
      if (!currentPids.has(pid)) {
        history.delete(pid);
        leakingPids.current.delete(pid);
      }
    }

    // 새 측정값 추가 및 누수 판정
    const newLeaks = new Set<number>();
    for (const p of processes) {
      const arr = history.get(p.pid) ?? [];
      arr.push(p.mem_bytes);
      if (arr.length > LEAK_HISTORY_SIZE) arr.shift();
      history.set(p.pid, arr);

      if (arr.length >= LEAK_MIN_SAMPLES) {
        const half = Math.floor(arr.length / 2);
        const firstAvg = arr.slice(0, half).reduce((s, v) => s + v, 0) / half;
        const lastAvg  = arr.slice(half).reduce((s, v) => s + v, 0) / (arr.length - half);
        const growBytes = lastAvg - firstAvg;
        const growMb = growBytes / (1024 * 1024);
        const monoIncrease = arr.slice(-LEAK_MIN_SAMPLES).every((v, i, a) => i === 0 || v >= a[i - 1] * 0.98);

        if (
          lastAvg > firstAvg * LEAK_GROW_RATIO &&
          growMb > LEAK_MIN_GROW_MB &&
          monoIncrease
        ) {
          newLeaks.add(p.pid);
        }
      }
    }
    leakingPids.current = newLeaks;
  }, [processes]);

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
    const leaks = leakingPids.current;

    // ── 트리 뷰 (기능 #11) ──────────────────────────────────────────────
    if (isTree) {
      // 부모-자식 인덱스 구축 (전체 processes 기준)
      const byPid = new Map<number, ProcessInfo>();
      for (const p of processes) byPid.set(p.pid, p);
      const childrenByParent = new Map<number, ProcessInfo[]>();
      for (const p of processes) {
        if (p.parent_pid != null && byPid.has(p.parent_pid)) {
          if (!childrenByParent.has(p.parent_pid)) childrenByParent.set(p.parent_pid, []);
          childrenByParent.get(p.parent_pid)!.push(p);
        }
      }
      // root: parent_pid가 없거나 부모가 목록에 없는 프로세스
      const rootSet = new Set<number>();
      for (const p of filtered) {
        if (p.parent_pid == null || !byPid.has(p.parent_pid)) {
          rootSet.add(p.pid);
        } else {
          // 검색 결과 → 매칭된 자식의 부모도 root에 포함
          if (search) {
            let cur: ProcessInfo | undefined = p;
            while (cur && cur.parent_pid != null && byPid.has(cur.parent_pid)) {
              cur = byPid.get(cur.parent_pid);
            }
            if (cur) rootSet.add(cur.pid);
          }
        }
      }

      const roots = Array.from(rootSet)
        .map(pid => byPid.get(pid)!)
        .filter(Boolean)
        .sort((a, b) => {
          let cmp = 0;
          if      (sortKey === "name")        cmp = a.name.localeCompare(b.name);
          else if (sortKey === "pid")         cmp = a.pid - b.pid;
          else if (sortKey === "mem_bytes")   cmp = a.mem_bytes - b.mem_bytes;
          else if (sortKey === "cpu_percent") cmp = a.cpu_percent - b.cpu_percent;
          return sortDir === "asc" ? cmp : -cmp;
        });

      const rows: DisplayRow[] = [];
      const pushRow = (p: ProcessInfo, depth: number) => {
        const children = childrenByParent.get(p.pid) ?? [];
        const key = String(p.pid);
        const expanded = expandedKeys.has(key);
        rows.push({
          key, name: p.name, pids: [p.pid],
          mem_mb: p.mem_mb, mem_bytes: p.mem_bytes,
          cpu_percent: p.cpu_percent,
          is_system: p.is_system, safe_kill: p.safe_kill, is_protected: p.is_protected,
          count: 1, leaking: leaks.has(p.pid),
          depth, hasChildren: children.length > 0, expanded,
        });
        if (expanded && depth < 1) {
          // 최대 2단계 (depth 0과 1)
          for (const c of children) pushRow(c, depth + 1);
        }
      };
      for (const r of roots) pushRow(r, 0);
      return rows;
    }

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
        leaking: leaks.has(p.pid),
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
        if (leaks.has(p.pid)) g.leaking = true;
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
          leaking: leaks.has(p.pid),
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
  }, [filtered, isGrouped, sortKey, sortDir, isTree, expandedKeys, processes, search]);

  const handleContextMenu = useCallback((x: number, y: number, row: DisplayRow) => {
    setContextMenu({ x, y, row });
  }, []);

  const itemData = useMemo(
    () => ({
      rows: displayRows, selected, onToggle, onDetail,
      onContextMenu: handleContextMenu,
      cpuHistory, onToggleExpand: toggleExpand,
    }),
    [displayRows, selected, onToggle, onDetail, handleContextMenu, cpuHistory, toggleExpand]
  );

  // ── 프리셋 적용 (기능 #7) ────────────────────────────────────────────
  const applyPreset = (preset: KillPreset) => {
    setShowPresets(false);
    const lowerNames = preset.processes.map(n => n.toLowerCase());
    const matchPids = processes
      .filter(p => lowerNames.includes(p.name.toLowerCase()) && !p.is_system && !p.is_protected)
      .map(p => p.pid);
    if (matchPids.length === 0) {
      toast.info(t("process.noMatchPreset"), preset.name);
      return;
    }
    onSelectPids?.(matchPids);
    toast.success(t("process.presetSelected", matchPids.length), `${preset.icon} ${preset.name}`);
  };

  return (
    <div className="card overflow-hidden flex flex-col h-full">
      {/* 검색 + 그룹화 토글 */}
      <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder={t("process.searchPlaceholder")}
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
          onClick={enableGroup}
          title={isGrouped ? t("process.groupOn") : t("process.groupOff")}
          disabled={isTree}
          className={clsx(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
            isGrouped
              ? "bg-brand-600 border-brand-600 text-white"
              : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-brand-600"
          )}
        >
          <Layers className="w-3.5 h-3.5" />
          {t("process.group")}
        </button>

        {/* 트리 토글 (기능 #11) */}
        <button
          onClick={enableTree}
          title={isTree ? t("process.treeOn") : t("process.treeOff")}
          disabled={isGrouped}
          className={clsx(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
            isTree
              ? "bg-brand-600 border-brand-600 text-white"
              : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-brand-600"
          )}
        >
          <GitBranch className="w-3.5 h-3.5" />
          {t("process.tree")}
        </button>

        {/* 프리셋 드롭다운 (기능 #7) */}
        {killPresets && killPresets.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowPresets(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-brand-600 transition-colors"
              title={t("process.presetsTitle")}
            >
              <Zap className="w-3.5 h-3.5" />
              {t("process.presets")}
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>
            {showPresets && (
              <>
                <div className="fixed inset-0 z-[40]" onClick={() => setShowPresets(false)} />
                <div className="absolute right-0 top-full mt-1 z-[50] min-w-[200px] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-1 animate-fade-in">
                  {killPresets.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => applyPreset(preset)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left"
                    >
                      <span className="text-base">{preset.icon}</span>
                      <span className="flex-1">{preset.name}</span>
                      <span className="text-[10px] text-slate-400">{preset.processes.length}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 컬럼 헤더 */}
      <div className="flex items-center px-3 py-2 bg-slate-100/70 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
        <div className="w-9 text-center">✓</div>
        <SortHeader label={t("process.name")}   sortKey="name"        current={sortKey} dir={sortDir} onSort={handleSort} className="flex-1" />
        <SortHeader label="PID"                  sortKey="pid"         current={sortKey} dir={sortDir} onSort={handleSort} className="w-16 justify-end" />
        <SortHeader label="CPU"                  sortKey="cpu_percent" current={sortKey} dir={sortDir} onSort={handleSort} className="w-24 justify-end" />
        <SortHeader label={t("process.memory")} sortKey="mem_bytes"   current={sortKey} dir={sortDir} onSort={handleSort} className="w-24 justify-end" />
        <div className="w-20 text-center">{t("process.colClass")}</div>
      </div>

      {/* 목록 */}
      <div className="flex-1 min-h-0" ref={listContainerRef}>
        {error ? (
          <div className="p-8 text-center text-red-500 text-sm space-y-1">
            <div className="font-semibold">{t("process.loadFail")}</div>
            <div className="text-xs font-mono opacity-80 break-all">{error}</div>
          </div>
        ) : loading && displayRows.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">{t("process.loadingList")}</div>
        ) : displayRows.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            {search ? t("process.noResult", search) : t("process.empty")}
          </div>
        ) : (
          <List
            ref={listRef}
            height={listHeight || 400}
            width="100%"
            itemCount={displayRows.length}
            itemSize={ROW_HEIGHT}
            itemData={itemData}
            itemKey={(idx, data) => data.rows[idx].key}
            onScroll={handleScroll}
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
          {t("process.groupStatus", filtered.length, displayRows.length)}
        </div>
      )}

      {/* 우클릭 컨텍스트 메뉴 */}
      {contextMenu && (
        <ContextMenu
          state={contextMenu}
          onClose={() => setContextMenu(null)}
          onProtect={(name) => { onProtect?.(name); setContextMenu(null); }}
        />
      )}
    </div>
  );
}
