"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Music, Video, Image, FileText, Paperclip } from "lucide-react";

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  disabled?: boolean;
}

export function FileUpload({ onFileSelect, disabled }: FileUploadProps) {
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const allFilesInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFileSelect(files);
    }
    // Reset input
    e.target.value = "";
  };

  const uploadButtons = [
    {
      icon: Music,
      label: "Audio",
      ref: audioInputRef,
      accept: "audio/*",
      color: "text-blue-500",
    },
    {
      icon: Video,
      label: "Video",
      ref: videoInputRef,
      accept: "video/*",
      color: "text-purple-500",
    },
    {
      icon: Image,
      label: "Image",
      ref: imageInputRef,
      accept: "image/*",
      color: "text-green-500",
    },
    {
      icon: FileText,
      label: "Document",
      ref: documentInputRef,
      accept: ".txt,.md,.pdf,.doc,.docx",
      color: "text-orange-500",
    },
    {
      icon: Paperclip,
      label: "Any File",
      ref: allFilesInputRef,
      accept: "*",
      color: "text-muted-foreground",
    },
  ];

  return (
    <div className="flex items-center gap-1">
      {uploadButtons.map((button) => (
        <div key={button.label}>
          <input
            ref={button.ref}
            type="file"
            multiple
            accept={button.accept}
            onChange={handleFileChange}
            className="hidden"
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => button.ref.current?.click()}
                disabled={disabled}
              >
                <button.icon className={`h-4 w-4 ${button.color}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Upload {button.label}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      ))}
    </div>
  );
}
