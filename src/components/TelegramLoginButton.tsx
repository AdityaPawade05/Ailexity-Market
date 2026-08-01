"use client";

import { useEffect, useRef } from "react";

interface TelegramLoginButtonProps {
  returnTo: string;
}

// Renders Telegram's official Login Widget (https://core.telegram.org/widgets/login).
// The widget script self-replaces with an iframe button; on success Telegram
// redirects the browser to data-auth-url with signed user data as query params,
// verified server-side in /api/integrations/telegram/callback.
export default function TelegramLoginButton({ returnTo }: TelegramLoginButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

  useEffect(() => {
    if (!botUsername || !containerRef.current) return;

    const authUrl = `${window.location.origin}/api/integrations/telegram/callback?returnTo=${encodeURIComponent(
      returnTo
    )}`;

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-auth-url", authUrl);
    script.setAttribute("data-request-access", "write");

    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(script);
  }, [botUsername, returnTo]);

  if (!botUsername) return null;

  return <div ref={containerRef} />;
}
