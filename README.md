# Memory Cleaner

스마트하게 메모리를 정리해주는 **Windows 데스크탑 앱**입니다.  
프로세스를 메모리/CPU 순으로 시각화하고, 자동·수동으로 정리하며, 시스템 시작 프로그램과 디스크까지 관리합니다.

> v0.1 — Python + tkinter  
> **v0.2 — Tauri 2 + React 18 + Rust** 로 재구성 (네이티브 성능, 60fps 가상 스크롤, 세련된 UI)

---

## ✨ 주요 기능

### 💾 메모리 모니터링
- **실시간 RAM 게이지** — 3초마다 자동 갱신, 그라데이션 바
- **실시간 메모리 그래프** — 최근 3분(60포인트) 스파크라인, 사용률에 따라 파랑 → 노랑 → 빨강으로 색상 변화
- **메모리 경고 알림** — 사용률이 임계값(기본 90%) 초과 시 OS 알림 + 상단 토스트 (자동정리 OFF여도 동작, 5% 히스테리시스로 중복 방지)

### 📋 프로세스 관리
- **가상 스크롤 테이블** — 300개 프로세스를 60fps로 부드럽게 렌더링
- **컬럼 정렬** — 이름 / PID / CPU / 메모리 클릭 정렬, 방향 토글
- **실시간 검색** — 이름으로 즉시 필터링
- **CPU 사용률 컬럼** — 각 프로세스의 현재 CPU% 표시
- **스마트 추천** — 메모리 임계값(100MB ~ 10GB) 초과 비시스템 프로세스 자동 분류
- **시스템 프로세스 보호** — `csrss`, `lsass`, `dwm` 등 Windows 핵심 프로세스 종료 불가
- **프로세스 상세 팝업** — 행의 ⓘ 버튼으로 실행 경로·명령줄·CPU·메모리 확인
- **프로세스 그룹화** — 같은 이름 프로세스를 하나로 묶어 합산 메모리·CPU 표시 (×N 배지)
- **메모리 누수 의심 배지** — 최근 측정값이 지속적으로 증가하는 프로세스에 `📈 누수?` 배지 자동 표시
- **자동 새로고침 + 스크롤 위치 유지** — 설정한 주기마다 갱신, 스크롤·정렬 위치 그대로 유지
- **원클릭 Quick Clean** — 헤더 버튼 한 번으로 추천 프로세스를 즉시 종료 (확인 절차 없음)

### 🛡️ 보호 프로세스
- 설정에서 직접 지정한 프로세스를 **수동 Kill과 자동 정리 모두에서 제외**
- 프로세스 테이블에 초록 방패 아이콘 + "보호됨" 뱃지 표시

### 🤖 자동 정리
- 메모리 사용률이 임계값 초과 시 안전한 프로세스를 **자동으로 종료**
- **기본값 OFF** — 설정에서 활성화
- 임계값(%) 슬라이더와 실행 간격(초) 직접 설정
- **제외 시간대** — 수면·근무 시간 등 특정 시간대에 자동 정리 건너뜀 (자정 넘김 범위 지원)
- 자동 정리 완료 시 우상단 토스트 알림 + Windows OS 알림(배너) 표시

### 🗜️ 메모리 압축
- `EmptyWorkingSet` Windows API로 **프로세스 종료 없이** 물리 메모리 확보
- 선택한 프로세스의 페이지를 스왑으로 이동 (성능 영향 최소화)

### 🗑️ 디스크 정리 (확장)
헤더의 "디스크" 버튼 → 옵션 다이얼로그에서 항목 선택:
- **임시 파일** — `%TEMP%`, `%TMP%`, `C:\Windows\Temp`
- **Chrome 캐시** — Cache / Code Cache / GPUCache
- **Edge 캐시** — Cache / Code Cache / GPUCache
- **Windows Update 캐시** — `C:\Windows\SoftwareDistribution\Download`
- **휴지통 비우기** — 모든 드라이브의 `$Recycle.Bin`

