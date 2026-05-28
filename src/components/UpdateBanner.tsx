import { useEffect, useState } from "react";
import { X, Download, ExternalLink } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";

const CURRENT_VERSION = "1.0.0";
const REPO = "Sangmoo/MemoryCleaner";
const RELEASES_URL = `https://api.github.com/repos/${REPO}/releases/latest`;
const RELEASES_PAGE = `https://github.com/${REPO}/releases/latest`;

interface GithubRelease {
  tag_name: string;
  html_url: string;
  name: string;
}

function semverGt(a: string, b: string): boolean {
  const parse = (v: string) => v.replace(/^v/, "").split(".").map(Number);
  const [a0, a1, a2] = parse(a);
  const [b0, b1, b2] = parse(b);
  if (a0 !== b0) return a0 > b0;
  if (a1 !== b1) return a1 > b1;
  return a2 > b2;
}

export function UpdateBanner() {
  const [release, setRelease] = useState<GithubRelease | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // 세션당 1회만 체크
    const key = "mc-update-dismissed";
    if (sessionStorage.getItem(key)) { setDismissed(true); return; }

    fetch(RELEASES_URL, { headers: { Accept: "application/vnd.github+json" } })
      .then(r => r.json())
      .then((data: GithubRelease) => {
        if (data.tag_name && semverGt(data.tag_name, CURRENT_VERSION)) {
          setRelease(data);
        }
      })
      .catch(() => {}); // 네트워크 오류 시 조용히 무시
  }, []);

  const dismiss = () => {
    sessionStorage.setItem("mc-update-dismissed", "1");
    setDismissed(true);
  };

  if (!release || dismissed) return null;

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-brand-600 text-white text-xs animate-fade-in">
      <div className="flex items-center gap-2">
        <Download className="w-3.5 h-3.5 flex-shrink-0" />
        <span>
          새 버전 <strong>{release.tag_name}</strong> 이 출시됐습니다!
        </span>
        <button
          onClick={() => openUrl(release.html_url)}
          className="flex items-center gap-1 underline underline-offset-2 hover:opacity-80 ml-1"
        >
          다운로드
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
      <button onClick={dismiss} className="p-0.5 hover:opacity-70 flex-shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
