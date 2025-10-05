export interface TranscriptionSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface TranscriptionResponse {
  success: boolean;
  transcription: {
    text: string;
    task?: string;
    language?: string;
    duration?: number;
    segments?: TranscriptionSegment[];
    words?: WordTimestamp[];
  };
  metadata: {
    fileName: string;
    fileSize: number;
    fileType: string;
    model: string;
    language: string;
    timestamp: string;
  };
}

export interface TranscriptionOptions {
  file: File;
  language?: string;
  prompt?: string;
  responseFormat?: "json" | "verbose_json" | "text";
  temperature?: number;
  model?: "whisper-large-v3-turbo" | "whisper-large-v3";
  timestampGranularities?: ("word" | "segment")[];
  onProgress?: (progress: {
    current: number;
    total: number;
    percentage: number;
  }) => void;
}

/**
 * Transcribe a single audio chunk
 */
async function transcribeChunk(
  file: File | Blob,
  fileName: string,
  options: Omit<TranscriptionOptions, "file" | "onProgress">
): Promise<TranscriptionResponse> {
  const {
    language,
    prompt,
    responseFormat = "verbose_json",
    temperature = 0,
    model = "whisper-large-v3-turbo",
    timestampGranularities = ["word", "segment"],
  } = options;

  const formData = new FormData();
  formData.append("file", file, fileName);
  formData.append("response_format", responseFormat);
  formData.append("temperature", temperature.toString());
  formData.append("model", model);
  formData.append(
    "timestamp_granularities",
    JSON.stringify(timestampGranularities)
  );

  if (language) {
    formData.append("language", language);
  }

  if (prompt) {
    formData.append("prompt", prompt);
  }

  const response = await fetch("/api/groq/transcribe", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || "Failed to transcribe audio");
  }

  return response.json();
}

/**
 * Merge multiple transcription responses into one
 */
function mergeTranscriptions(
  chunks: Array<{ transcription: TranscriptionResponse; startTime: number }>
): TranscriptionResponse {
  const merged: TranscriptionResponse = {
    success: true,
    transcription: {
      text: "",
      task: chunks[0]?.transcription.transcription.task,
      language: chunks[0]?.transcription.transcription.language,
      duration: 0,
      segments: [],
      words: [],
    },
    metadata: {
      ...chunks[0]?.transcription.metadata,
      fileName: chunks[0]?.transcription.metadata.fileName.replace(
        /_chunk_\d+/,
        ""
      ),
    },
  };

  let textParts: string[] = [];

  for (const { transcription, startTime } of chunks) {
    const trans = transcription.transcription;

    // Merge text
    if (trans.text) {
      textParts.push(trans.text.trim());
    }

    // Merge segments with time offset
    if (trans.segments) {
      for (const segment of trans.segments) {
        merged.transcription.segments!.push({
          ...segment,
          start: segment.start + startTime,
          end: segment.end + startTime,
        });
      }
    }

    // Merge words with time offset
    if (trans.words) {
      for (const word of trans.words) {
        merged.transcription.words!.push({
          ...word,
          start: word.start + startTime,
          end: word.end + startTime,
        });
      }
    }

    // Update duration
    if (trans.duration) {
      merged.transcription.duration = startTime + trans.duration;
    }
  }

  merged.transcription.text = textParts.join(" ");

  return merged;
}

/**
 * Transcribe an audio file using Groq's Whisper API
 * Automatically chunks large files to avoid size limits
 */
