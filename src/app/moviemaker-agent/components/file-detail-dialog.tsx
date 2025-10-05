"use client";

import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDuration } from "../lib/transcription";
import { Save, X, Download } from "lucide-react";

interface FileDetailDialogProps {
  file: UploadedFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (fileId: string, updates: Partial<UploadedFile>) => void;
}

export function FileDetailDialog({
  file,
  open,
  onOpenChange,
  onSave,
}: FileDetailDialogProps) {
  const [summary, setSummary] = useState("");
  const [rawText, setRawText] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  // Update local state when file changes
  useEffect(() => {
    if (file) {
      setSummary(file.summary || "");
      setRawText(file.rawText || "");
      setHasChanges(false);
    }
  }, [file]);

  const handleSave = () => {
    if (!file) return;

    onSave(file.id, {
      summary,
      rawText,
    });

    setHasChanges(false);
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (file) {
      setSummary(file.summary || "");
      setRawText(file.rawText || "");
      setHasChanges(false);
    }
    onOpenChange(false);
  };

  const handleDownload = () => {
    if (!file) return;
    try {
      const blob = file.file;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name || "download";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (e) {
      console.error("Failed to download file", e);
    }
  };

  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {file.name}
            {file.indexed && (
              <Badge
                variant="outline"
                className="bg-green-500/10 text-green-500 border-green-500/20"
              >
                Indexed
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            View and edit file details, summary, and raw content
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Metadata */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Type</p>
              <p className="font-mono text-sm">{file.type.toUpperCase()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Size</p>
              <p className="font-mono text-sm">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            {file.duration && (
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="font-mono text-sm">
                  {formatDuration(file.duration)}
                </p>
              </div>
            )}
            {file.transcript?.transcription.language && (
              <div>
                <p className="text-xs text-muted-foreground">Language</p>
                <p className="font-mono text-sm">
                  {file.transcript.transcription.language.toUpperCase()}
                </p>
              </div>
            )}
            {file.transcript?.transcription.segments && (
              <div>
                <p className="text-xs text-muted-foreground">Segments</p>
                <p className="font-mono text-sm">
                  {file.transcript.transcription.segments.length}
                </p>
              </div>
            )}
            {file.transcript?.transcription.words && (
              <div>
                <p className="text-xs text-muted-foreground">Words</p>
                <p className="font-mono text-sm">
                  {file.transcript.transcription.words.length}
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Editable Content */}
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="rawtext">Raw Content</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-4">
              <div>
                <Label htmlFor="summary">Summary (Editable)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  A brief description of the file content
                </p>
                <Textarea
                  id="summary"
                  value={summary}
                  onChange={(e) => {
                    setSummary(e.target.value);
                    setHasChanges(true);
                  }}
                  placeholder="Enter a summary..."
                  className="min-h-[150px] font-mono text-sm"
                />
              </div>
            </TabsContent>

            <TabsContent value="rawtext" className="space-y-4">
              <div>
                <Label htmlFor="rawtext">Raw Text/Transcript (Editable)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  The full transcript or detailed content
                </p>
                <Textarea
                  id="rawtext"
                  value={rawText}
                  onChange={(e) => {
                    setRawText(e.target.value);
                    setHasChanges(true);
                  }}
                  placeholder="No raw content available..."
                  className="min-h-[300px] font-mono text-sm"
                />
                {file.transcript?.transcription.text && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Character count: {rawText.length} / Original:{" "}
                    {file.transcript.transcription.text.length}
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
