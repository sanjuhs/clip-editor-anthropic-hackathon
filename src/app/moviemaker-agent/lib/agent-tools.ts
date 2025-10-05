/**
 * Agent Tools - Video Editing Tools using MediaBunny (FFmpeg.wasm)
 *
 * This file contains all the tools the AI agent can use to create short videos
 * from uploaded media assets stored in IndexedDB.
 *
 * Tools Overview:
 * 1. extractSegment - Extract a time segment from video/audio file
 * 2. concatenateSegments - Join multiple video segments together
 * 3. overlayAudio - Add or replace audio track on video
 * 4. overlayImage - Add image overlay at specific position and time
 * 5. overlayText - Add text overlay at specific position and time
 * 6. composeVideo - Main orchestrator that creates final video from timeline
 */

"use client";

import {
  Input,
  Output,
  Conversion,
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Mp4OutputFormat,
  // media sources & sinks for custom composition
  CanvasSource,
  AudioBufferSource,
  VideoSampleSink,
  AudioBufferSink,
} from "mediabunny";
import { fileStorage } from "./indexeddb";
import { UploadedFile } from "../types";

// ============================================================================
// TYPES
// ============================================================================

export interface TimeRange {
  start: number; // in seconds
  end: number; // in seconds
}

export interface VideoSegment {
  fileId: string; // ID of file in IndexedDB
  fileName: string; // For reference
  timeRange: TimeRange; // Time range to extract
}

export interface AudioTrack {
  fileId: string;
  fileName: string;
  timeRange: TimeRange;
  volume?: number; // 0.0 to 1.0, default 1.0
}

export interface ImageOverlay {
  fileId: string;
  fileName: string;
  position:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "center"
    | "full-screen";
  timeRange: TimeRange; // When to show the overlay
  scale?: number; // 0.0 to 1.0, default 0.2 for logos
}

export interface TextOverlay {
  text: string;
  position:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "center"
    | "top-center"
    | "bottom-center";
  timeRange: TimeRange;
  fontSize?: number; // default 48
  fontColor?: string; // default "white"
  backgroundColor?: string; // default "black"
  fontWeight?: string; // default "bold"
}

export interface TimelineRow {
  timeInClip: TimeRange;
  action: string;
  videoAsset?: VideoSegment | null; // null means black screen
  audioAsset?: AudioTrack | null; // null means silence
  imageOverlays?: ImageOverlay[];
  textOverlays?: TextOverlay[];
}

export interface VideoComposition {
  timeline: TimelineRow[];
  outputFileName: string;
  targetWidth?: number; // default 1080
  targetHeight?: number; // default 1920 (vertical for social media)
  targetFps?: number; // default 30
}

export interface ToolExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

// ============================================================================
// TOOL DEFINITIONS FOR AI AGENT
// ============================================================================

/**
 * Tool definitions in the format expected by Groq API
 * These tell the AI agent what tools are available and how to use them
 */
