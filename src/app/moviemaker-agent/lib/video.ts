"use client";

import { TranscriptionSegment } from "./transcription";

/**
 * Calculate adaptive interval to target ~100 frames max.
 * For videos < 100s: 1 frame/sec
 * For videos 100-300s: 1 frame every 2-3 secs
 * For videos > 300s: adjust to keep around 100 frames
 */
export function calculateAdaptiveInterval(durationSeconds: number): number {
  const targetFrames = 100;
  if (durationSeconds <= targetFrames) return 1; // 1 frame/sec
  return Math.ceil(durationSeconds / targetFrames);
}

/**
 * Extract keyframe timestamps from transcript segments.
 * Takes the start of each segment as a keyframe opportunity.
 */
export function extractKeyframeTimestampsFromSegments(
  segments: TranscriptionSegment[],
  videoDuration: number
): number[] {
  if (!segments || segments.length === 0) return [];

  const timestamps = segments.map((seg) => Math.floor(seg.start));
  // Add the last frame at the end
  timestamps.push(Math.floor(videoDuration));

  // Deduplicate and sort
  return [...new Set(timestamps)].sort((a, b) => a - b);
}

/**
 * Smart keyframe extraction:
 * 1. If transcript available: extract at segment boundaries
 * 2. If not enough frames (< 30): supplement with adaptive interval sampling
 * 3. Cap at ~100 frames total
 */
export async function extractSmartKeyframes(
  file: File,
  options?: {
    quality?: number;
    segments?: TranscriptionSegment[];
    maxFrames?: number;
  }
): Promise<Array<{ second: number; dataUrl: string }>> {
  const { quality = 0.7, segments, maxFrames = 100 } = options || {};

  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.src = url;
    video.crossOrigin = "anonymous";
    video.muted = true;

    // Load metadata
    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => resolve();
      const onError = () => reject(new Error("Failed to load video metadata"));
      video.addEventListener("loadedmetadata", onLoaded, { once: true });
      video.addEventListener("error", onError, { once: true });
    });

    const duration = Math.floor(video.duration || 0);
    if (!isFinite(duration) || duration <= 0) return [];

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 360;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];

    // Determine timestamps to extract
    let timestamps: number[] = [];

    // Strategy 1: Use transcript segments if available
    if (segments && segments.length > 0) {
      timestamps = extractKeyframeTimestampsFromSegments(segments, duration);
    }

    // Strategy 2: If we have too few frames, supplement with adaptive sampling
    const minFrames = 30;
    if (timestamps.length < minFrames) {
      const interval = calculateAdaptiveInterval(duration);
      const additionalTimestamps: number[] = [];
      for (let t = 0; t <= duration; t += interval) {
        additionalTimestamps.push(t);
      }
      // Merge and deduplicate
      timestamps = [...new Set([...timestamps, ...additionalTimestamps])].sort(
        (a, b) => a - b
      );
    }

    // Cap at maxFrames
    if (timestamps.length > maxFrames) {
      // Sample evenly from the timestamps
      const step = timestamps.length / maxFrames;
      timestamps = Array.from(
        { length: maxFrames },
        (_, i) => timestamps[Math.floor(i * step)]
      );
    }

    // Extract frames
    const frames: Array<{ second: number; dataUrl: string }> = [];
    for (const t of timestamps) {
      const seekTime = Math.min(t + 0.0001, video.duration);
      await new Promise<void>((resolve) => {
        const onSeeked = () => resolve();
        video.currentTime = seekTime;
        video.addEventListener("seeked", onSeeked, { once: true });
      });

      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      frames.push({ second: t, dataUrl });
    }

    return frames;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface FrameCaption {
  second: number;
  caption: string;
}

/**
 * Describe frames via Groq Llama Vision with intelligent batching.
 * Batches multiple frames (default 5) per API call for efficiency.
 * Processes batches in parallel for speed while respecting rate limits.
 *
 * NOTE: Groq Llama Vision API supports a maximum of 5 images per request.
 * Do not set batchSize higher than 5.
 */