각 옵션 체크 후 실행 → 파일/폴더 수·확보 용량 리포트 출력

### 📊 Kill 결과 화면 (개선)
- Before / After 게이지를 **나란히 비교 + 부드러운 애니메이션**
- 확보 메모리를 그라데이션 카드로 강조
- 실패 항목은 모노스페이스 목록으로 표시

### 📜 Kill 히스토리
- 수동/자동 정리 이력을 **최대 500건** 로컬 파일에 저장
- 시간 · 프로세스명 · 확보 메모리 · 성공/실패 · 트리거(수동/자동) 기록
- 전체 삭제 기능

### 🚀 시작 프로그램 관리
- HKCU / HKLM 레지스트리에서 Windows 시작 프로그램 목록 조회
- 토글 스위치로 활성화 / 비활성화 (StartupApproved 키 사용)

### 🖥️ 시스템 트레이 상주
- 창 닫기 → 트레이로 숨기기 (앱 종료 아님)
- **좌클릭** — 창 표시/숨기기 토글
- **우클릭** — 메뉴 (앱 열기 / 종료)
- **툴팁** — `Memory Cleaner · RAM 74%` 형식, 5초마다 실시간 갱신
- **동적 아이콘 색상** — RAM 사용률에 따라 도넛 아이콘이 **초록(<60%) → 노랑(60~80%) → 빨강(80%+)** 으로 변경. 트레이만 봐도 시스템 상태 파악 가능
- 헤더에 자동 정리 ON 뱃지 표시

### ⌨️ 키보드 단축키
| 키 | 동작 |
|----|------|
| `F5` | 프로세스 목록 새로고침 |
| `Ctrl + Q` | Quick Clean (추천 즉시 정리) |
| `Ctrl + A` | 전체 선택 |
| `Delete` | 선택 항목 Kill 확인 |
| `Esc` | 선택 해제 (모달 닫기 우선) |
| `?` | 단축키 도움말 |

### ⚙️ 앱 설정
- **Windows 시작 시 자동 실행** — 설정 창에서 레지스트리 Run 키 ON/OFF
- **프로세스 새로고침 간격** — 5초 / 10초 / 30초 / 1분 / 3분 / 5분 선택
- **메모리 경고 알림** — ON/OFF + 임계값 슬라이더 (자동정리와 독립)
- **설정 내보내기/가져오기** — 모든 설정을 JSON 파일로 백업 및 복원
- **다크 / 라이트 테마** 자동 감지 + 수동 전환, `localStorage` 저장

---

## 🏗️ 아키텍처

```
┌────────────────────────────────────────────────────────────────┐
│  React 18 + TypeScript + Tailwind CSS  (src/)                  │
│  ├─ MemoryGauge / MemoryGraph                                  │
│  ├─ ProcessTable (가상 스크롤·검색·정렬·그룹화·누수 감지)         │
│  ├─ ProcessDetailModal  ← 프로세스 상세 팝업                    │
│  ├─ DiskCleanupDialog   ← 디스크 정리 옵션                      │
│  ├─ ResultDialog        ← Before/After 게이지 애니메이션         │
│  ├─ ShortcutsDialog     ← 단축키 도움말                          │
│  ├─ HistoryPanel / StartupPanel                                │
│  └─ SettingsModal (자동정리·제외시간·자동시작·경고알림·내보내기) │
└─────────────────────┬──────────────────────────────────────────┘
                      │ Tauri IPC (invoke / event)
                      ▼
┌────────────────────────────────────────────────────────────────┐
│  Rust (src-tauri/src/)                                         │
│  ├─ commands.rs — get_memory, get_processes,                   │
│  │                get_process_details,                         │
│  │                kill_processes, empty_working_set,           │
│  │                cleanup_temp_files, cleanup_disk,            │
│  │                get_settings/save_settings,                  │
│  │                get_app_autostart/set_app_autostart,         │
│  │                get_history/clear_history,                   │
│  │                get_startup_programs/toggle_startup          │
│  ├─ settings.rs  — AppSettings (JSON 파일 영속)                 │
│  ├─ history.rs   — HistoryEntry (JSON 파일 영속)                │
│  ├─ startup.rs   — Windows 레지스트리 읽기/쓰기                 │
│  └─ lib.rs       — Tauri 빌더, 트레이(동적 아이콘+실시간 툴팁),  │
│                    자동정리 루프, 메모리 경고 알림              │
└────────────────────────────────────────────────────────────────┘
```