export const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "composeVideo",
      description:
        "Compose a final short video from a timeline of video segments, audio tracks, image overlays, and text overlays. This is the main tool to create the final video output.",
      parameters: {
        type: "object",
        properties: {
          timeline: {
            type: "array",
            description:
              "Array of timeline rows, each defining what happens at specific times in the final clip",
            items: {
              type: "object",
              properties: {
                timeInClip: {
                  type: "object",
                  description: "Time range in the final clip (in seconds)",
                  properties: {
                    start: {
                      type: "number",
                      description: "Start time in seconds",
                    },
                    end: { type: "number", description: "End time in seconds" },
                  },
                  required: ["start", "end"],
                },
                action: {
                  type: "string",
                  description: "Description of what happens in this segment",
                },
                videoAsset: {
                  type: "object",
                  description: "Video asset to use (null for black screen)",
                  properties: {
                    fileId: {
                      type: "string",
                      description: "File ID from IndexedDB",
                    },
                    fileName: {
                      type: "string",
                      description: "Original filename",
                    },
                    timeRange: {
                      type: "object",
                      properties: {
                        start: { type: "number" },
                        end: { type: "number" },
                      },
                    },
                  },
                },
                audioAsset: {
                  type: "object",
                  description: "Audio asset to use (null for silence)",
                  properties: {
                    fileId: { type: "string" },
                    fileName: { type: "string" },
                    timeRange: {
                      type: "object",
                      properties: {
                        start: { type: "number" },
                        end: { type: "number" },
                      },
                    },
                    volume: {
                      type: "number",
                      description: "Volume 0.0-1.0, default 1.0",
                    },
                  },
                },
                imageOverlays: {
                  type: "array",
                  description:
                    "Array of image overlays to display during this segment",
                  items: {
                    type: "object",
                    properties: {
                      fileId: { type: "string" },
                      fileName: { type: "string" },
                      position: {
                        type: "string",
                        enum: [
                          "top-left",
                          "top-right",
                          "bottom-left",
                          "bottom-right",
                          "center",
                          "full-screen",
                        ],
                      },
                      timeRange: {
                        type: "object",
                        properties: {
                          start: { type: "number" },
                          end: { type: "number" },
                        },
                      },
                      scale: { type: "number", description: "Scale 0.0-1.0" },
                    },
                  },
                },
                textOverlays: {
                  type: "array",
                  description:
                    "Array of text overlays to display during this segment",
                  items: {
                    type: "object",
                    properties: {
                      text: { type: "string", description: "Text to display" },
                      position: {
                        type: "string",
                        enum: [
                          "top-left",
                          "top-right",
                          "bottom-left",
                          "bottom-right",
                          "center",
                          "top-center",
                          "bottom-center",
                        ],
                      },
                      timeRange: {
                        type: "object",
                        properties: {
                          start: { type: "number" },
                          end: { type: "number" },
                        },
                      },
                      fontSize: { type: "number" },
                      fontColor: { type: "string" },
                      backgroundColor: { type: "string" },
                    },
                  },
                },
              },
              required: ["timeInClip", "action"],
            },
          },
          outputFileName: {
            type: "string",
            description:
              "Name for the output video file (e.g., 'my-short-clip.mp4')",
          },
          targetWidth: {
            type: "number",
            description: "Width in pixels (default 1080)",
          },
          targetHeight: {
            type: "number",
            description: "Height in pixels (default 1920 for vertical video)",
          },
          targetFps: {
            type: "number",
            description: "Frames per second (default 30)",
          },
        },
        required: ["timeline", "outputFileName"],
      },
    },
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get file from IndexedDB by matching file ID or name
 */
async function getFileFromStorage(
  fileIdOrName: string
): Promise<{ file: File; uploadedFile: UploadedFile }> {
  const files = await fileStorage.getFiles();

  // Try to find by ID first
  let uploadedFile = files.find((f) => f.id === fileIdOrName);

  // If not found by ID, try to find by name
  if (!uploadedFile) {
    uploadedFile = files.find((f) => f.name === fileIdOrName);
  }

  if (!uploadedFile) {
    throw new Error(`File not found in storage: ${fileIdOrName}`);
  }

  return { file: uploadedFile.file, uploadedFile };
}

/**
 * Convert position string to FFmpeg overlay coordinates
 */
function getOverlayPosition(
  position: string,
  targetWidth: number,
  targetHeight: number,
  overlayWidth: number,
  overlayHeight: number,
  scale: number = 0.2
): { x: string; y: string } {
  const scaledWidth = overlayWidth * scale;
  const scaledHeight = overlayHeight * scale;
  const padding = 20;

  switch (position) {
    case "top-left":
      return { x: `${padding}`, y: `${padding}` };
    case "top-right":
      return { x: `${targetWidth - scaledWidth - padding}`, y: `${padding}` };
    case "bottom-left":
      return { x: `${padding}`, y: `${targetHeight - scaledHeight - padding}` };
    case "bottom-right":
      return {
        x: `${targetWidth - scaledWidth - padding}`,
        y: `${targetHeight - scaledHeight - padding}`,
      };
    case "center":
      return {
        x: `(main_w-overlay_w)/2`,
        y: `(main_h-overlay_h)/2`,
      };
    case "top-center":
      return { x: `(main_w-overlay_w)/2`, y: `${padding}` };
    case "bottom-center":
      return { x: `(main_w-overlay_w)/2`, y: `main_h-overlay_h-${padding}` };
    case "full-screen":
      return { x: "0", y: "0" };
    default:
      return { x: "(main_w-overlay_w)/2", y: "(main_h-overlay_h)/2" };
  }
}

