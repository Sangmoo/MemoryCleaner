# Memory Cleaner v1.2.2

**Windows 전용 스마트 메모리 정리 도구** — Tauri 2 + React 18 + Rust

[![Version](https://img.shields.io/badge/version-1.2.2-blue)](https://github.com/Sangmoo/MemoryCleaner/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-brightgreen)](https://github.com/Sangmoo/MemoryCleaner)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Build](https://github.com/Sangmoo/MemoryCleaner/actions/workflows/release.yml/badge.svg)](https://github.com/Sangmoo/MemoryCleaner/actions/workflows/release.yml)

---

## 📥 다운로드

[**→ 최신 릴리스 다운로드**](https://github.com/Sangmoo/MemoryCleaner/releases/latest)

| 파일 | 설명 |
|------|------|
| `Memory Cleaner_x.x.x_x64-setup.exe` | NSIS 설치 관리자 **(권장)** |
| `Memory Cleaner_x.x.x_x64_en-US.msi` | Windows Installer |

> Windows 10 / 11 x64 전용입니다.

---

## 🌐 다국어 지원

| 언어 | 코드 |
|------|------|
| 한국어 | `ko` |
| English | `en` |
| 日本語 | `ja` |

설정 → 언어 항목에서 변경할 수 있습니다.

---

## ✨ 주요 기능

### 🧠 메모리 관리
| 기능 | 설명 |
|------|------|
| 실시간 RAM 모니터링 | 게이지 + 60점 그래프로 메모리 사용률 추적 |
| 프로세스 목록 | 메모리 순 정렬, 검색, 그룹화 (×N 배지) |
| Quick Clean | 한 번에 추천 프로세스 정리 (Ctrl+Q) |
| 선택 Kill | 수동으로 선택한 프로세스 종료 |
| 메모리 압축 | EmptyWorkingSet API로 워킹셋 즉시 절약 |
| 전체 RAM 플러시 | 모든 비시스템 프로세스 WorkingSet 일괄 해제 |
| 자동 정리 | 임계값 초과 시 백그라운드 자동 종료 |
| 메모리 누수 감지 | 지속 성장 프로세스 자동 표시 (🔴 누수?) |
| **프로세스 임계값 규칙** | 특정 프로세스가 MB 초과 시 자동 kill/compress 액션 |

### 📊 실시간 모니터링
| 기능 | 설명 |
|------|------|
| CPU 실시간 게이지 | 헤더에 CPU % 미니 게이지 표시 |
| 디스크 공간 | C: 드라이브 여유 공간 실시간 표시 |
| **24시간 RAM 히스토리** | 분 단위 수집 + **파일 저장** (재시작 후에도 유지) |
| **CPU 스파크라인** | 프로세스별 최근 15회 CPU % 추이 미니 그래프 |
| 인사이트 탭 | 통계 요약, TOP 5 프로세스, 7일 킬 히스토리 |
| 시스템 정보 | CPU 모델/코어수, RAM 용량, OS 버전, 가동 시간 |
| CPU 급등 감지 | CPU 70%+ 비시스템 프로세스 발견 시 앱 내 알림 |

### ⏰ 자동화 & 스케줄
| 기능 | 설명 |
|------|------|
| **스케줄 자동 정리** | HH:MM + 요일(일~토) 지정으로 예약 자동 정리 |
| **실행 중 정리 건너뜀** | 특정 앱 실행 중에는 자동/스케줄 정리 비활성화 |
| **프로세스 임계값 자동 규칙** | 프로세스별 MB 임계값 초과 시 백그라운드 자동 처리 |
| 자동 정리 제외 시간대 | 특정 시간 범위 내 자동 정리 비활성화 |
| Windows 자동 시작 | 로그인 후 트레이에서 자동 실행 |

### 🔔 알림 & UX
| 기능 | 설명 |
|------|------|
| 인앱 토스트 알림 | 모든 작업 결과를 success/error/warning/info 토스트로 표시 |
| **알림 센터 필터** | 전체 / 자동정리 / 메모리 / CPU 탭으로 알림 분류 |
| **알림 최대 보관 개수** | 설정에서 슬라이더로 10~200개 범위 조절 |
| **주간 리포트** | 7일마다 자동 정리 통계(횟수·확보 GB) 토스트 표시 |
| **미니 모드** | 헤더 버튼 클릭 → 창을 280×265로 축소, 복원 시 이전 창 크기로 정확히 복귀 |
| OS 트레이 알림 | RAM 임계값 도달 시 Windows 알림 센터로 푸시 |
| About 창 | 버전·기술 스택·GitHub 소스코드·릴리스 링크 |
| 업데이트 배너 | GitHub Releases API로 신규 버전 자동 감지 |
| 온보딩 투어 | 최초 실행 시 4단계 기능 소개 |

### ⚙️ 설정 & 프로세스 제어
| 기능 | 설명 |
|------|------|
| 설정 프리셋 | 🎮 게임 · 💼 업무 · 🔋 절전 모드 원클릭 전환 |
| **언어 선택** | 한국어 / English / 日本語 전환 |
| **테마 accent 색상** | indigo / violet / emerald / rose / amber / sky 6가지 선택 |
| **GitHub Gist 백업** | PAT 입력 후 설정을 Gist에 업로드/복원 |
| **Kill 프리셋 관리** | 브라우저 정리 / 게임 최적화 / 개발 환경 기본 제공, 커스텀 추가 |
| **프로세스 트리 뷰** | 부모-자식 PID 기반 계층 구조로 프로세스 표시 |
| 우선순위 조절 | 우클릭 → CPU 낮춤 / 유휴 / 정상화 (SetPriorityClass) |
| 보호 프로세스 | 자동·수동 정리에서 제외할 프로세스 등록 |
| 설정 내보내기/가져오기 | JSON 파일로 백업 및 복원 |

### 📁 유틸리티
| 기능 | 설명 |
|------|------|
| 프로세스 상세 패널 | 클릭 → PID·경로·메모리(WorkingSet/Virtual)·CPU·상태 표시 |
| Kill 히스토리 | 종료 기록 저장 + CSV 내보내기 |
| 디스크 정리 | TEMP·브라우저 캐시·Windows Update 캐시·휴지통 일괄 정리 |
| 시작 프로그램 관리 | 레지스트리 Run 키 기반 시작 프로그램 ON/OFF |
| **트레이 퀵 메뉴** | 트레이 우클릭 → Quick Clean / 전체 RAM 플러시 |
| 동적 트레이 아이콘 | RAM 사용률에 따라 🟢🟡🔴 색상 자동 변경 |
| 단일 인스턴스 | 앱 중복 실행 시 기존 창 포커스 |
| 다크/라이트 모드 | 전환 가능 |

---

## ⌨️ 키보드 단축키

| 단축키 | 동작 |
|--------|------|
| `F5` | 프로세스 목록 새로고침 |
| `Ctrl + Q` | Quick Clean (추천 즉시 정리) |
| `Ctrl + A` | 전체 선택 |
| `Delete` | 선택 항목 Kill 확인 창 |
| `Esc` | 선택 해제 (모달 닫기 우선) |
| `?` | 키보드 단축키 도움말 |

---

## 🖱️ 우클릭 컨텍스트 메뉴

프로세스 행에서 마우스 오른쪽 버튼을 클릭하면:

- **보호 목록에 추가** — 이후 자동·수동 정리에서 제외
- **CPU 우선순위 낮춤** — `BELOW_NORMAL_PRIORITY_CLASS` 적용
- **CPU 우선순위 유휴** — `IDLE_PRIORITY_CLASS` 적용 (가장 낮은 우선순위)
- **CPU 우선순위 정상화** — `NORMAL_PRIORITY_CLASS` 복원

> 시스템 프로세스(회색 행)는 우클릭 메뉴가 나타나지 않습니다.

---

## ⚙️ 설정 프리셋

| 프리셋 | 자동 정리 임계값 | 정리 간격 | 경고 알림 임계값 |
|--------|----------------|-----------|----------------|
| 🎮 게임 모드 | 92% | 5분 | 95% |
| 💼 업무 모드 | 80% | 1분 | 85% |
| 🔋 절전 모드 | 70% | 30초 | 75% |

---

## ⏱️ 스케줄 자동 정리

특정 시간에 자동으로 메모리를 정리합니다.

- 설정 → **스케줄 자동 정리** 섹션에서 스케줄 추가
- 시간(`HH:MM`) + 요일(일~토) 선택
- 복수 스케줄 등록 가능
- "실행 중 정리 건너뜀" 규칙과 연동 — 게임/영상 재생 중 건너뛰기 가능

**예시:**
```
매일 09:00  →  [월 화 수 목 금]
매일 23:30  →  [월 화 수 목 금 토 일]
```

---

## 🎯 프로세스 임계값 자동 규칙

특정 프로세스가 설정한 메모리 용량을 초과하면 자동으로 처리합니다.

설정 → **프로세스 자동 규칙** 섹션에서 추가:

| 필드 | 예시 |
|------|------|
| 프로세스 이름 | `chrome.exe` |
| 임계값 (MB) | `1000` |
| 액션 | `kill` 또는 `compress` |

---

## 🎨 Kill 프리셋

자주 종료하는 프로세스 그룹을 프리셋으로 저장하고 한 번에 실행합니다.

| 기본 프리셋 | 대상 프로세스 |
|------------|-------------|
| 🌐 브라우저 정리 | chrome.exe, msedge.exe, firefox.exe, opera.exe |
| 🎮 게임 최적화 | discord.exe, slack.exe, teams.exe, zoom.exe |
| 💻 개발 환경 | code.exe, devenv.exe, rider64.exe |

커스텀 프리셋도 자유롭게 추가할 수 있습니다.

---

## 📈 인사이트 탭

| 패널 | 내용 |
|------|------|
| 요약 통계 | 총 종료 수, 확보 메모리, 오늘 종료 수, 자동 정리 수 |
| TOP 5 프로세스 | 가장 자주 종료된 프로세스 (막대 차트) |
| 7일 추이 | 날짜별 종료 건수 막대 차트 |
| **24h RAM 히스토리** | 분 단위 RAM 사용률 SVG 라인 차트 (재시작 후에도 유지) |
| 시스템 정보 | CPU 모델, 코어 수, RAM 용량, OS 버전, 가동 시간 |

---

## 🔍 메모리 누수 감지 알고리즘

PID별 최근 **12개 측정값** (10초 간격 ≈ 2분)을 추적합니다.

```
판정 조건 (AND):
  ① 후반 6개 평균 ≥ 전반 6개 평균 × 1.25
  ② 절대 증가량 ≥ 30 MB
  ③ 최근 8개 측정이 단조 증가 (±2% 허용)
```

세 조건을 모두 만족하면 행에 🔴 **누수?** 배지가 표시됩니다.

---

## 🏗️ 기술 스택

| 레이어 | 기술 |
|--------|------|
| Shell | Tauri v2.11 (Windows / WebView2) |
| Frontend | React 18 + TypeScript + Tailwind CSS + Vite 5 |
| Backend | Rust — sysinfo 0.32, windows-rs 0.58, chrono, tokio |
| UI | lucide-react, react-window (가상 스크롤) |
| i18n | React Context 기반 내장 i18n (ko/en/ja) |
| Tauri Plugins | notification, dialog, single-instance, opener |

---

## 🚀 개발 환경 설정

### 사전 요구사항

- [Node.js](https://nodejs.org/) LTS
- [Rust](https://rustup.rs/) stable
- Windows 10/11 + [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (Windows 11은 기본 내장)

### 실행

```bash
# 의존성 설치
npm install

# 개발 서버 (핫 리로드 + Tauri 창)
npm run tauri:dev

# 프로덕션 빌드 (로컬)
npm run tauri:build
```

빌드 결과물: `src-tauri/target/release/bundle/`
- `nsis/Memory Cleaner_x.x.x_x64-setup.exe`
- `msi/Memory Cleaner_x.x.x_x64_en-US.msi`

---

## 🤖 GitHub Actions 자동 릴리스

`v`로 시작하는 태그를 push하면 GitHub Actions가 자동으로 Windows 빌드 후 GitHub Releases에 설치 파일을 첨부합니다.

```bash
# 버전 태그 생성 & push → 빌드 자동 시작 (약 15~20분 소요)
git tag v1.2.2
git push origin v1.2.2
```

빌드 진행 상황: [GitHub Actions](https://github.com/Sangmoo/MemoryCleaner/actions)

---

## 📦 릴리스 히스토리

### v1.2.2 (2026-05-29)
- 🐛 **업데이트 배너 동적 버전 체크** — `getVersion()` (Tauri App API)으로 설치된 실제 버전을 읽어 비교. 하드코딩 제거로 이후 릴리스에서 배너 오표시 없음
- 🐛 **About 창 버전 동적 표시** — 동일하게 `getVersion()` 사용, 항상 정확한 버전 표시
- 🐛 **미니 모드 창 리사이즈 순서 수정** — 창 축소 완료 후 미니 UI 전환 (이전: UI 먼저 → 창이 큰 채로 미니 카드가 보이던 현상 수정)
- 🐛 **미니 모드 복원 크기 저장** — 진입 직전 창 크기를 논리 픽셀로 저장, 복원 시 정확히 원래 크기로 되돌림

### v1.2.1 (2026-05-29)
- 🐛 **알림센터 오작동 수정** — `onToggle` ref 패턴 도입으로 다크모드·설정 등 다른 버튼 클릭 시 알림센터가 열리던 버그 수정
- 🐛 **알림센터 setTimeout 제거** — mousedown 리스너 등록 공백으로 인한 열림/닫힘 루프 버그 수정
- 🐛 **버전 표기 수정** — `tauri.conf.json` / `package.json` 버전 1.0.0 → 1.2.x 동기화
- 🐛 **미니 모드 실제 창 리사이즈** — 오버레이 방식에서 Tauri window API 기반 실제 창 축소로 전환

### v1.2.0 (2026-05-28)
- ✅ **알림 최대 보관 개수 설정** — 슬라이더 10~200개 (기본 50), 슬라이딩 윈도우 방식
- ✅ **RAM 히스토리 파일 저장** — 앱 재시작 후에도 24h 데이터 유지
- ✅ **프로세스 임계값 자동 규칙** — 프로세스별 MB 초과 시 kill/compress 자동 실행
- ✅ **CPU 스파크라인** — 프로세스 테이블에 최근 CPU % 추이 미니 그래프 표시
- ✅ **미니 모드** — 헤더 버튼으로 우하단 컴팩트 카드 전환 (RAM%·CPU%·Quick Clean)
- ✅ **주간 리포트** — 7일마다 자동 정리 통계 토스트 (횟수·확보 GB)
- ✅ **Kill 프리셋 관리** — 브라우저/게임/개발 기본 제공, 커스텀 추가 가능
- ✅ **프로세스 트리 뷰** — 부모-자식 PID 기반 계층 구조 토글
- ✅ **테마 accent 색상** — 6가지 색상 (indigo·violet·emerald·rose·amber·sky) 선택
- ✅ **GitHub Gist 설정 백업** — PAT 입력 후 설정 업로드/복원
- ✅ **i18n 키 확장** — report·miniMode·processRules·killPresets·accent·gist 등 26개 추가

### v1.1.0 (2026-05-28)
- ✅ **트레이 퀵 메뉴 강화** — Quick Clean / 전체 RAM 플러시 트레이 메뉴 항목 추가
- ✅ **스케줄 자동 정리** — HH:MM + 요일 지정 예약 정리 (복수 스케줄 지원)
- ✅ **24시간 RAM 히스토리 그래프** — 분 단위 수집, SVG 라인 차트
- ✅ **프로세스 상세 패널 강화** — Virtual Memory 표시 추가
- ✅ **자동 정리 커스텀 규칙** — 특정 앱 실행 중 자동/스케줄 정리 건너뜀
- ✅ **다국어 지원 (ko/en/ja)** — React Context i18n, 전체 UI 한국어/영어/일본어 전환
- ✅ **알림 센터 필터** — 전체 / 자동정리 / 메모리 / CPU 탭 필터링

### v1.0.0 (2026-05-28)
- ✅ **인앱 토스트 알림** — alert() 전면 제거, 4종 토스트 시스템 (success/error/warning/info)
- ✅ **알림 센터** — 벨 아이콘 드롭다운, 자동 정리·메모리 경고·CPU 급등 이력 관리
- ✅ **About 창** — 버전·기술 스택·외부 링크
- ✅ **전체 RAM 플러시** — 모든 비시스템 프로세스 WorkingSet 일괄 해제
- ✅ **단일 인스턴스** — 중복 실행 시 기존 창 포커스
- ✅ **커스텀 앱 아이콘** — 메모리 칩 + 번개 디자인
- ✅ **GitHub Actions CI/CD** — 태그 push만으로 Windows 빌드 + 릴리스 자동화

### v0.3.0 (2025)
- ✅ CPU/Disk 실시간 모니터링 (헤더 미니 게이지)
- ✅ 인사이트 탭 (통계 + 시스템 정보 + 7일 차트)
- ✅ 프로세스 우선순위 조절 (SetPriorityClass Win32 API)
- ✅ CPU 급등 감지 및 앱 내 알림 (70%+ 트리거)
- ✅ 설정 프리셋 3종 (🎮 게임 / 💼 업무 / 🔋 절전)
- ✅ 우클릭 컨텍스트 메뉴 (보호 추가, 우선순위 조절)
- ✅ Kill 히스토리 CSV 내보내기
- ✅ 업데이트 알림 배너 (GitHub Releases API 자동 감지)
- ✅ 최초 실행 온보딩 투어 (4단계)
- ✅ 시스템 정보 패널

### v0.2.0
- ✅ 메모리 누수 감지 (PID별 롤링 윈도우 알고리즘)
- ✅ 키보드 단축키 (F5 / Ctrl+Q / Ctrl+A / Delete / Esc / ?)
- ✅ 설정 내보내기/가져오기 (JSON)
- ✅ 디스크 정리 확장 (Chrome/Edge 캐시, Windows Update, 휴지통)
- ✅ Before/After 게이지 애니메이션
- ✅ 프로세스 그룹화 (×N 배지)
- ✅ 동적 트레이 아이콘 (RAM 사용률 색상)
- ✅ 메모리 경고 알림 (히스테리시스 5%)

### v0.1.0
- ✅ 프로세스 목록 (가상 스크롤)
- ✅ Quick Clean
- ✅ 자동 정리
- ✅ Kill 히스토리
- ✅ 시작 프로그램 관리

---

## 📄 라이선스

MIT © Sangmoo
