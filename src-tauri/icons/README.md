# Icons

빌드 전에 아이콘을 추가해야 합니다. 가장 빠른 방법:

```bash
# 1024x1024 PNG 한 장을 준비한 뒤
npx @tauri-apps/cli icon src-tauri/icons/icon.png
```

이 명령이 `icon.png`, `icon.ico`, `icon.icns`, 다양한 사이즈 PNG를 자동 생성합니다.

임시로 동작 확인만 원한다면, `tauri.conf.json`의 `bundle.icon` 배열을 비우거나
공식 Tauri 샘플 아이콘을 다운받아 `icon.png`로 저장하세요.