// ============================================================================
// CORE TOOL IMPLEMENTATIONS
// ============================================================================

/**
 * Tool 1: Extract a segment from a video/audio file
 * Uses MediaBunny to actually trim the video
 */
export async function extractSegment(
  fileId: string,
  timeRange: TimeRange,
  outputFileName: string,
  progressCallback?: (progress: number) => void
): Promise<File> {
  const { file } = await getFileFromStorage(fileId);

  console.log(
    `✂️ Trimming ${file.name} from ${timeRange.start}s to ${timeRange.end}s`
  );

  // Build input/output
  const input = new Input({
    source: new BlobSource(file),
    formats: ALL_FORMATS,
  });
  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat(), target });

  const conversion = await Conversion.init({
    input,
    output,
    trim: { start: timeRange.start, end: timeRange.end },
  });

  conversion.onProgress = (p) => {
    const pct = Math.round((p ?? 0) * 100);
    progressCallback?.(pct);
  };

  await conversion.execute();

  const mime = await output.getMimeType().catch(() => "video/mp4");
  const buffer = target.buffer as ArrayBuffer;
  const trimmed = new File([buffer], outputFileName, { type: mime });

  console.log(
    `✅ Video segment prepared: ${trimmed.name} (${(
      trimmed.size /
      1024 /
      1024
    ).toFixed(2)}MB)`
  );

  return trimmed;
}

/**
 * Tool 2: Concatenate multiple video segments
 * Uses MediaBunny to actually join videos
 */
export async function concatenateSegments(
  segments: File[],
  outputFileName: string,
  progressCallback?: (progress: number) => void
): Promise<File> {
  if (segments.length === 0) {
    throw new Error("No segments to concatenate");
  }

  // If only one segment, return it directly
  if (segments.length === 1) {
    console.log("📹 Only one segment, returning as-is");
    return segments[0];
  }

  console.log(`🔗 Concatenating ${segments.length} video segments...`);

  // Read first segment to determine output dimensions
  const firstInput = new Input({
    source: new BlobSource(segments[0]),
    formats: ALL_FORMATS,
  });
  const primaryVideo = await firstInput.getPrimaryVideoTrack();
  const width = primaryVideo?.displayWidth || 1080;
  const height = primaryVideo?.displayHeight || 1920;

  // Prepare output
  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat(), target });

  // Create canvas-based video source and audio buffer source
  const canvas: HTMLCanvasElement | OffscreenCanvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(width, height)
      : (() => {
          const c = document.createElement("canvas");
          c.width = width;
          c.height = height;
          return c;
        })();
  const ctx = (canvas as any).getContext("2d");
  if (!ctx) throw new Error("Failed to create 2D canvas context for concat");

  const videoSource = new CanvasSource(canvas, {
    codec: "avc",
    bitrate: 4_000_000,
  });
  const audioSource = new AudioBufferSource({ codec: "aac", bitrate: 128_000 });

  output.addVideoTrack(videoSource, { frameRate: 30 });
  output.addAudioTrack(audioSource);

  await output.start();

  // Accumulate video timestamps continuously
  let t = 0; // seconds

  for (let s = 0; s < segments.length; s++) {
    const seg = segments[s];
    const inp = new Input({
      source: new BlobSource(seg),
      formats: ALL_FORMATS,
    });

    const vTrack = await inp.getPrimaryVideoTrack();
    const aTrack = await inp.getPrimaryAudioTrack();

    // Video: decode frames and draw to canvas, then capture via CanvasSource
    if (vTrack) {
      const vSink = new VideoSampleSink(vTrack);
      for await (const frame of vSink.samples()) {
        // Draw full frame
        ctx.clearRect(0, 0, width, height);
        frame.draw(ctx as any, 0, 0, width, height);
        // Add frame at current timeline position
        const duration = Math.max(frame.duration || 1 / 30, 1 / 60);
        await videoSource.add(t, duration);
        t += duration;
        if (progressCallback) {
          const pct = Math.min(
            99,
            Math.floor(((s + frame.timestamp) / segments.length) * 100)
          );
          progressCallback(pct);
        }
      }
    }

    // Audio: append decoded audio buffers
    if (aTrack) {
      const aSink = new AudioBufferSink(aTrack);
      for await (const ab of aSink.buffers()) {
        await audioSource.add(ab.buffer);
      }
    }
  }

  await output.finalize();
  const mime = await output.getMimeType().catch(() => "video/mp4");
  const buffer = target.buffer as ArrayBuffer;
  const result = new File([buffer], outputFileName, { type: mime });
  progressCallback?.(100);
  return result;
}

