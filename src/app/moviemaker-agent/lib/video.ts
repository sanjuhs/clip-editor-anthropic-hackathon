"use client";

/**
 * Extract a frame every 1s from a video File. Caps at maxSeconds if provided.
 */
export async function extractFramesPerSecond(
  file: File,
  options?: { maxSeconds?: number; quality?: number }
): Promise<Array<{ second: number; dataUrl: string }>> {
  const { maxSeconds = 120, quality = 0.8 } = options || {};

  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.src = url;
    video.crossOrigin = "anonymous";
    video.muted = true;

    // Ensure metadata is loaded for duration and dimensions
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

    const frames: Array<{ second: number; dataUrl: string }> = [];
    const lastSecond = Math.min(duration, maxSeconds);

    for (let t = 0; t <= lastSecond; t += 1) {
      // Seek video to time t
      // Some browsers require slight offsets to ensure seek triggers
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
 * Describe frames via Groq Llama Vision (faster than Moondream).
 * Sequential to avoid hammering the API.
 */
export async function describeFrames(
  frames: Array<{ second: number; dataUrl: string }>
): Promise<FrameCaption[]> {
  const results: FrameCaption[] = [];
  for (const frame of frames) {
    try {
      const res = await fetch("/api/groq-llama-vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: frame.dataUrl },
                },
                {
                  type: "text",
                  text: "Describe this video frame in one concise sentence.",
                },
              ],
            },
          ],
          stream: false,
        }),
      });
      const json = await res.json();
      const caption = json?.response || "";
      results.push({ second: frame.second, caption });
    } catch (e) {
      results.push({ second: frame.second, caption: "" });
    }
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