export async function describeFrames(
  frames: Array<{ second: number; dataUrl: string }>,
  options?: {
    batchSize?: number; // Number of frames to send per API call (max 5 for Groq)
    parallelBatches?: number; // Number of batches to process in parallel
  }
): Promise<FrameCaption[]> {
  const { batchSize = 5, parallelBatches = 3 } = options || {};

  // Cap batch size at 5 (Groq API limitation)
  const safeBatchSize = Math.min(batchSize, 5);

  // Split frames into batches
  const batches: Array<Array<{ second: number; dataUrl: string }>> = [];
  for (let i = 0; i < frames.length; i += safeBatchSize) {
    batches.push(frames.slice(i, i + safeBatchSize));
  }

  const results: FrameCaption[] = [];

  // Process batches in parallel (with controlled concurrency)
  for (let i = 0; i < batches.length; i += parallelBatches) {
    const batchGroup = batches.slice(i, i + parallelBatches);

    const batchPromises = batchGroup.map(async (batch) => {
      return await describeBatch(batch);
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.flat());
  }

  return results;
}

/**
 * Describe a batch of frames in a single API call.
 * Sends multiple images together so the model can understand temporal flow.
 */
async function describeBatch(
  batch: Array<{ second: number; dataUrl: string }>
): Promise<FrameCaption[]> {
  if (batch.length === 0) return [];

  try {
    // Build content array with all images + text prompt
    const content: Array<{
      type: string;
      image_url?: { url: string };
      text?: string;
    }> = [];

    // Add all images first
    batch.forEach((frame, idx) => {
      content.push({
        type: "image_url",
        image_url: { url: frame.dataUrl },
      });
    });

    // Add comprehensive prompt at the end
    const timeRangeText =
      batch.length > 1
        ? `from ${batch[0].second}s to ${batch[batch.length - 1].second}s`
        : `at ${batch[0].second}s`;

    content.push({
      type: "text",
      text: `You are analyzing ${batch.length} sequential video frames ${timeRangeText}. 
For each frame in order, provide a concise one-sentence description focusing on:
- Main subjects and actions
- Significant changes from the previous frame (if any)
- Key visual elements

Format your response as a numbered list (1, 2, 3...) with one description per frame.
Be concise but capture important details and transitions.`,
    });

    const res = await fetch("/api/groq-llama-vision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content,
          },
        ],
        stream: false,
      }),
    });

    const json = await res.json();
    const response = json?.response || "";

    // Parse the numbered response back into individual captions
    return parseBatchResponse(response, batch);
  } catch (e) {
    console.error("Batch description error:", e);
    // Return empty captions for failed batch
    return batch.map((frame) => ({ second: frame.second, caption: "" }));
  }
}

/**
 * Parse the batched response into individual frame captions.
 * Expects numbered format like "1. Description\n2. Description\n..."
 */
function parseBatchResponse(
  response: string,
  batch: Array<{ second: number; dataUrl: string }>
): FrameCaption[] {
  const lines = response.split(/\n+/).filter((line) => line.trim());
  const results: FrameCaption[] = [];

  // Try to extract numbered descriptions
  const numberedPattern = /^\s*(\d+)[.)]\s*(.+)/;

  let captionIndex = 0;
  for (const line of lines) {
    const match = line.match(numberedPattern);
    if (match && captionIndex < batch.length) {
      const description = match[2].trim();
      results.push({
        second: batch[captionIndex].second,
        caption: description,
      });
      captionIndex++;
    }
  }

  // If parsing failed or incomplete, fall back to splitting by sentences
  if (results.length < batch.length) {
    const sentences = response
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    return batch.map((frame, idx) => ({
      second: frame.second,
      caption: sentences[idx] || "",
    }));
  }

  return results;
}

/**
 * Build a combined raw text that includes the audio transcript and visual captions.
 */
export function buildCombinedRawText(
  audioTranscriptText: string | undefined,
  frameCaptions: FrameCaption[]
): string {
  const parts: string[] = [];
  if (audioTranscriptText && audioTranscriptText.trim().length > 0) {
    parts.push("[Audio Transcript]", audioTranscriptText.trim());
  }
  if (frameCaptions.length > 0) {
    parts.push("", "[Visual Descriptions by second]");
    for (const { second, caption } of frameCaptions) {
      if (!caption) continue;
      parts.push(`${second}s: ${caption}`);
    }
  }
  return parts.join("\n");
}

/**
 * Build a short summary from transcript and a subset of visual captions.
 */
export function buildSummary(
  audioTranscriptText: string | undefined,
  frameCaptions: FrameCaption[]
): string {
  const firstCaptionSamples = frameCaptions
    .filter((c) => c.caption)
    .slice(0, 3)
    .map((c) => c.caption)
    .join("; ");

  const transcriptSnippet = (audioTranscriptText || "")
    .split(/(?<=[.!?])\s+/)
    .slice(0, 2)
    .join(" ");

  const parts: string[] = [];
  if (transcriptSnippet) parts.push(transcriptSnippet);
  if (firstCaptionSamples) parts.push(`Visually: ${firstCaptionSamples}`);
  return (
    parts.join(" ").trim() || "Generated combined summary of audio and visuals."
  );
}

/**
 * Describe a single image using Groq Llama Vision
 */
export async function describeImage(
  dataUrl: string
): Promise<{ description: string; detailedAnalysis: string }> {
  try {
    // Get short description
    const shortRes = await fetch("/api/groq-llama-vision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: dataUrl },
              },
              {
                type: "text",
                text: "Describe this image in one concise sentence.",
              },
            ],
          },
        ],
        stream: false,
      }),
    });
    const shortJson = await shortRes.json();
    const description = shortJson?.response || "";

    // Get detailed analysis
    const detailRes = await fetch("/api/groq-llama-vision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: dataUrl },
              },
              {
                type: "text",
                text: "Provide a detailed analysis of this image including: objects, people, colors, composition, mood, and any text visible. Be thorough.",
              },
            ],
          },
        ],
        stream: false,
      }),
    });
    const detailJson = await detailRes.json();
    const detailedAnalysis = detailJson?.response || "";

    return { description, detailedAnalysis };
  } catch (e) {
    console.error("Image description error:", e);
    return { description: "", detailedAnalysis: "" };
  }
}