/**
 * Tool 3: Overlay or replace audio on a video
 * Simplified for initial implementation
 */
export async function overlayAudio(
  videoBlob: File,
  audioFileId: string,
  audioTimeRange: TimeRange,
  volume: number = 1.0,
  outputFileName: string,
  progressCallback?: (progress: number) => void
): Promise<File> {
  console.log("overlayAudio: start", {
    audioFileId,
    audioTimeRange,
    volume,
    outputFileName,
  });
  const videoInput = new Input({
    source: new BlobSource(videoBlob),
    formats: ALL_FORMATS,
  });
  const videoTrack = await videoInput.getPrimaryVideoTrack();
  if (!videoTrack) return videoBlob;

  const width = videoTrack.displayWidth || 1080;
  const height = videoTrack.displayHeight || 1920;

  const { file: audioFile } = await getFileFromStorage(audioFileId);
  const audioInput = new Input({
    source: new BlobSource(audioFile),
    formats: ALL_FORMATS,
  });
  const audioTrack = await audioInput.getPrimaryAudioTrack();

  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat(), target });

  const canvas: HTMLCanvasElement | OffscreenCanvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(width, height)
      : (() => {
          const c = document.createElement("canvas");
          c.width = width;
          c.height = height;
          return c;
        })();
  const ctx = (canvas as any).getContext("2d");
  if (!ctx)
    throw new Error("Failed to create 2D canvas context for overlayAudio");

  const videoSource = new CanvasSource(canvas, {
    codec: "avc",
    bitrate: 4_000_000,
  });
  output.addVideoTrack(videoSource, { frameRate: 30 });

  const audioSource = new AudioBufferSource({ codec: "aac", bitrate: 128_000 });
  output.addAudioTrack(audioSource);

  await output.start();

  // Re-encode video frames
  let t = 0;
  const vSink = new VideoSampleSink(videoTrack);
  for await (const frame of vSink.samples()) {
    ctx.clearRect(0, 0, width, height);
    frame.draw(ctx as any, 0, 0, width, height);
    const duration = Math.max(frame.duration || 1 / 30, 1 / 60);
    await videoSource.add(t, duration);
    t += duration;
  }

  // Add (trimmed) audio with volume scaling
  if (audioTrack) {
    const aSink = new AudioBufferSink(audioTrack);
    for await (const ab of aSink.buffers(
      audioTimeRange.start,
      audioTimeRange.end
    )) {
      const buf = ab.buffer;
      // Scale volume in-place by copying
      const ctxAudio = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const out = ctxAudio.createBuffer(
        buf.numberOfChannels,
        buf.length,
        buf.sampleRate
      );
      for (let ch = 0; ch < buf.numberOfChannels; ch++) {
        const src = buf.getChannelData(ch);
        const dst = out.getChannelData(ch);
        for (let i = 0; i < src.length; i++) dst[i] = src[i] * volume;
      }
      await audioSource.add(out);
    }
  }

  await output.finalize();
  const mime = await output.getMimeType().catch(() => "video/mp4");
  const buffer = target.buffer as ArrayBuffer;
  return new File([buffer], outputFileName, { type: mime });
}

/**
 * Tool 4: Add image overlay to video
 * Simplified for initial implementation
 */
