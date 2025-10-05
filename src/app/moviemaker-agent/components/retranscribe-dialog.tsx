"use client";

import { useState } from "react";
import { UploadedFile } from "../types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RefreshCw, X } from "lucide-react";

interface RetranscribeDialogProps {
  file: UploadedFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetranscribe: (fileId: string, language?: string, prompt?: string) => void;
}

const COMMON_LANGUAGES = [
  { code: "auto", name: "Auto-detect" },
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "kn", name: "Kannada" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "ml", name: "Malayalam" },
  { code: "bn", name: "Bengali" },
  { code: "mr", name: "Marathi" },
  { code: "gu", name: "Gujarati" },
];

export function RetranscribeDialog({
  file,
  open,
  onOpenChange,
  onRetranscribe,
}: RetranscribeDialogProps) {
  const [language, setLanguage] = useState("auto");
  const [prompt, setPrompt] = useState("");

  const handleRetranscribe = () => {
    if (!file) return;

    onRetranscribe(
      file.id,
      language === "auto" ? undefined : language,
      prompt.trim() || undefined
    );

    setLanguage("auto");
    setPrompt("");
    onOpenChange(false);
  };

  const handleCancel = () => {
    setLanguage("auto");
    setPrompt("");
    onOpenChange(false);
  };

  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Re-transcribe Audio</DialogTitle>
          <DialogDescription>
            Re-process "{file.name}" with different settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Language Selection */}
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {COMMON_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Specify the language if auto-detection failed. This improves
              accuracy.
            </p>
          </div>

          {/* Context Prompt */}
          <div className="space-y-2">
            <Label htmlFor="prompt">Context Prompt (Optional)</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., This is a medical consultation about diabetes treatment..."
              className="min-h-[100px] text-sm"
              maxLength={224}
            />
            <p className="text-xs text-muted-foreground">
              Provide context about the audio content for better accuracy. Max
              224 tokens.
            </p>
            {prompt.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Characters: {prompt.length} / 224
              </p>
            )}
          </div>

          {/* Warning */}
          <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <p className="text-xs text-orange-600 dark:text-orange-400">
              ⚠️ Re-transcribing will overwrite the existing transcript and
              summary. Consider making a backup if needed.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleRetranscribe}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Re-transcribe
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
