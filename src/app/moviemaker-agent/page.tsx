"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
  extractSmartKeyframes,
  describeFrames,
  buildCombinedRawText,
  buildSummary,
  describeImage,
} from "./lib/video";
import {
  extractTextFromDocument,
  summarizeDocument,
  analyzeDocumentStructure,
} from "./lib/document";
import {
  Message,
  searchRelevantFiles,
  buildContextFromFiles,
  buildFullPrompt,
  callGroqAPI,
  callGroqAPIWithTools,
  streamResponse,
} from "./lib/agent-chat";

export default function MovieMakerAgent() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I'm your Movie Maker AI Agent. I can help you transform your long-form content into engaging short clips perfect for social media.\n\n**What I can do:**\n• Analyze your uploaded videos, audio, documents, and images\n• Answer questions about your content\n• Identify key moments and highlights from transcripts\n• Create detailed editing timelines with exact timestamps from your assets\n• Provide TWO clip options: one using only your current files, and one with suggestions for additional assets\n• Generate complete video editing plans with video, audio, picture overlays, and text overlay specifications\n\n**My clip suggestions include:**\n• **File Reference Table** - Clear mapping of File 1, File 2, etc. to actual filenames\n• **Detailed Timeline Table** - Showing exactly when to use which asset\n• **Video Assets** - Which file and precise timestamps to extract from\n• **Audio Assets** - What audio to use and when (can mix from different files)\n• **Picture Overlays** - Logos, graphics, or images to overlay on video with position (top-left, center, etc.)\n• **Text Overlays** - What text to display, when, and where\n• **Creative Rationale** - Why each choice works for engagement\n\n**To get started:**\n1. Upload your files using the upload button below\n2. I'll automatically transcribe and analyze them\n3. Ask me to suggest clip ideas or ask questions about your content\n\nWhat would you like to create today?",
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

  // Debug: expose a manual composeVideo runner in the browser console
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__runComposeVideoDebug = async (args: any) => {
        console.log("__runComposeVideoDebug called with:", args);
        const { executeToolCall } = await import("./lib/agent-tools");
        const result = await executeToolCall(
          "composeVideo",
          args,
          (stage, progress) =>
            console.log(`[DEBUG composeVideo] ${stage}: ${progress}%`)
        );
        console.log("__runComposeVideoDebug result:", result);
        return result;
      };
      console.log("Registered window.__runComposeVideoDebug(args)");
    }
  }, []);

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
    const currentInput = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      // Search for relevant files based on user query
      const relevantFiles = searchRelevantFiles(currentInput, uploadedFiles);
      const filesContext = buildContextFromFiles(relevantFiles);

      // Build the full prompt with context and conversation history
      const fullPrompt = buildFullPrompt(currentInput, filesContext, messages);

      // Always check tools first (non-streaming), then fall back to streaming if none
      console.log("[Chat] Tool-check: calling callGroqAPIWithTools with tools");
      const response = await callGroqAPIWithTools(
        [
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: currentInput },
        ],
        uploadedFiles
      );
      console.log("[Chat] Tool-check response:", response);

      // Show assistant content regardless
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.content || "Processing your request...",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      const toolCalls = response.toolCalls || [];
      if (toolCalls.length > 0) {
        console.log(`[Chat] Executing ${toolCalls.length} tool call(s)`);

        for (let idx = 0; idx < toolCalls.length; idx++) {
          const toolCall = toolCalls[idx];

          const toolMessage: Message = {
            id: (Date.now() + 2 + idx).toString(),
            role: "assistant",
            content: `🎬 **Starting Tool ${idx + 1}/${
              toolCalls.length
            }**\n\n**Tool:** ${toolCall.name}\n**Segments:** ${
              toolCall.arguments.timeline?.length || 0
            }\n\n*Progress: 0%*`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, toolMessage]);

          console.log(
            "[Chat] executeToolCall →",
            toolCall.name,
            toolCall.arguments
          );
          const { executeToolCall } = await import("./lib/agent-tools");

          let currentStage = "Initializing";
          let currentProgress = 0;

          const toolResult = await executeToolCall(
            toolCall.name,
            toolCall.arguments,
            (stage, progress) => {
              currentStage = stage;
              currentProgress = Math.round(progress);
              const progressBar =
                "█".repeat(Math.floor(currentProgress / 5)) +
                "░".repeat(20 - Math.floor(currentProgress / 5));
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === toolMessage.id
                    ? {
                        ...msg,
                        content: `🎬 **Video Processing**\n\n**Current Stage:** ${stage}\n\n[\`${progressBar}\`] ${currentProgress}%\n\n---\n\n**Tool:** ${
                          toolCall.name
                        }\n**Segments:** ${
                          toolCall.arguments.timeline?.length || 0
                        }\n\n*Client-side via FFmpeg.wasm*`,
                      }
                    : msg
                )
              );
            }
          );

          const resultMessage: Message = {
            id: (Date.now() + 100 + idx).toString(),
            role: "assistant",
            content: toolResult.success
              ? `✅ **${
                  toolResult.message
                }**\n\n📹 **Video Details:**\n- **File Name:** ${
                  toolResult.data?.fileName || "Unknown"
                }\n- **Size:** ${
                  toolResult.data?.sizeMB || "Unknown"
                } MB\n- **Duration:** ${
                  toolResult.data?.duration || 0
                }s\n- **Segments Processed:** ${
                  toolResult.data?.trimmedSegments || 0
                }\n\n💾 **Saved to:** IndexedDB (File ID: \`${
                  toolResult.data?.fileId
                }\`)\n\n${
                  toolResult.data?.note
                    ? `📝 **Note:** ${toolResult.data.note}`
                    : ""
                }\n\n🎉 Your video is ready!`
              : `❌ **Error:** ${toolResult.error}\n\n${toolResult.message}`,
            timestamp: new Date(),
            toolResult: toolResult,
          };
          setMessages((prev) => [...prev, resultMessage]);

          if (toolResult.success && toolResult.data?.fileId) {
            const updatedFiles = await fileStorage.getFiles();
            setUploadedFiles(updatedFiles);
          }
        }

        setIsLoading(false);
        return;
      }

      // No tool calls → stream regular content (send tools=true for consistency)
      const stream = await callGroqAPI(fullPrompt, true);

      let assistantContent = "";
      const assistantMessageId = (Date.now() + 1000).toString();
      const assistantStreamingMsg: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantStreamingMsg]);

      for await (const chunk of streamResponse(stream)) {
        assistantContent += chunk;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: assistantContent }
              : msg
          )
        );
      }

      setIsLoading(false);
    } catch (error: any) {
      console.error("Chat error:", error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `❌ Sorry, I encountered an error: ${error.message}\n\nPlease make sure the API is properly configured and try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsLoading(false);
    }
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
        const fileSizeMB = (uploadedFile.size / (1024 * 1024)).toFixed(2);
        const transcriptStartMessage: Message = {
          id: `${Date.now()}-transcript-start`,
          role: "assistant",
          content: `🎙️ Starting transcription for "${uploadedFile.name}" (${fileSizeMB}MB)...`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, transcriptStartMessage]);

        try {
          // Transcribe the audio with progress tracking
          const transcription = await transcribeAudio({
            file: uploadedFile.file,
            model: "whisper-large-v3-turbo",
            responseFormat: "verbose_json",
            timestampGranularities: ["word", "segment"],
            onProgress: (progress) => {
              // Update progress message
              const progressMsg: Message = {
                id: `${Date.now()}-progress-${progress.current}`,
                role: "assistant",
                content: `📝 Transcribing chunk ${progress.current}/${progress.total} (${progress.percentage}%)...`,
                timestamp: new Date(),
              };
              setMessages((prev) => {
                // Replace last progress message or add new one
                const lastMsg = prev[prev.length - 1];
                if (lastMsg?.content.includes("Transcribing chunk")) {
                  return [...prev.slice(0, -1), progressMsg];
                }
                return [...prev, progressMsg];
              });
            },
          });

          // If video, extract keyframes and generate visual captions
          let combinedRawText = transcription.transcription.text || "";
          let combinedSummary = "";

          if (uploadedFile.type === "video") {
            try {
              // Use smart keyframe extraction with transcript segments
              const frames = await extractSmartKeyframes(uploadedFile.file, {
                quality: 0.7,
                segments: transcription.transcription.segments,
                maxFrames: 100,
              });

              const frameCount = frames.length;
              const statusMsg: Message = {
                id: `${Date.now()}-frames`,
                role: "assistant",
                content: `📸 Extracted ${frameCount} keyframes. Analyzing visuals...`,
                timestamp: new Date(),
              };
              setMessages((prev) => [...prev, statusMsg]);

              // NOTE: Groq Llama Vision API supports max 5 images per request
              // describeFrames batches frames in groups of 5 and processes them in parallel
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
      } else if (uploadedFile.type === "image") {
        // Process images with visual analysis
        const imageStartMessage: Message = {
          id: `${Date.now()}-image-start`,
          role: "assistant",
          content: `🖼️ Analyzing image "${uploadedFile.name}"...`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, imageStartMessage]);

        try {
          // Convert File to data URL
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(uploadedFile.file);
          });

          // Get image descriptions
          const { description, detailedAnalysis } = await describeImage(
            dataUrl
          );

          // Update file with image data
          const updatedFile: UploadedFile = {
            ...uploadedFile,
            summary: description,
            rawText: detailedAnalysis,
            indexed: true,
            imageDescription: {
              shortDescription: description,
              detailedAnalysis: detailedAnalysis,
            },
          };

          await fileStorage.updateFile(updatedFile);
          setUploadedFiles((prev) =>
            prev.map((f) => (f.id === uploadedFile.id ? updatedFile : f))
          );

          // Notify success
          const imageDoneMessage: Message = {
            id: `${Date.now()}-image-done`,
            role: "assistant",
            content: `✅ Image analysis complete for "${uploadedFile.name}"!\n\n**Summary:** ${description}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, imageDoneMessage]);
        } catch (error: any) {
          console.error("Image analysis error:", error);

          const failedFile: UploadedFile = {
            ...uploadedFile,
            indexed: false,
            summary: `Image analysis failed: ${error.message}`,
          };
          await fileStorage.updateFile(failedFile);
          setUploadedFiles((prev) =>
            prev.map((f) => (f.id === uploadedFile.id ? failedFile : f))
          );

          const errorMessage: Message = {
            id: `${Date.now()}-image-error`,
            role: "assistant",
            content: `❌ Failed to analyze "${uploadedFile.name}": ${error.message}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        }
      } else if (uploadedFile.type === "document") {
        // Process documents with text extraction
        const docStartMessage: Message = {
          id: `${Date.now()}-doc-start`,
          role: "assistant",
          content: `📄 Processing document "${uploadedFile.name}"...`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, docStartMessage]);

        try {
          // Extract text from document
          const { text, preview } = await extractTextFromDocument(
            uploadedFile.file
          );

          // Analyze document structure
          const stats = analyzeDocumentStructure(text);

          // Generate summary
          const summary = await summarizeDocument(text, uploadedFile.name);

          // Update file with document data
          const updatedFile: UploadedFile = {
            ...uploadedFile,
            summary: summary,
            rawText: text,
            indexed: true,
          };

          await fileStorage.updateFile(updatedFile);
          setUploadedFiles((prev) =>
            prev.map((f) => (f.id === uploadedFile.id ? updatedFile : f))
          );

          // Notify success
          const docDoneMessage: Message = {
            id: `${Date.now()}-doc-done`,
            role: "assistant",
            content: `✅ Document processed successfully!\n\n**File:** ${uploadedFile.name}\n**Statistics:**\n• Words: ${stats.wordCount}\n• Characters: ${stats.charCount}\n• Lines: ${stats.lineCount}\n• Paragraphs: ${stats.paragraphCount}\n\n**Preview:**\n"${preview}..."`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, docDoneMessage]);
        } catch (error: any) {
          console.error("Document processing error:", error);

          const failedFile: UploadedFile = {
            ...uploadedFile,
            indexed: false,
            summary: `Document processing failed: ${error.message}`,
          };
          await fileStorage.updateFile(failedFile);
          setUploadedFiles((prev) =>
            prev.map((f) => (f.id === uploadedFile.id ? failedFile : f))
          );

          const errorMessage: Message = {
            id: `${Date.now()}-doc-error`,
            role: "assistant",
            content: `❌ Failed to process "${uploadedFile.name}": ${error.message}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        }
      }
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
      const fileSizeMB = (fileToRetranscribe.size / (1024 * 1024)).toFixed(2);
      const startMessage: Message = {
        id: `${Date.now()}-retranscribe-start`,
        role: "assistant",
        content: `🎙️ Re-transcribing "${
          fileToRetranscribe.name
        }" (${fileSizeMB}MB)${
          language ? ` as ${language.toUpperCase()}` : ""
        }...`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, startMessage]);

      // Start transcription with progress
      try {
        const transcription = await transcribeAudio({
          file: fileToRetranscribe.file,
          model: "whisper-large-v3-turbo",
          responseFormat: "verbose_json",
          timestampGranularities: ["word", "segment"],
          language,
          prompt,
          onProgress: (progress) => {
            const progressMsg: Message = {
              id: `${Date.now()}-retrans-progress-${progress.current}`,
              role: "assistant",
              content: `📝 Re-transcribing chunk ${progress.current}/${progress.total} (${progress.percentage}%)...`,
              timestamp: new Date(),
            };
            setMessages((prev) => {
              const lastMsg = prev[prev.length - 1];
              if (lastMsg?.content.includes("Re-transcribing chunk")) {
                return [...prev.slice(0, -1), progressMsg];
              }
              return [...prev, progressMsg];
            });
          },
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
    {
      icon: Upload,
      label: "Upload Content",
      action: "I want to upload video, audio, or documents",
    },
    {
      icon: Video,
      label: "Suggest Clips",
      action:
        "Analyze my content and suggest 2-3 attractive video clip options with timestamps",
    },
    {
      icon: Sparkles,
      label: "Ask Questions",
      action: "What are the key topics discussed in my files?",
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
                          <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-headings:my-3 prose-pre:my-2 prose-code:text-xs overflow-x-auto prose-table:w-auto prose-table:min-w-full">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {message.content}
                            </ReactMarkdown>
                          </div>
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