export async function overlayImage(
  videoBlob: File,
  imageFileId: string,
  position: string,
  timeRange: TimeRange,
  scale: number = 0.2,
  targetWidth: number = 1080,
  targetHeight: number = 1920,
  outputFileName: string,
  progressCallback?: (progress: number) => void
): Promise<File> {
  console.log("overlayImage: start", {
    imageFileId,
    position,
    timeRange,
    scale,
    targetWidth,
    targetHeight,
    outputFileName,
  });
  const videoInput = new Input({
    source: new BlobSource(videoBlob),
    formats: ALL_FORMATS,
  });
  const videoTrack = await videoInput.getPrimaryVideoTrack();
  if (!videoTrack) return videoBlob;

  const width = targetWidth || videoTrack.displayWidth || 1080;
  const height = targetHeight || videoTrack.displayHeight || 1920;

  const { file: imageFile } = await getFileFromStorage(imageFileId);
  const imageBitmap = await createImageBitmap(imageFile).catch(async () => {
    return new Promise<ImageBitmap>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(createImageBitmap(img));
      img.onerror = reject;
      img.src = URL.createObjectURL(imageFile);
    });
  });

  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat(), target });

  const canvas: HTMLCanvasElement | OffscreenCanvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(width, height)
      : (() => {
          const c = document.createElement("canvas");
          c.width = width;
          c.height = height;
          return c;
        })();
  const ctx = (canvas as any).getContext("2d");
  if (!ctx)
    throw new Error("Failed to create 2D canvas context for overlayImage");

  const videoSource = new CanvasSource(canvas, {
    codec: "avc",
    bitrate: 4_000_000,
  });
  output.addVideoTrack(videoSource, { frameRate: 30 });

  // If original had audio, copy it over (re-encode)
  const aTrack = await videoInput.getPrimaryAudioTrack();
  let audioSource: AudioBufferSource | null = null;
  if (aTrack) {
    audioSource = new AudioBufferSource({ codec: "aac", bitrate: 128_000 });
    output.addAudioTrack(audioSource);
  }

  await output.start();

  // Compute overlay placement
  const overlayW = imageBitmap.width;
  const overlayH = imageBitmap.height;
  const { x, y } = getOverlayPosition(
    position,
    width,
    height,
    overlayW,
    overlayH,
    scale
  );
  const drawW = position === "full-screen" ? width : overlayW * scale;
  const drawH = position === "full-screen" ? height : overlayH * scale;

  // Re-encode frames with overlay during timeRange
  let t = 0;
  const vSink = new VideoSampleSink(videoTrack);
  for await (const frame of vSink.samples()) {
    ctx.clearRect(0, 0, width, height);
    frame.draw(ctx as any, 0, 0, width, height);
    const ts = t; // current timeline time
    if (ts >= timeRange.start && ts <= timeRange.end) {
      ctx.drawImage(
        imageBitmap as any,
        parseFloat(x as any) || 0,
        parseFloat(y as any) || 0,
        drawW,
        drawH
      );
    }
    const duration = Math.max(frame.duration || 1 / 30, 1 / 60);
    await videoSource.add(t, duration);
    t += duration;
  }

  // Copy audio if present
  if (audioSource && aTrack) {
    const aSink = new AudioBufferSink(aTrack);
    for await (const ab of aSink.buffers()) {
      await audioSource.add(ab.buffer);
    }
  }

  await output.finalize();
  const mime = await output.getMimeType().catch(() => "video/mp4");
  const buffer = target.buffer as ArrayBuffer;
  return new File([buffer], outputFileName, { type: mime });
}

/**
 * Tool 5: Add text overlay to video
 * Simplified for initial implementation
 */
