"use client";

import { Suspense } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { ChatPage } from "@/components/chat/ChatPage";
import { Spinner } from "@/components/ui/Spinner";

export default function HomePage() {
  return (
    <RequireAuth>
      <Suspense
        fallback={
          <div className="flex min-h-dvh items-center justify-center bg-bg">
            <Spinner size="lg" />
          </div>
        }
      >
        <ChatPage />
      </Suspense>
    </RequireAuth>
  );
}
