// ── 전역 토스트 (alert 대체) ────────────────────────────────────────────
// App.tsx에서 register() 를 한 번 호출하면 이후 어떤 컴포넌트에서도 사용 가능

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

type ToastFn = (type: ToastType, message: string, title?: string) => void;

let _fn: ToastFn | null = null;

function show(type: ToastType, message: string, title?: string) {
  if (_fn) {
    _fn(type, message, title);
  } else {
    // fallback: App이 아직 마운트 안 됐을 경우
    console.warn(`[toast:${type}]`, title ?? "", message);
  }
}

export const toast = {
  register(fn: ToastFn) { _fn = fn; },
  success(message: string, title?: string) { show("success", message, title); },
  error(message: string, title?: string)   { show("error",   message, title); },
  warning(message: string, title?: string) { show("warning", message, title); },
  info(message: string, title?: string)    { show("info",    message, title); },
};