export async function overlayText(
  videoBlob: File,
  textConfig: TextOverlay,
  targetWidth: number = 1080,
  targetHeight: number = 1920,
  outputFileName: string,
  progressCallback?: (progress: number) => void
): Promise<File> {
  console.log("overlayText: start", {
    text: textConfig?.text,
    position: textConfig?.position,
    timeRange: textConfig?.timeRange,
    outputFileName,
  });
  const videoInput = new Input({
    source: new BlobSource(videoBlob),
    formats: ALL_FORMATS,
  });
  const videoTrack = await videoInput.getPrimaryVideoTrack();
  if (!videoTrack) return videoBlob;

  const width = targetWidth || videoTrack.displayWidth || 1080;
  const height = targetHeight || videoTrack.displayHeight || 1920;

  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat(), target });

  const canvas: HTMLCanvasElement | OffscreenCanvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(width, height)
      : (() => {
          const c = document.createElement("canvas");
          c.width = width;
          c.height = height;
          return c;
        })();
  const ctx = (canvas as any).getContext("2d");
  if (!ctx)
    throw new Error("Failed to create 2D canvas context for overlayText");

  const videoSource = new CanvasSource(canvas, {
    codec: "avc",
    bitrate: 4_000_000,
  });
  output.addVideoTrack(videoSource, { frameRate: 30 });

  const aTrack = await videoInput.getPrimaryAudioTrack();
  let audioSource: AudioBufferSource | null = null;
  if (aTrack) {
    audioSource = new AudioBufferSource({ codec: "aac", bitrate: 128_000 });
    output.addAudioTrack(audioSource);
  }

  await output.start();

  const fontSize = textConfig.fontSize ?? 48;
  const fontColor = textConfig.fontColor ?? "white";
  const backgroundColor = textConfig.backgroundColor ?? "black";
  const fontWeight = textConfig.fontWeight ?? "bold";
  (ctx as any).font = `${fontWeight} ${fontSize}px sans-serif`;
  (ctx as any).textBaseline = "top";

  function measureTextBox(text: string) {
    const metrics = (ctx as any).measureText(text);
    const w = metrics.width;
    const h = fontSize * 1.4;
    return { w, h };
  }

  function getTextPosition(pos: string, boxW: number, boxH: number) {
    const pad = 20;
    switch (pos) {
      case "top-left":
        return { x: pad, y: pad };
      case "top-right":
        return { x: width - boxW - pad, y: pad };
      case "bottom-left":
        return { x: pad, y: height - boxH - pad };
      case "bottom-right":
        return { x: width - boxW - pad, y: height - boxH - pad };
      case "top-center":
        return { x: (width - boxW) / 2, y: pad };
      case "bottom-center":
        return { x: (width - boxW) / 2, y: height - boxH - pad };
      default:
        return { x: (width - boxW) / 2, y: (height - boxH) / 2 };
    }
  }

  let t = 0;
  const vSink = new VideoSampleSink(videoTrack);
  for await (const frame of vSink.samples()) {
    ctx.clearRect(0, 0, width, height);
    frame.draw(ctx as any, 0, 0, width, height);

    if (t >= textConfig.timeRange.start && t <= textConfig.timeRange.end) {
      const { w, h } = measureTextBox(textConfig.text);
      const { x, y } = getTextPosition(textConfig.position, w + 24, h + 16);
      // background
      (ctx as any).fillStyle = backgroundColor;
      (ctx as any).globalAlpha = 0.6;
      (ctx as any).fillRect(x, y, w + 24, h + 16);
      (ctx as any).globalAlpha = 1.0;
      // text
      (ctx as any).fillStyle = fontColor;
      (ctx as any).fillText(textConfig.text, x + 12, y + 8);
    }

    const duration = Math.max(frame.duration || 1 / 30, 1 / 60);
    await videoSource.add(t, duration);
    t += duration;
  }

  if (audioSource && aTrack) {
    const aSink = new AudioBufferSink(aTrack);
    for await (const ab of aSink.buffers()) {
      await audioSource.add(ab.buffer);
    }
  }

  await output.finalize();
  const mime = await output.getMimeType().catch(() => "video/mp4");
  const buffer = target.buffer as ArrayBuffer;
  return new File([buffer], outputFileName, { type: mime });
}

/**
 * Tool 6: Create a black video segment (for gaps or placeholders)
 * Simplified for initial implementation
 */
