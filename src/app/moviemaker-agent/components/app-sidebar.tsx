"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MessageSquare, Table, Settings, Info } from "lucide-react";
import { ViewMode } from "../types";

interface AppSidebarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  fileCount: number;
}

export function AppSidebar({
  viewMode,
  onViewModeChange,
  fileCount,
}: AppSidebarProps) {
  const navItems = [
    {
      icon: MessageSquare,
      label: "Chat",
      mode: "chat" as ViewMode,
      description: "AI Assistant",
    },
    {
      icon: Table,
      label: "Files",
      mode: "table" as ViewMode,
      description: `${fileCount} uploaded`,
    },
  ];

  return (
    <div className="flex flex-col h-full bg-muted/30 border-r border-border w-64">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-sm text-muted-foreground">
          WORKSPACE
        </h2>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <Button
            key={item.mode}
            variant={viewMode === item.mode ? "secondary" : "ghost"}
            className="w-full justify-start gap-3"
            onClick={() => onViewModeChange(item.mode)}
          >
            <item.icon className="h-4 w-4" />
            <div className="flex flex-col items-start flex-1">
              <span className="text-sm font-medium">{item.label}</span>
              <span className="text-xs text-muted-foreground">
                {item.description}
              </span>
            </div>
          </Button>
        ))}
      </div>

      <Separator />

      {/* Footer */}
      <div className="p-2 space-y-1">
        <Button variant="ghost" className="w-full justify-start gap-3">
          <Settings className="h-4 w-4" />
          <span className="text-sm">Settings</span>
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-3">
          <Info className="h-4 w-4" />
          <span className="text-sm">About</span>
        </Button>
      </div>
    </div>
  );
}