export async function transcribeAudio(
  options: TranscriptionOptions
): Promise<TranscriptionResponse> {
  const { file, onProgress, ...transcriptionOptions } = options;

  const fileSizeMB = file.size / (1024 * 1024);
  console.log(
    `[Transcription] File: ${file.name}, Size: ${fileSizeMB.toFixed(2)}MB`
  );

  // Check file size - Groq free tier limit is 25MB, we use 20MB to be safe
  const maxFileSize = 20 * 1024 * 1024; // 20MB

  if (file.size <= maxFileSize) {
    console.log(
      `[Transcription] File is small enough (${fileSizeMB.toFixed(
        2
      )}MB <= 20MB), transcribing directly`
    );
    // File is small enough, transcribe directly
    return transcribeChunk(file, file.name, transcriptionOptions);
  }

  console.log(
    `[Transcription] File is too large (${fileSizeMB.toFixed(
      2
    )}MB > 20MB), chunking required`
  );

  // File is too large, need to chunk it
  const { splitAudioIntoChunks } = await import("./audio-chunker");
  const chunks = await splitAudioIntoChunks(file, 20); // 20MB max per chunk

  const transcriptions: Array<{
    transcription: TranscriptionResponse;
    startTime: number;
  }> = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    // Report progress
    if (onProgress) {
      onProgress({
        current: i + 1,
        total: chunks.length,
        percentage: Math.round(((i + 1) / chunks.length) * 100),
      });
    }

    // Transcribe chunk
    const chunkFileName = `${file.name.replace(
      /\.[^/.]+$/,
      ""
    )}_chunk_${i}.wav`;
    const transcription = await transcribeChunk(
      chunk.blob,
      chunkFileName,
      transcriptionOptions
    );

    transcriptions.push({
      transcription,
      startTime: chunk.startTime,
    });
  }

  // Merge all transcriptions
  return mergeTranscriptions(transcriptions);
}

/**
 * Format duration in seconds to human-readable format (MM:SS)
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Calculate quality score from transcription metadata
 */
export function calculateQualityScore(segment: TranscriptionSegment): {
  score: number;
  issues: string[];
} {
  const issues: string[] = [];
  let score = 100;

  // Check average log probability (confidence)
  if (segment.avg_logprob < -0.5) {
    score -= 30;
    issues.push("Low confidence transcription");
  } else if (segment.avg_logprob < -0.3) {
    score -= 15;
    issues.push("Moderate confidence");
  }

  // Check no speech probability
  if (segment.no_speech_prob > 0.5) {
    score -= 40;
    issues.push("High probability of non-speech audio");
  } else if (segment.no_speech_prob > 0.3) {
    score -= 20;
    issues.push("Possible non-speech audio");
  }

  // Check compression ratio
  if (segment.compression_ratio > 2.5 || segment.compression_ratio < 1.0) {
    score -= 15;
    issues.push("Unusual speech patterns detected");
  }

  return { score: Math.max(0, score), issues };
}

/**
 * Extract text for a specific time range
 */
export function extractTextByTimeRange(
  segments: TranscriptionSegment[],
  startTime: number,
  endTime: number
): string {
  return segments
    .filter(
      (segment) =>
        (segment.start >= startTime && segment.start < endTime) ||
        (segment.end > startTime && segment.end <= endTime) ||
        (segment.start < startTime && segment.end > endTime)
    )
    .map((segment) => segment.text.trim())
    .join(" ");
}

/**
 * Find segments containing specific keywords
 */
export function findSegmentsByKeywords(
  segments: TranscriptionSegment[],
  keywords: string[]
): TranscriptionSegment[] {
  const lowerKeywords = keywords.map((k) => k.toLowerCase());
  return segments.filter((segment) => {
    const lowerText = segment.text.toLowerCase();
    return lowerKeywords.some((keyword) => lowerText.includes(keyword));
  });
}

/**
 * Generate a summary of transcription quality
 */
export function generateQualitySummary(segments: TranscriptionSegment[]): {
  averageConfidence: number;
  lowQualitySegments: number;
  totalDuration: number;
  issues: string[];
} {
  const allIssues = new Set<string>();
  let lowQualityCount = 0;
  let totalConfidence = 0;

  segments.forEach((segment) => {
    const { score, issues } = calculateQualityScore(segment);
    totalConfidence += segment.avg_logprob;
    if (score < 70) {
      lowQualityCount++;
      issues.forEach((issue) => allIssues.add(issue));
    }
  });

  const lastSegment = segments[segments.length - 1];
  const totalDuration = lastSegment ? lastSegment.end : 0;

  return {
    averageConfidence: totalConfidence / segments.length,
    lowQualitySegments: lowQualityCount,
    totalDuration,
    issues: Array.from(allIssues),
  };
}