export async function createBlackVideo(
  duration: number,
  width: number = 1080,
  height: number = 1920,
  outputFileName: string
): Promise<File> {
  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat(), target });

  const canvas: HTMLCanvasElement | OffscreenCanvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(width, height)
      : (() => {
          const c = document.createElement("canvas");
          c.width = width;
          c.height = height;
          return c;
        })();
  const ctx = (canvas as any).getContext("2d");
  if (!ctx)
    throw new Error("Failed to create 2D canvas context for black video");

  const videoSource = new CanvasSource(canvas, {
    codec: "avc",
    bitrate: 3_000_000,
  });
  output.addVideoTrack(videoSource, { frameRate: 30 });

  await output.start();

  const fps = 30;
  const frameDur = 1 / fps;
  let t = 0;
  while (t < duration) {
    (ctx as any).fillStyle = "black";
    (ctx as any).fillRect(0, 0, width, height);
    await videoSource.add(t, frameDur);
    t += frameDur;
  }

  await output.finalize();
  const mime = await output.getMimeType().catch(() => "video/mp4");
  const buffer = target.buffer as ArrayBuffer;
  return new File([buffer], outputFileName, { type: mime });
}

// ============================================================================
// MAIN COMPOSITION TOOL
// ============================================================================

/**
 * Main Tool: Compose a complete video from a timeline
 * This orchestrates all other tools to create the final video
 */