### 디렉토리 구조

```
mem-tool/
├── src/
│   ├── App.tsx                       ← 헤더에 Quick Clean·디스크·단축키 버튼
│   ├── components/
│   │   ├── MemoryGauge.tsx
│   │   ├── MemoryGraph.tsx           ← 스파크라인 그래프
│   │   ├── ProcessTable.tsx          ← 검색·정렬·그룹화·누수 배지·스크롤 유지
│   │   ├── ProcessDetailModal.tsx    ← 프로세스 상세 팝업
│   │   ├── DiskCleanupDialog.tsx     ← 디스크 정리 옵션 (체크박스)
│   │   ├── HistoryPanel.tsx          ← Kill 히스토리
│   │   ├── StartupPanel.tsx          ← 시작 프로그램 관리
│   │   ├── SettingsModal.tsx         ← 전체 설정 + 내보내기/가져오기
│   │   ├── ThresholdStepper.tsx
│   │   ├── ConfirmDialog.tsx
│   │   └── ResultDialog.tsx          ← Before/After 게이지 애니메이션
│   └── lib/
│       ├── api.ts                    ← Tauri invoke 어댑터
│       └── types.ts
│
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs                    ← 트레이(동적 색상 도넛) + 자동정리 + 경고알림
│   │   ├── commands.rs               ← cleanup_disk 등 14개 + 1
│   │   ├── settings.rs               ← warn_threshold_percent 등 신규 필드
│   │   ├── history.rs
│   │   └── startup.rs
│   ├── icons/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── capabilities/default.json
│
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

---

## 🚀 설치 및 실행

### 사전 요구사항

| 도구 | 버전 | 용도 |
|------|------|------|
| Node.js | 20 LTS+ | 프론트엔드 빌드 |
| Rust | 1.77+ | Tauri 백엔드 컴파일 |
| Visual Studio Build Tools | 2022 | MSVC 링커 (`link.exe`) |
| WebView2 Runtime | 최신 | Windows 10 이하에서 필요 |

```powershell
# Rust 설치
winget install Rustlang.Rustup

