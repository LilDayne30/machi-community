import { ArrowRight, Clock3 } from "lucide-react";

export function GoogleMark() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.3c1.9-1.7 2.9-4.2 2.9-7.4Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.9-.9 6.6-2.4l-3.3-2.5c-.9.6-2 1-3.3 1-2.6 0-4.8-1.7-5.6-4H3v2.6A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.4 14.1a6 6 0 0 1 0-4.2V7.3H3a10 10 0 0 0 0 9.4l3.4-2.6Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8A9.7 9.7 0 0 0 12 2a10 10 0 0 0-9 5.3l3.4 2.6c.8-2.3 3-4 5.6-4Z"
      />
    </svg>
  );
}

// ログインの入口。Googleログインが使えない間は、利用者向けの準備中の案内だけを出す。
export function GoogleLogin({ available }: { available: boolean }) {
  if (available)
    return (
      <a href="/api/auth/google" className="button google-button">
        <GoogleMark />
        Googleで続ける
        <ArrowRight size={17} aria-hidden="true" />
      </a>
    );
  return (
    <p className="login-pending">
      <Clock3 size={18} aria-hidden="true" />
      <span>
        <strong>Googleログインは準備中です</strong>
        ご利用いただけるようになるまで、しばらくお待ちください。
      </span>
    </p>
  );
}