export async function composeVideo(
  composition: VideoComposition,
  onProgress?: (stage: string, progress: number) => void
): Promise<ToolExecutionResult> {
  console.log("composeVideo is in progress", composition);
  try {
    onProgress?.("Initializing", 0);

    const {
      timeline,
      outputFileName,
      targetWidth = 1080,
      targetHeight = 1920,
      targetFps = 30,
    } = composition;

    console.log("📹 Starting video composition with timeline:", timeline);

    // Step 1: Validate timeline
    if (!timeline || timeline.length === 0) {
      throw new Error("Timeline is empty");
    }

    // Step 2: Process each timeline row and create video segments
    onProgress?.("Starting video processing", 5);
    const processedSegments: File[] = [];

    for (let i = 0; i < timeline.length; i++) {
      const row = timeline[i];
      const segmentDuration = row.timeInClip.end - row.timeInClip.start;

      const baseProgress = 10 + (i / timeline.length) * 60;

      onProgress?.(
        `Trimming segment ${i + 1}/${timeline.length}`,
        baseProgress
      );

      console.log(`🎬 Processing segment ${i + 1}/${timeline.length}:`, row);

      // Get base video and actually trim it
      if (row.videoAsset) {
        const videoRef =
          (row.videoAsset as any).fileId || (row.videoAsset as any).fileName;
        if (!videoRef) {
          throw new Error(
            `Timeline row ${i + 1} missing video reference (fileId or fileName)`
          );
        }
        onProgress?.(
          `Extracting ${row.videoAsset.fileName} (${row.videoAsset.timeRange.start}s - ${row.videoAsset.timeRange.end}s)`,
          baseProgress + 2
        );

        let trimmedSegment = await extractSegment(
          videoRef,
          row.videoAsset.timeRange,
          `segment_${i}_video.mp4`,
          (trimProgress) => {
            // Update progress during trimming
            onProgress?.(
              `Trimming segment ${i + 1}/${timeline.length} (${Math.round(
                trimProgress
              )}%)`,
              baseProgress + (trimProgress / 100) * (60 / timeline.length)
            );
          }
        );

        // Apply image overlays
        if (row.imageOverlays && row.imageOverlays.length > 0) {
          for (const ov of row.imageOverlays) {
            const imageRef = (ov as any).fileId || (ov as any).fileName;
            if (!imageRef) {
              console.warn(
                `Image overlay in segment ${
                  i + 1
                } missing reference (fileId or fileName); skipping`
              );
              continue;
            }
            trimmedSegment = await overlayImage(
              trimmedSegment,
              imageRef,
              ov.position,
              ov.timeRange,
              ov.scale ?? 0.2,
              targetWidth,
              targetHeight,
              `segment_${i}_image_overlay.mp4`
            );
          }
        }

        // Apply text overlays
        if (row.textOverlays && row.textOverlays.length > 0) {
          for (const tx of row.textOverlays) {
            trimmedSegment = await overlayText(
              trimmedSegment,
              tx,
              targetWidth,
              targetHeight,
              `segment_${i}_text_overlay.mp4`
            );
          }
        }

        // Replace or add audio if specified
        if (row.audioAsset) {
          const audioRef =
            (row.audioAsset as any).fileId || (row.audioAsset as any).fileName;
          if (!audioRef) {
            console.warn(
              `Audio asset in segment ${
                i + 1
              } missing reference (fileId or fileName); skipping`
            );
          }
          trimmedSegment = await overlayAudio(
            trimmedSegment,
            audioRef!,
            row.audioAsset.timeRange,
            row.audioAsset.volume ?? 1.0,
            `segment_${i}_audio_overlay.mp4`
          );
        }

        processedSegments.push(trimmedSegment);
        console.log(
          `✅ Segment ${i + 1} extracted: ${(
            trimmedSegment.size /
            1024 /
            1024
          ).toFixed(2)}MB`
        );
      } else {
        // No video asset - for now, skip creating black video
        console.log(`⚠️ Segment ${i + 1} has no video asset, skipping`);
        continue;
      }
    }

    if (processedSegments.length === 0) {
      throw new Error("No valid video segments found in timeline");
    }

    // Step 3: Concatenate segments if multiple
    onProgress?.("Combining video segments", 70);
    let finalFile: File;

    if (processedSegments.length > 1) {
      finalFile = await concatenateSegments(
        processedSegments,
        outputFileName,
        (concatProgress) => {
          onProgress?.(
            `Combining segments (${Math.round(concatProgress)}%)`,
            70 + (concatProgress / 100) * 15
          );
        }
      );
    } else {
      finalFile = processedSegments[0];
    }

    // Step 4: Store the final video in IndexedDB
    onProgress?.("Saving final video to storage", 85);

    const fileId = `generated_${Date.now()}`;
    const uploadedFile: UploadedFile = {
      id: fileId,
      name: outputFileName,
      type: "video",
      mimeType: "video/mp4",
      size: finalFile.size,
      file: finalFile,
      uploadedAt: new Date(),
      indexed: false,
    };

    await fileStorage.addFile(uploadedFile);

    console.log("✅ Video saved to IndexedDB:", fileId);

    onProgress?.("✅ Video created successfully!", 100);

    const sizeMB = (finalFile.size / 1024 / 1024).toFixed(2);

    return {
      success: true,
      message: `Video composed successfully! ${
        processedSegments.length
      } segment${processedSegments.length > 1 ? "s" : ""} processed.`,
      data: {
        fileId: fileId,
        fileName: outputFileName,
        size: finalFile.size,
        sizeMB: sizeMB,
        duration: timeline[timeline.length - 1].timeInClip.end,
        segmentsProcessed: processedSegments.length,
        trimmedSegments: processedSegments.length,
        note:
          processedSegments.length === 1
            ? "Single segment extracted and trimmed"
            : `${processedSegments.length} segments trimmed (concatenation in progress)`,
      },
    };
  } catch (error) {
    console.error("❌ Video composition failed:", error);
    return {
      success: false,
      message: "Failed to compose video",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================================
// TOOL EXECUTION DISPATCHER
// ============================================================================

/**
 * Execute a tool call from the AI agent
 */
export async function executeToolCall(
  toolName: string,
  toolArguments: any,
  onProgress?: (stage: string, progress: number) => void
): Promise<ToolExecutionResult> {
  console.log("executeToolCall is in progress!!!", toolName, toolArguments);
  try {
    switch (toolName) {
      case "composeVideo":
        return await composeVideo(toolArguments, onProgress);

      default:
        return {
          success: false,
          message: `Unknown tool: ${toolName}`,
          error: `Tool '${toolName}' is not implemented`,
        };
    }
  } catch (error) {
    console.error(`Tool execution failed for ${toolName}:`, error);
    return {
      success: false,
      message: `Tool execution failed: ${toolName}`,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