# VS Build Tools (C++ 워크로드 포함)
winget install Microsoft.VisualStudio.2022.BuildTools `
  --override "--wait --quiet --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

### 개발 모드

```powershell
npm install
npm run tauri:dev
```

### 프로덕션 빌드

```powershell
npm run tauri:build
```

빌드 결과:
- `src-tauri/target/release/bundle/msi/Memory Cleaner_0.2.0_x64_en-US.msi`
- `src-tauri/target/release/bundle/nsis/Memory Cleaner_0.2.0_x64-setup.exe`

> 첫 빌드는 Rust 의존성 컴파일로 **3~10분** 소요. 이후 증분 빌드는 1~2분.

#### 관리자 권한
시스템 프로세스 종료 및 HKLM 시작 프로그램·휴지통 일괄 삭제 시 관리자 권한이 필요합니다.  
→ `.exe` 우클릭 → **관리자 권한으로 실행**

---

## 🎨 사용법

### 헤더 (상단 바)

| 버튼 | 설명 |
|------|------|
| **Quick Clean** ✨ | 추천 프로세스 즉시 종료 (확인 없음, 단축키 `Ctrl+Q`) |
| **디스크** 💾 | 디스크 정리 다이얼로그 (TEMP·Chrome·Edge·Windows Update·휴지통) |
| **⌨️ 단축키** | 키보드 단축키 목록 (단축키 `?`) |
| **설정** ⚙️ | 자동정리·경고알림·자동시작·새로고침 간격·보호 목록·내보내기/가져오기 |
| **테마** | 라이트/다크 전환 |

### 프로세스 탭

| 요소 | 설명 |
|------|------|
| 메모리 게이지 | 현재 RAM 사용률, 3초 자동 갱신 |
| 스파크라인 그래프 | 최근 3분 메모리 추이, 최소/최대 표시 |
| 임계값 스테퍼 | 100MB ~ 10GB, 이 이상인 비시스템 프로세스가 "추천"으로 분류 |
| 검색창 | 프로세스명 실시간 필터 |
| 그룹화 버튼 | 같은 이름 프로세스를 합산하여 하나의 행으로 표시 |
| 컬럼 헤더 클릭 | 이름 / PID / CPU / 메모리 정렬 |
| 행 클릭 | 체크박스 토글 (시스템·보호 프로세스는 클릭 불가) |
| ⓘ 버튼 (행 hover) | 프로세스 상세 팝업 — 실행 경로·명령줄·상태 확인 |
| 📈 누수? 배지 | 약 2분 동안 메모리가 지속적으로 증가하는 프로세스 |
| 🔄 카운트다운 | 다음 자동 새로고침까지 남은 시간 실시간 표시 |
| 메모리 압축 버튼 | 선택된 프로세스 종료 없이 RAM 확보 |
| Kill 버튼 | 선택 프로세스 확인 후 일괄 종료 |

### 행 분류

| 분류 | 아이콘 | 의미 |
|------|--------|------|
| 시스템 | 🚫 | Windows 핵심 프로세스, 종료 불가 |
| 보호됨 | 🛡️ | 사용자가 설정에서 지정, 종료 불가 |
| 추천 | — | 임계값 이상, kill 후보 (노랑 배경) |
| 일반 | — | 그 외 |

### 그룹화 모드

| 요소 | 설명 |
|------|------|
| ×N 배지 | 해당 이름의 프로세스 인스턴스 수 |
| 메모리 | 그룹 내 전체 합산 |
| CPU | 그룹 내 전체 합산 |
| 반선택(–) 체크박스 | 그룹 일부만 선택된 상태 |
| 그룹 클릭 | 그룹 내 모든 PID 일괄 선택/해제 |

### 누수 감지 알고리즘
- 각 PID에 대해 최근 12개의 메모리 측정값 추적
- 최소 8개 샘플 + 후반 평균이 전반 대비 25%+ 증가 + 최소 30MB 이상 증가 + 거의 단조증가 시 → **누수 의심**으로 판정

### 메모리 경고 알림 (자동정리 OFF여도 동작)
- 설정에서 임계값(기본 90%) 지정
- 임계값 도달 → **Windows OS 알림 + 상단 빨간 토스트**
- 5% 히스테리시스: `threshold − 5%` 아래로 떨어졌다가 다시 올라갈 때만 재알림 (스팸 방지)

### 디스크 정리

헤더의 **디스크** 버튼 → 옵션 선택 → "정리 시작"  
결과 화면에 확보 용량·파일 수·폴더 수·건너뛴 항목 수가 표시됩니다.

> 브라우저 캐시는 브라우저가 실행 중이면 일부만 삭제됩니다. 더 많이 확보하려면 브라우저를 종료한 후 실행하세요.

### 설정 (⚙️ 버튼)

- **앱 설정**
  - Windows 시작 시 자동 실행 ON/OFF
  - 프로세스 새로고침 간격 (5초 / 10초 / 30초 / 1분 / 3분 / 5분)
- **메모리 경고 알림** — ON/OFF + 임계값(60~99%)
- **자동 정리** — ON/OFF, 임계값(%), 실행 간격(초), 제외 시간대 설정
- **보호 프로세스** — 프로세스명 입력 후 추가, 태그로 표시
- **하단 푸터** — `가져오기` / `내보내기` 버튼으로 JSON 백업 및 복원

---

## 📦 기술 스택

| 영역 | 기술 | 버전 |
|------|------|------|
| UI 프레임워크 | React + TypeScript | 18 / 5.6 |
| 빌드 도구 | Vite | 5.4 |
| 스타일 | Tailwind CSS | 3.4 |
| 가상 스크롤 | react-window | 1.8 |
| 아이콘 | lucide-react | 0.46 |
| 데스크탑 런타임 | Tauri | 2.x |
| 시스템 API | sysinfo | 0.32 |
| Windows API | windows-rs | 0.58 |
| 레지스트리 | winreg | 0.52 |
| 직렬화 | serde + serde_json | 1.x |
| 비동기 런타임 | tokio | 1.x |
| 시간 처리 | chrono | 0.4 |
| OS 알림 | tauri-plugin-notification | 2.x |

---

## ⚠️ 알려진 제약

| 항목 | 내용 |
|------|------|
| **플랫폼** | Windows 전용 (시작 프로그램·EmptyWorkingSet은 Windows API 의존) |
| **메모리 압축** | EmptyWorkingSet은 물리 RAM을 일시적으로 줄이나, 프로세스 재사용 시 다시 늘어남 |
| **HKLM 변경** | 시작 프로그램 HKLM 항목 변경은 관리자 권한 필요 |
| **휴지통 비우기** | 관리자 권한 + 일부 시스템 보호 폴더는 건너뜀 |
| **브라우저 캐시** | 브라우저 실행 중이면 잠긴 파일은 삭제 불가 |
| **CPU 수치** | 첫 조회 시 0%로 표시될 수 있음 (sysinfo 2회 갱신 필요) |
| **누수 감지** | 약 2분(8샘플) 누적이 필요하므로 앱 시작 직후엔 배지 표시 안 됨 |
| **그룹화 모드** | 그룹 행의 ⓘ 상세 버튼은 단일 프로세스에서만 동작 |

---

## 🔧 트러블슈팅

### `link.exe` 를 찾을 수 없음
Visual Studio Build Tools C++ 워크로드 미설치. 위 설치 명령 참고.

### `Top-level await is not available` 빌드 오류
`vite.config.ts`의 `build.target`을 `"es2022"`로 설정.

### 프로세스 목록이 표시되지 않음
`invalid args threshold_mb` 오류 → `api.ts`에서 `invoke("get_processes", { threshold_mb: ... })`로 스네이크 케이스 사용 확인.

### 트레이 메뉴가 깜빡이며 사라짐
좌클릭/우클릭 이벤트 충돌 → `show_menu_on_left_click(false)` + `MouseButton::Left` + `MouseButtonState::Up` 조건 필터링으로 해결.

### "Microsoft Edge WebView2 Runtime이 필요합니다"
Windows 11 기본 탑재. Windows 10이면 [Microsoft 공식](https://developer.microsoft.com/microsoft-edge/webview2/)에서 설치.

---

## 📄 라이선스

MIT

---

## 🗂️ 변경 이력

| 버전 | 내용 |
|------|------|
| **v0.2.0** | Tauri 2 + React 18 + Rust 재구성. 가상 스크롤, 실시간 그래프, CPU 컬럼, 검색/정렬, 프로세스 그룹화, **메모리 누수 감지**, 자동 새로고침(간격 설정·스크롤 유지), **원클릭 Quick Clean**, 자동 정리, **메모리 경고 알림**(독립), 보호 프로세스, Kill 히스토리, 시작 프로그램 관리, 메모리 압축(EmptyWorkingSet), **확장 디스크 정리**(TEMP·브라우저·Update·휴지통), **트레이 동적 아이콘 색상**+실시간 RAM% 툴팁, **키보드 단축키**, **설정 내보내기/가져오기**, **Before/After 게이지 결과 화면**, OS 알림, 앱 자동시작, 프로세스 상세 팝업, 자동정리 제외 시간대 |
| **v0.1.0** | Python tkinter 초기 버전 (`legacy/` 참고) |
