# Memory Cleaner v1.0.0

**Windows 전용 스마트 메모리 정리 도구** — Tauri 2 + React 18 + Rust

[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com/Sangmoo/MemoryCleaner/releases)
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

### 📊 실시간 모니터링
| 기능 | 설명 |
|------|------|
| CPU 실시간 게이지 | 헤더에 CPU % 미니 게이지 표시 |
| 디스크 공간 | C: 드라이브 여유 공간 실시간 표시 |
| 인사이트 탭 | 통계 요약, TOP 5 프로세스, 7일 킬 히스토리 |
| 시스템 정보 | CPU 모델/코어수, RAM 용량, OS 버전, 가동 시간 |
| CPU 급등 감지 | CPU 70%+ 비시스템 프로세스 발견 시 앱 내 알림 |

### 🔔 알림 & UX
| 기능 | 설명 |
|------|------|
| 인앱 토스트 알림 | 모든 작업 결과를 success/error/warning/info 토스트로 표시 |
| 알림 센터 | 헤더 벨 아이콘 드롭다운 — 자동 정리·메모리 경고·CPU 급등 이력 |
| OS 트레이 알림 | RAM 임계값 도달 시 Windows 알림 센터로 푸시 (히스테리시스 5%) |
| About 창 | 버전·기술 스택·GitHub 소스코드·릴리스 링크 |
| 업데이트 배너 | GitHub Releases API로 신규 버전 자동 감지, 세션당 1회 |
| 온보딩 투어 | 최초 실행 시 4단계 기능 소개 |

### ⚙️ 설정 & 프로세스 제어
| 기능 | 설명 |
|------|------|
| 설정 프리셋 | 🎮 게임 · 💼 업무 · 🔋 절전 모드 원클릭 전환 |
| 자동 정리 제외 시간대 | 특정 시간 범위 내 자동 정리 비활성화 |
| 우선순위 조절 | 우클릭 → CPU 낮춤 / 유휴 / 정상화 (SetPriorityClass) |
| 보호 프로세스 | 자동·수동 정리에서 제외할 프로세스 등록 |
| 보호 목록 즉시 추가 | 프로세스 행 우클릭 → 보호 목록에 바로 추가 |
| 설정 내보내기/가져오기 | JSON 파일로 백업 및 복원 |
| CPU 급등 감지 ON/OFF | 설정에서 토글 가능 |

### 📁 유틸리티
| 기능 | 설명 |
|------|------|
| Kill 히스토리 | 종료 기록 저장 + CSV 내보내기 |
| 디스크 정리 | TEMP·브라우저 캐시·Windows Update 캐시·휴지통 일괄 정리 |
| 시작 프로그램 관리 | 레지스트리 Run 키 기반 시작 프로그램 ON/OFF |
| 동적 트레이 아이콘 | RAM 사용률에 따라 🟢🟡🔴 색상 자동 변경 |
| 단일 인스턴스 | 앱 중복 실행 시 기존 창 포커스 |
| 다크/라이트 모드 | 전환 가능 |
| Windows 자동 시작 | 로그인 후 트레이에서 자동 실행 |

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

설정 창에서 카드를 클릭하면 즉시 적용됩니다.

---

## 📈 인사이트 탭

| 패널 | 내용 |
|------|------|
| 요약 통계 | 총 종료 수, 확보 메모리, 오늘 종료 수, 자동 정리 수 |
| TOP 5 프로세스 | 가장 자주 종료된 프로세스 (막대 차트) |
| 7일 추이 | 날짜별 종료 건수 막대 차트 |
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
| Tauri Plugins | notification, dialog, single-instance, opener |

---

## 🚀 개발 환경 설정

### 사전 요구사항

- [Node.js](https://nodejs.org/) LTS
- [Rust](https://rustup.rs/) stable
- [Tauri CLI](https://tauri.app/start/prerequisites/) (`npm install` 시 자동 설치)
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
git tag v1.0.0
git push origin v1.0.0
```

빌드 진행 상황: [GitHub Actions](https://github.com/Sangmoo/MemoryCleaner/actions)

---

## 📦 릴리스 히스토리

### v1.0.0 (2026-05-28)
- ✅ **인앱 토스트 알림** — alert() 전면 제거, 4종 토스트 시스템 (success/error/warning/info)
- ✅ **알림 센터** — 벨 아이콘 드롭다운, 자동 정리·메모리 경고·CPU 급등 이력 관리
- ✅ **About 창** — 버전·기술 스택·외부 링크 (opener 플러그인으로 OS 브라우저 연동)
- ✅ **전체 RAM 플러시** — 모든 비시스템 프로세스 WorkingSet 일괄 해제
- ✅ **단일 인스턴스** — 중복 실행 시 기존 창 포커스 (tauri-plugin-single-instance)
- ✅ **커스텀 앱 아이콘** — 메모리 칩 + 번개 디자인, 전 플랫폼 사이즈 자동 생성
- ✅ **GitHub Actions CI/CD** — 태그 push만으로 Windows 빌드 + 릴리스 자동화
- ✅ **외부 링크 수정** — Tauri WebView2 환경에서 버튼 클릭 시 OS 기본 브라우저 오픈

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
- ✅ 시스템 정보 패널 (CPU / RAM / OS / 가동 시간)

### v0.2.0
- ✅ 메모리 누수 감지 (PID별 롤링 윈도우 알고리즘)
- ✅ 키보드 단축키 (F5 / Ctrl+Q / Ctrl+A / Delete / Esc / ?)
- ✅ 설정 내보내기/가져오기 (JSON)
- ✅ 디스크 정리 확장 (Chrome/Edge 캐시, Windows Update, 휴지통)
- ✅ Before/After 게이지 애니메이션
- ✅ 프로세스 그룹화 (×N 배지)
- ✅ 동적 트레이 아이콘 (RAM 사용률 색상)
- ✅ 메모리 경고 알림 (히스테리시스 5%)
- ✅ 새로고침 간격 설정

### v0.1.0
- ✅ 프로세스 목록 (가상 스크롤)
- ✅ Quick Clean
- ✅ 자동 정리
- ✅ Kill 히스토리
- ✅ 시작 프로그램 관리

---

## 📄 라이선스

MIT © Sangmoo
