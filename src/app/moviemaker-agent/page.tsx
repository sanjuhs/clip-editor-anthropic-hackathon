"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Sparkles, Upload, Video, Menu } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "./components/app-sidebar";
import { FileUpload } from "./components/file-upload";
import { FileTable } from "./components/file-table";
import { UploadedFile, ViewMode } from "./types";
import { fileStorage } from "./lib/indexeddb";
import { transcribeAudio } from "./lib/transcription";
import {
  extractFramesPerSecond,
  describeFrames,
  buildCombinedRawText,
  buildSummary,
} from "./lib/video";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function MovieMakerAgent() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I'm your Movie Maker Agent. I can help you transform your long-form videos into engaging short clips perfect for social media.\n\nWhat would you like to create today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load files from IndexedDB on mount
  useEffect(() => {
    const loadFiles = async () => {
      try {
        await fileStorage.init();
        const files = await fileStorage.getFiles();
        setUploadedFiles(files);
      } catch (error) {
        console.error("Error loading files:", error);
      }
    };
    loadFiles();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response (replace with actual AI integration later)
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "I understand you want to work with video content. I'm currently in development mode, but soon I'll be able to help you:\n\n• Analyze your video content\n• Identify key moments and highlights\n• Generate optimized clips for different platforms\n• Add captions and effects\n\nStay tuned for more features!",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = async (files: File[]) => {
    try {
      const newFiles: UploadedFile[] = files.map((file) => {
        const fileType = file.type.startsWith("audio/")
          ? "audio"
          : file.type.startsWith("video/")
          ? "video"
          : file.type.startsWith("image/")
          ? "image"
          : "document";

        return {
          id: `${Date.now()}-${file.name}`,
          name: file.name,
          type: fileType,
          mimeType: file.type,
          size: file.size,
          file: file,
          uploadedAt: new Date(),
          indexed: false,
        };
      });

      // Save to IndexedDB
      for (const file of newFiles) {
        await fileStorage.addFile(file);
      }

      setUploadedFiles((prev) => [...prev, ...newFiles]);

      // Add a message about the upload
      const uploadMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `✓ Successfully uploaded ${files.length} file${
          files.length > 1 ? "s" : ""
        }:\n${files
          .map((f) => `• ${f.name}`)
          .join("\n")}\n\nI'll start indexing these files shortly.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, uploadMessage]);

      // Start processing files
      processFiles(newFiles);
    } catch (error) {
      console.error("Error uploading files:", error);
    }
  };

  const processFiles = async (files: UploadedFile[]) => {
    for (const uploadedFile of files) {
      if (uploadedFile.type === "audio" || uploadedFile.type === "video") {
        // Notify user that transcription is starting
        const transcriptStartMessage: Message = {
          id: `${Date.now()}-transcript-start`,
          role: "assistant",
          content: `🎙️ Starting transcription for "${uploadedFile.name}"...`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, transcriptStartMessage]);

        try {
          // Transcribe the audio
          const transcription = await transcribeAudio({
            file: uploadedFile.file,
            model: "whisper-large-v3-turbo",
            responseFormat: "verbose_json",
            timestampGranularities: ["word", "segment"],
          });

          // If video, extract keyframes and generate visual captions
          let combinedRawText = transcription.transcription.text || "";
          let combinedSummary = "";

          if (uploadedFile.type === "video") {
            try {
              const approxDuration = Math.floor(
                transcription.transcription.duration || 0
              );
              const frames = await extractFramesPerSecond(uploadedFile.file, {
                maxSeconds: approxDuration > 0 ? approxDuration : 60,
                quality: 0.7,
              });
              const captions = await describeFrames(frames);
              combinedRawText = buildCombinedRawText(
                transcription.transcription.text,
                captions
              );
              combinedSummary = buildSummary(
                transcription.transcription.text,
                captions
              );
            } catch (e) {
              // Fallback to transcript-only if visual analysis fails
              combinedRawText = transcription.transcription.text || "";
              combinedSummary = `Transcribed audio (${
                transcription.transcription.language || "auto-detected"
              }).`;
            }
          } else {
            // Audio only
            combinedRawText = transcription.transcription.text || "";
            combinedSummary = `Transcribed audio (${
              transcription.transcription.language || "auto-detected"
            }).`;
          }

          // Update the file with combined transcript and visual data
          const updatedFile: UploadedFile = {
            ...uploadedFile,
            transcript: transcription,
            rawText: combinedRawText,
            duration: transcription.transcription.duration,
            indexed: true,
            summary: combinedSummary,
          };

          // Update in IndexedDB
          await fileStorage.updateFile(updatedFile);

          // Update state
          setUploadedFiles((prev) =>
            prev.map((f) => (f.id === uploadedFile.id ? updatedFile : f))
          );

          // Notify success with preview
          const preview = (updatedFile.rawText || "").substring(0, 200);
          const transcriptDoneMessage: Message = {
            id: `${Date.now()}-transcript-done`,
            role: "assistant",
            content: `✅ Transcription complete for "${
              uploadedFile.name
            }"!\n\n**Preview:**\n"${preview}${
              (updatedFile.rawText || "").length > 200 ? "..." : ""
            }"\n\n**Details:**\n• Language: ${
              transcription.transcription.language || "auto-detected"
            }\n• Duration: ${Math.floor(
              transcription.transcription.duration || 0
            )}s\n• Segments: ${
              transcription.transcription.segments?.length || 0
            }\n• Words: ${transcription.transcription.words?.length || 0}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, transcriptDoneMessage]);
        } catch (error: any) {
          console.error("Transcription error:", error);

          // Update file to mark as failed
          const failedFile: UploadedFile = {
            ...uploadedFile,
            indexed: false,
            summary: `Transcription failed: ${error.message}`,
          };
          await fileStorage.updateFile(failedFile);
          setUploadedFiles((prev) =>
            prev.map((f) => (f.id === uploadedFile.id ? failedFile : f))
          );

          // Notify user of error
          const errorMessage: Message = {
            id: `${Date.now()}-transcript-error`,
            role: "assistant",
            content: `❌ Failed to transcribe "${uploadedFile.name}": ${error.message}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        }
      }
      // TODO: Add processing for images, videos, and documents
    }
  };

  const handleDeleteFile = async (id: string) => {
    try {
      await fileStorage.deleteFile(id);
      setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  };

  const handleUpdateFile = async (
    fileId: string,
    updates: Partial<UploadedFile>
  ) => {
    try {
      const fileToUpdate = uploadedFiles.find((f) => f.id === fileId);
      if (!fileToUpdate) return;

      const updatedFile = { ...fileToUpdate, ...updates };
      await fileStorage.updateFile(updatedFile);
      setUploadedFiles((prev) =>
        prev.map((f) => (f.id === fileId ? updatedFile : f))
      );

      // Notify user
      const updateMessage: Message = {
        id: `${Date.now()}-update`,
        role: "assistant",
        content: `✅ Updated "${fileToUpdate.name}"`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, updateMessage]);
    } catch (error) {
      console.error("Error updating file:", error);
    }
  };

  const handleRetranscribe = async (
    fileId: string,
    language?: string,
    prompt?: string
  ) => {
    try {
      const fileToRetranscribe = uploadedFiles.find((f) => f.id === fileId);
      if (!fileToRetranscribe) return;

      // Mark as not indexed
      const pendingFile = { ...fileToRetranscribe, indexed: false };
      await fileStorage.updateFile(pendingFile);
      setUploadedFiles((prev) =>
        prev.map((f) => (f.id === fileId ? pendingFile : f))
      );

      // Notify user
      const startMessage: Message = {
        id: `${Date.now()}-retranscribe-start`,
        role: "assistant",
        content: `🎙️ Re-transcribing "${fileToRetranscribe.name}"${
          language ? ` as ${language.toUpperCase()}` : ""
        }...`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, startMessage]);

      // Start transcription
      try {
        const transcription = await transcribeAudio({
          file: fileToRetranscribe.file,
          model: "whisper-large-v3-turbo",
          responseFormat: "verbose_json",
          timestampGranularities: ["word", "segment"],
          language,
          prompt,
        });

        // Update the file with new transcript
        const updatedFile: UploadedFile = {
          ...fileToRetranscribe,
          transcript: transcription,
          rawText: transcription.transcription.text,
          duration: transcription.transcription.duration,
          indexed: true,
          summary: `Transcribed audio (${
            transcription.transcription.language || "auto-detected"
          }). Duration: ${Math.floor(
            transcription.transcription.duration || 0
          )}s. ${transcription.transcription.segments?.length || 0} segments.`,
        };

        await fileStorage.updateFile(updatedFile);
        setUploadedFiles((prev) =>
          prev.map((f) => (f.id === fileId ? updatedFile : f))
        );

        // Notify success
        const preview = transcription.transcription.text.substring(0, 200);
        const successMessage: Message = {
          id: `${Date.now()}-retranscribe-done`,
          role: "assistant",
          content: `✅ Re-transcription complete!\n\n**Preview:**\n"${preview}${
            transcription.transcription.text.length > 200 ? "..." : ""
          }"\n\n**Language:** ${
            transcription.transcription.language || "auto-detected"
          }`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, successMessage]);
      } catch (error: any) {
        console.error("Re-transcription error:", error);

        const errorMessage: Message = {
          id: `${Date.now()}-retranscribe-error`,
          role: "assistant",
          content: `❌ Re-transcription failed: ${error.message}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("Error re-transcribing file:", error);
    }
  };

  const quickActions = [
    { icon: Upload, label: "Upload Video", action: "I want to upload a video" },
    {
      icon: Video,
      label: "Create Clips",
      action: "Help me create short clips",
    },
    {
      icon: Sparkles,
      label: "Auto-Generate",
      action: "Automatically generate clips from my video",
    },
  ];

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        {sidebarOpen && (
          <AppSidebar
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            fileCount={uploadedFiles.length}
          />
        )}

        {/* Main Content */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Header */}
          <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="px-4 h-16 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <Link href="/">
                  <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-foreground text-background flex items-center justify-center">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="font-semibold text-lg">Movie Maker Agent</h1>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-muted/50">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-xs font-mono">Ready</span>
                </div>
              </div>
            </div>
          </header>

          {/* Content Area - Chat or Table */}
          {viewMode === "chat" ? (
            <>
              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto">
                <div className="container mx-auto px-4 py-8 max-w-4xl">
                  <div className="space-y-6">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-4 ${
                          message.role === "user"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        {message.role === "assistant" && (
                          <Avatar className="h-8 w-8 border border-border">
                            <AvatarFallback className="bg-foreground text-background">
                              <Sparkles className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={`max-w-[80%] ${
                            message.role === "user"
                              ? "bg-foreground text-background"
                              : "bg-muted"
                          } rounded-2xl px-4 py-3`}
                        >
                          <p className="text-sm whitespace-pre-wrap">
                            {message.content}
                          </p>
                        </div>
                        {message.role === "user" && (
                          <Avatar className="h-8 w-8 border border-border">
                            <AvatarFallback className="bg-muted text-foreground">
                              You
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))}

                    {isLoading && (
                      <div className="flex gap-4">
                        <Avatar className="h-8 w-8 border border-border">
                          <AvatarFallback className="bg-foreground text-background">
                            <Sparkles className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="bg-muted rounded-2xl px-4 py-3">
                          <div className="flex gap-1">
                            <div
                              className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
                              style={{ animationDelay: "0ms" }}
                            />
                            <div
                              className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
                              style={{ animationDelay: "150ms" }}
                            />
                            <div
                              className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
                              style={{ animationDelay: "300ms" }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Quick Actions - Show only when no messages except welcome */}
                  {messages.length === 1 && (
                    <div className="mt-8 space-y-4">
                      <p className="text-sm text-muted-foreground text-center">
                        Quick actions
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {quickActions.map((action, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            className="h-auto flex-col items-start p-4 hover:bg-accent"
                            onClick={() => setInput(action.action)}
                          >
                            <action.icon className="h-5 w-5 mb-2" />
                            <span className="font-medium text-sm">
                              {action.label}
                            </span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Input Area */}
              <div className="border-t border-border bg-background">
                <div className="container mx-auto px-4 py-4 max-w-4xl">
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="flex gap-2">
                      <FileUpload
                        onFileSelect={handleFileSelect}
                        disabled={isLoading}
                      />
                      <div className="relative flex-1">
                        <Textarea
                          ref={textareaRef}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder="Describe what you want to create..."
                          className="min-h-[60px] max-h-[200px] resize-none pr-12 border-border"
                          disabled={isLoading}
                        />
                        <Button
                          type="submit"
                          size="icon"
                          disabled={!input.trim() || isLoading}
                          className="absolute bottom-2 right-2 h-8 w-8"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Press Enter to send, Shift+Enter for new line
                    </p>
                  </form>
                </div>
              </div>
            </>
          ) : (
            /* Table View */
            <div className="flex-1 overflow-y-auto p-8">
              <FileTable
                files={uploadedFiles}
                onDeleteFile={handleDeleteFile}
                onUpdateFile={handleUpdateFile}
                onRetranscribe={handleRetranscribe}
              />
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
