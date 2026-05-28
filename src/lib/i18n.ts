import { createContext, useContext } from "react";

export type Locale = "ko" | "en" | "ja";

const translations: Record<Locale, Record<string, string>> = {
  ko: {
    // app
    "app.subtitle": "Windows 메모리 관리",
    "app.autoOnBadge": "자동 ON",

    // header
    "header.quickClean": "Quick Clean",
    "header.disk": "디스크 정리",
    "header.settings": "설정",
    "header.light": "라이트 모드",
    "header.dark": "다크 모드",
    "header.shortcuts": "단축키",
    "header.about": "정보",

    // tabs
    "tabs.process": "프로세스",
    "tabs.history": "히스토리",
    "tabs.insights": "인사이트",
    "tabs.startup": "시작 프로그램",

    // toolbar
    "toolbar.refresh": "새로고침",
    "toolbar.all": "전체 선택",
    "toolbar.recommended": "추천만 선택",
    "toolbar.deselect": "선택 해제",

    // footer
    "footer.flushAll": "전체 RAM 플러시",
    "footer.compress": "워킹셋 압축",
    "footer.kill": "{0}개 종료",
    "footer.killing": "종료 중…",
    "footer.compressing": "압축 중…",

    // process
    "process.name": "프로세스명",
    "process.memory": "메모리",
    "process.cpu": "CPU",
    "process.leak": "누수?",

    // contextMenu
    "contextMenu.protect": "보호 목록에 추가",
    "contextMenu.priorityLow": "CPU 우선순위 낮춤",
    "contextMenu.priorityIdle": "CPU 우선순위 유휴",
    "contextMenu.priorityNormal": "CPU 우선순위 정상화",
    "contextMenu.detail": "프로세스 상세 보기",

    // history
    "history.title": "종료 히스토리",
    "history.clear": "전체 삭제",
    "history.csv": "CSV",
    "history.empty": "히스토리가 없습니다.",
    "history.manual": "수동",
    "history.auto": "자동",
    "history.success": "성공",
    "history.failed": "실패",

    // insights
    "insights.title": "인사이트",
    "insights.refresh": "새로고침",
    "insights.totalKill": "총 종료",
    "insights.totalMem": "총 확보",
    "insights.todayKill": "오늘 종료",
    "insights.autoClean": "자동 정리",
    "insights.top5": "Top 5 프로세스",
    "insights.weekly": "7일 추이",
    "insights.ramHistory": "24시간 RAM 추이",
    "insights.sysInfo": "시스템 정보",
    "insights.noData": "데이터 없음",

    // settings
    "settings.title": "설정",
    "settings.save": "저장",
    "settings.saving": "저장 중…",
    "settings.cancel": "취소",
    "settings.import": "가져오기",
    "settings.export": "내보내기",
    "settings.appSettings": "앱 설정",
    "settings.autoRefresh": "프로세스 자동 새로고침 간격",
    "settings.autoStart": "Windows 시작 시 자동 실행",
    "settings.autoStartDesc": "로그인 시 트레이에서 자동으로 실행됩니다.",
    "settings.memWarn": "메모리 경고 알림",
    "settings.warnThreshold": "경고 임계값 (%)",
    "settings.autoClean": "자동 정리",
    "settings.enabled": "활성화",
    "settings.threshold": "임계값 (%)",
    "settings.interval": "간격 (초)",
    "settings.excludeTime": "제외 시간대",
    "settings.excludeDesc": "이 시간대에는 자동 정리를 수행하지 않습니다.",
    "settings.midnight": "자정 (0시)",
    "settings.presets": "프리셋",
    "settings.presetClick": "클릭하면 설정이 변경됩니다.",
    "settings.cpuSpike": "CPU 급등 감지",
    "settings.cpuSpikeDesc": "CPU 70% 이상 급등 시 알림을 표시합니다.",
    "settings.protected": "보호 프로세스",
    "settings.protectedDesc": "이 프로세스는 자동 정리에서 제외됩니다.",
    "settings.protectedPlaceholder": "프로세스명 (예: chrome.exe)",
    "settings.add": "추가",
    "settings.noProtected": "보호 프로세스 없음",
    "settings.scheduler": "스케줄 자동 정리",
    "settings.schedulerDesc": "지정한 시간에 자동으로 정리를 실행합니다.",
    "settings.addSchedule": "스케줄 추가",
    "settings.noSchedule": "등록된 스케줄 없음",
    "settings.skipIfRunning": "실행 중 정리 건너뜀",
    "settings.skipIfRunningDesc": "이 프로세스가 실행 중이면 자동 정리를 건너뜁니다.",
    "settings.language": "언어",

    // notifications
    "notifications.title": "알림 센터",
    "notifications.empty": "알림이 없습니다.",
    "notifications.clear": "모두 지우기",
    "notifications.all": "전체",
    "notifications.autoClean": "자동정리",
    "notifications.memWarn": "메모리",
    "notifications.cpuSpike": "CPU",
    "notifications.autoCleanTitle": "자동 정리 완료",
    "notifications.memWarnTitle": "메모리 경고",
    "notifications.cpuSpikeTitle": "CPU 급등",

    // about
    "about.desc": "Windows 메모리를 스마트하게 관리하는 오픈소스 데스크탑 앱입니다.",
    "about.close": "닫기",
    "about.sourceCode": "GitHub 소스코드",
    "about.download": "릴리스 다운로드",
    "about.techStack": "기술 스택",
    "about.license": "Made with Rust & React",

    // shortcuts
    "shortcuts.title": "단축키",
    "shortcuts.note": "앱 창이 활성화된 상태에서만 동작합니다.",
    "shortcuts.f5": "프로세스 목록 새로고침",
    "shortcuts.ctrlQ": "Quick Clean (추천 프로세스 자동 선택 후 종료)",
    "shortcuts.ctrlA": "전체 선택 / 해제 토글",
    "shortcuts.delete": "선택된 프로세스 종료",
    "shortcuts.esc": "선택 해제",
    "shortcuts.question": "단축키 도움말",

    // disk
    "disk.title": "디스크 정리",
    "disk.clean": "정리 시작",
    "disk.temp": "임시 파일 (TEMP/TMP)",
    "disk.chromecache": "Chrome 캐시",
    "disk.edgecache": "Microsoft Edge 캐시",
    "disk.wucache": "Windows Update 캐시",
    "disk.recycle": "휴지통 비우기",
    "disk.start": "정리 시작",
    "disk.success": "확보됨",
    "disk.close": "닫기",

    // startup
    "startup.title": "시작 프로그램",
    "startup.refresh": "새로고침",
    "startup.enable": "활성화",
    "startup.disable": "비활성화",
    "startup.noData": "시작 프로그램이 없습니다.",
    "startup.source": "소스",

    // tray
    "tray.open": "앱 열기",
    "tray.quickClean": "Quick Clean",
    "tray.flushRam": "전체 RAM 플러시",
    "tray.quit": "종료",

    // update
    "update.newVersion": "새 버전",
    "update.released": "이 출시되었습니다.",
    "update.download": "다운로드",

    // time
    "time.daysAgo": "{0}일 전",
    "time.hoursAgo": "{0}시간 전",
    "time.minsAgo": "{0}분 전",
    "time.justNow": "방금",
    "time.days": "일",
    "time.hours": "시간",
    "time.mins": "분",

    // common
    "common.noData": "데이터 없음",
    "common.loading": "불러오는 중…",
    "common.error": "오류",
    "common.ok": "확인",
    "common.cancel": "취소",
  },

  en: {
    // app
    "app.subtitle": "Windows Memory Manager",
    "app.autoOnBadge": "Auto ON",

    // header
    "header.quickClean": "Quick Clean",
    "header.disk": "Disk Cleanup",
    "header.settings": "Settings",
    "header.light": "Light Mode",
    "header.dark": "Dark Mode",
    "header.shortcuts": "Shortcuts",
    "header.about": "About",

    // tabs
    "tabs.process": "Processes",
    "tabs.history": "History",
    "tabs.insights": "Insights",
    "tabs.startup": "Startup",

    // toolbar
    "toolbar.refresh": "Refresh",
    "toolbar.all": "Select All",
    "toolbar.recommended": "Select Recommended",
    "toolbar.deselect": "Deselect",

    // footer
    "footer.flushAll": "Flush All RAM",
    "footer.compress": "Compress Working Set",
    "footer.kill": "Kill {0}",
    "footer.killing": "Killing…",
    "footer.compressing": "Compressing…",

    // process
    "process.name": "Process Name",
    "process.memory": "Memory",
    "process.cpu": "CPU",
    "process.leak": "Leak?",

    // contextMenu
    "contextMenu.protect": "Add to Protected List",
    "contextMenu.priorityLow": "Set Priority: Below Normal",
    "contextMenu.priorityIdle": "Set Priority: Idle",
    "contextMenu.priorityNormal": "Restore Normal Priority",
    "contextMenu.detail": "Process Details",

    // history
    "history.title": "Kill History",
    "history.clear": "Clear All",
    "history.csv": "CSV",
    "history.empty": "No history yet.",
    "history.manual": "Manual",
    "history.auto": "Auto",
    "history.success": "Success",
    "history.failed": "Failed",

    // insights
    "insights.title": "Insights",
    "insights.refresh": "Refresh",
    "insights.totalKill": "Total Killed",
    "insights.totalMem": "Total Freed",
    "insights.todayKill": "Today Killed",
    "insights.autoClean": "Auto Cleans",
    "insights.top5": "Top 5 Processes",
    "insights.weekly": "7-Day Trend",
    "insights.ramHistory": "24h RAM History",
    "insights.sysInfo": "System Info",
    "insights.noData": "No Data",

    // settings
    "settings.title": "Settings",
    "settings.save": "Save",
    "settings.saving": "Saving…",
    "settings.cancel": "Cancel",
    "settings.import": "Import",
    "settings.export": "Export",
    "settings.appSettings": "App Settings",
    "settings.autoRefresh": "Process Auto-Refresh Interval",
    "settings.autoStart": "Launch at Windows Startup",
    "settings.autoStartDesc": "Starts automatically in the tray at login.",
    "settings.memWarn": "Memory Warning Notification",
    "settings.warnThreshold": "Warning Threshold (%)",
    "settings.autoClean": "Auto Clean",
    "settings.enabled": "Enabled",
    "settings.threshold": "Threshold (%)",
    "settings.interval": "Interval (sec)",
    "settings.excludeTime": "Exclude Time Range",
    "settings.excludeDesc": "Auto clean will not run during this time range.",
    "settings.midnight": "Midnight (0:00)",
    "settings.presets": "Presets",
    "settings.presetClick": "Click to apply preset.",
    "settings.cpuSpike": "CPU Spike Detection",
    "settings.cpuSpikeDesc": "Shows a notification when CPU spikes above 70%.",
    "settings.protected": "Protected Processes",
    "settings.protectedDesc": "These processes will be excluded from auto clean.",
    "settings.protectedPlaceholder": "Process name (e.g. chrome.exe)",
    "settings.add": "Add",
    "settings.noProtected": "No protected processes",
    "settings.scheduler": "Scheduled Auto-Clean",
    "settings.schedulerDesc": "Automatically clean at specified times.",
    "settings.addSchedule": "Add Schedule",
    "settings.noSchedule": "No schedules",
    "settings.skipIfRunning": "Skip If Running",
    "settings.skipIfRunningDesc": "Skip auto clean if these processes are running.",
    "settings.language": "Language",

    // notifications
    "notifications.title": "Notification Center",
    "notifications.empty": "No notifications.",
    "notifications.clear": "Clear All",
    "notifications.all": "All",
    "notifications.autoClean": "Auto Clean",
    "notifications.memWarn": "Memory",
    "notifications.cpuSpike": "CPU",
    "notifications.autoCleanTitle": "Auto Clean Done",
    "notifications.memWarnTitle": "Memory Warning",
    "notifications.cpuSpikeTitle": "CPU Spike",

    // about
    "about.desc": "An open-source desktop app for smart Windows memory management.",
    "about.close": "Close",
    "about.sourceCode": "GitHub Source Code",
    "about.download": "Download Releases",
    "about.techStack": "Tech Stack",
    "about.license": "Made with Rust & React",

    // shortcuts
    "shortcuts.title": "Keyboard Shortcuts",
    "shortcuts.note": "Only works when the app window is active.",
    "shortcuts.f5": "Refresh process list",
    "shortcuts.ctrlQ": "Quick Clean (auto-select & kill recommended processes)",
    "shortcuts.ctrlA": "Toggle select all / deselect",
    "shortcuts.delete": "Kill selected processes",
    "shortcuts.esc": "Deselect all",
    "shortcuts.question": "Show shortcuts help",

    // disk
    "disk.title": "Disk Cleanup",
    "disk.clean": "Start Cleanup",
    "disk.temp": "Temp Files (TEMP/TMP)",
    "disk.chromecache": "Chrome Cache",
    "disk.edgecache": "Microsoft Edge Cache",
    "disk.wucache": "Windows Update Cache",
    "disk.recycle": "Empty Recycle Bin",
    "disk.start": "Start",
    "disk.success": "Freed",
    "disk.close": "Close",

    // startup
    "startup.title": "Startup Programs",
    "startup.refresh": "Refresh",
    "startup.enable": "Enable",
    "startup.disable": "Disable",
    "startup.noData": "No startup programs found.",
    "startup.source": "Source",

    // tray
    "tray.open": "Open App",
    "tray.quickClean": "Quick Clean",
    "tray.flushRam": "Flush All RAM",
    "tray.quit": "Quit",

    // update
    "update.newVersion": "New version",
    "update.released": "has been released.",
    "update.download": "Download",

    // time
    "time.daysAgo": "{0}d ago",
    "time.hoursAgo": "{0}h ago",
    "time.minsAgo": "{0}m ago",
    "time.justNow": "Just now",
    "time.days": "days",
    "time.hours": "hours",
    "time.mins": "mins",

    // common
    "common.noData": "No data",
    "common.loading": "Loading…",
    "common.error": "Error",
    "common.ok": "OK",
    "common.cancel": "Cancel",
  },

  ja: {
    // app
    "app.subtitle": "Windowsメモリ管理",
    "app.autoOnBadge": "自動ON",

    // header
    "header.quickClean": "クイッククリーン",
    "header.disk": "ディスクのクリーンアップ",
    "header.settings": "設定",
    "header.light": "ライトモード",
    "header.dark": "ダークモード",
    "header.shortcuts": "ショートカット",
    "header.about": "バージョン情報",

    // tabs
    "tabs.process": "プロセス",
    "tabs.history": "履歴",
    "tabs.insights": "インサイト",
    "tabs.startup": "スタートアップ",

    // toolbar
    "toolbar.refresh": "更新",
    "toolbar.all": "すべて選択",
    "toolbar.recommended": "推奨のみ選択",
    "toolbar.deselect": "選択解除",

    // footer
    "footer.flushAll": "全RAMフラッシュ",
    "footer.compress": "ワーキングセット圧縮",
    "footer.kill": "{0}件を終了",
    "footer.killing": "終了中…",
    "footer.compressing": "圧縮中…",

    // process
    "process.name": "プロセス名",
    "process.memory": "メモリ",
    "process.cpu": "CPU",
    "process.leak": "リーク?",

    // contextMenu
    "contextMenu.protect": "保護リストに追加",
    "contextMenu.priorityLow": "CPU優先度: 低",
    "contextMenu.priorityIdle": "CPU優先度: アイドル",
    "contextMenu.priorityNormal": "CPU優先度: 通常に戻す",
    "contextMenu.detail": "プロセスの詳細",

    // history
    "history.title": "終了履歴",
    "history.clear": "すべて削除",
    "history.csv": "CSV",
    "history.empty": "履歴がありません。",
    "history.manual": "手動",
    "history.auto": "自動",
    "history.success": "成功",
    "history.failed": "失敗",

    // insights
    "insights.title": "インサイト",
    "insights.refresh": "更新",
    "insights.totalKill": "合計終了",
    "insights.totalMem": "合計解放",
    "insights.todayKill": "今日の終了",
    "insights.autoClean": "自動クリーン",
    "insights.top5": "Top 5プロセス",
    "insights.weekly": "7日間の推移",
    "insights.ramHistory": "24時間RAM推移",
    "insights.sysInfo": "システム情報",
    "insights.noData": "データなし",

    // settings
    "settings.title": "設定",
    "settings.save": "保存",
    "settings.saving": "保存中…",
    "settings.cancel": "キャンセル",
    "settings.import": "インポート",
    "settings.export": "エクスポート",
    "settings.appSettings": "アプリ設定",
    "settings.autoRefresh": "プロセス自動更新間隔",
    "settings.autoStart": "Windows起動時に自動実行",
    "settings.autoStartDesc": "ログイン時にトレイで自動起動します。",
    "settings.memWarn": "メモリ警告通知",
    "settings.warnThreshold": "警告しきい値 (%)",
    "settings.autoClean": "自動クリーン",
    "settings.enabled": "有効",
    "settings.threshold": "しきい値 (%)",
    "settings.interval": "間隔 (秒)",
    "settings.excludeTime": "除外時間帯",
    "settings.excludeDesc": "この時間帯は自動クリーンを実行しません。",
    "settings.midnight": "深夜 (0時)",
    "settings.presets": "プリセット",
    "settings.presetClick": "クリックして設定を変更します。",
    "settings.cpuSpike": "CPUスパイク検出",
    "settings.cpuSpikeDesc": "CPU使用率が70%を超えると通知を表示します。",
    "settings.protected": "保護プロセス",
    "settings.protectedDesc": "これらのプロセスは自動クリーンから除外されます。",
    "settings.protectedPlaceholder": "プロセス名 (例: chrome.exe)",
    "settings.add": "追加",
    "settings.noProtected": "保護プロセスなし",
    "settings.scheduler": "スケジュール自動クリーン",
    "settings.schedulerDesc": "指定した時刻に自動的にクリーンを実行します。",
    "settings.addSchedule": "スケジュール追加",
    "settings.noSchedule": "スケジュールなし",
    "settings.skipIfRunning": "実行中はスキップ",
    "settings.skipIfRunningDesc": "これらのプロセスが実行中の場合、自動クリーンをスキップします。",
    "settings.language": "言語",

    // notifications
    "notifications.title": "通知センター",
    "notifications.empty": "通知はありません。",
    "notifications.clear": "すべてクリア",
    "notifications.all": "すべて",
    "notifications.autoClean": "自動クリーン",
    "notifications.memWarn": "メモリ",
    "notifications.cpuSpike": "CPU",
    "notifications.autoCleanTitle": "自動クリーン完了",
    "notifications.memWarnTitle": "メモリ警告",
    "notifications.cpuSpikeTitle": "CPUスパイク",

    // about
    "about.desc": "Windowsのメモリをスマートに管理するオープンソースデスクトップアプリです。",
    "about.close": "閉じる",
    "about.sourceCode": "GitHubソースコード",
    "about.download": "リリースのダウンロード",
    "about.techStack": "技術スタック",
    "about.license": "Made with Rust & React",

    // shortcuts
    "shortcuts.title": "キーボードショートカット",
    "shortcuts.note": "アプリウィンドウがアクティブな状態でのみ動作します。",
    "shortcuts.f5": "プロセスリストを更新",
    "shortcuts.ctrlQ": "クイッククリーン (推奨プロセスを自動選択して終了)",
    "shortcuts.ctrlA": "全選択 / 選択解除トグル",
    "shortcuts.delete": "選択したプロセスを終了",
    "shortcuts.esc": "選択解除",
    "shortcuts.question": "ショートカットヘルプを表示",

    // disk
    "disk.title": "ディスクのクリーンアップ",
    "disk.clean": "クリーンアップ開始",
    "disk.temp": "一時ファイル (TEMP/TMP)",
    "disk.chromecache": "Chromeキャッシュ",
    "disk.edgecache": "Microsoft Edgeキャッシュ",
    "disk.wucache": "Windows Updateキャッシュ",
    "disk.recycle": "ごみ箱を空にする",
    "disk.start": "開始",
    "disk.success": "解放済み",
    "disk.close": "閉じる",

    // startup
    "startup.title": "スタートアッププログラム",
    "startup.refresh": "更新",
    "startup.enable": "有効化",
    "startup.disable": "無効化",
    "startup.noData": "スタートアッププログラムがありません。",
    "startup.source": "ソース",

    // tray
    "tray.open": "アプリを開く",
    "tray.quickClean": "クイッククリーン",
    "tray.flushRam": "全RAMフラッシュ",
    "tray.quit": "終了",

    // update
    "update.newVersion": "新バージョン",
    "update.released": "がリリースされました。",
    "update.download": "ダウンロード",

    // time
    "time.daysAgo": "{0}日前",
    "time.hoursAgo": "{0}時間前",
    "time.minsAgo": "{0}分前",
    "time.justNow": "たった今",
    "time.days": "日",
    "time.hours": "時間",
    "time.mins": "分",

    // common
    "common.noData": "データなし",
    "common.loading": "読み込み中…",
    "common.error": "エラー",
    "common.ok": "OK",
    "common.cancel": "キャンセル",
  },
};

export const I18nContext = createContext<Locale>("ko");
export const I18nProvider = I18nContext.Provider;

/**
 * 번역 훅. 키와 파라미터를 받아 번역된 문자열을 반환합니다.
 * 파라미터는 {0}, {1} 플레이스홀더를 대체합니다.
 */
export function useT(): (key: string, ...params: (string | number)[]) => string {
  const locale = useContext(I18nContext);
  return (key: string, ...params: (string | number)[]) => {
    const dict = translations[locale] ?? translations["ko"];
    let str = dict[key] ?? translations["ko"][key] ?? key;
    params.forEach((p, i) => {
      str = str.replace(new RegExp(`\\{${i}\\}`, "g"), String(p));
    });
    return str;
  };
}
