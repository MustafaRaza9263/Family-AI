"use client";

import { Menu } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";

type ChatHeaderProps = {
  title: string;
  onOpenSidebar?: () => void;
};

export function ChatHeader({ title, onOpenSidebar }: ChatHeaderProps) {
  return (
    <header className="flex items-center gap-3 px-4 py-3">
      {onOpenSidebar ? (
        <IconButton
          label="Open conversations"
          className="lg:hidden"
          onClick={onOpenSidebar}
        >
          <Menu className="size-5" />
        </IconButton>
      ) : null}
      <h1 className="min-w-0 flex-1 truncate text-[17px] font-semibold">
        {title}
      </h1>
    </header>
  );
}
