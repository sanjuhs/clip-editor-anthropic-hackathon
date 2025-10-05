import { TranscriptionResponse } from "./lib/transcription";

export interface UploadedFile {
  id: string;
  name: string;
  type: "audio" | "video" | "image" | "document";
  mimeType: string;
  size: number;
  file: File;
  uploadedAt: Date;
  indexed: boolean;
  summary?: string;
  // Audio/Video specific data
  transcript?: TranscriptionResponse;
  rawText?: string; // The full transcript text
  duration?: number; // Duration in seconds
  // Image specific data
  imageDescription?: {
    shortDescription: string;
    detailedAnalysis: string;
    colorScheme?: string;
    characters?: string[];
  };
}

export type ViewMode = "chat" | "table";
