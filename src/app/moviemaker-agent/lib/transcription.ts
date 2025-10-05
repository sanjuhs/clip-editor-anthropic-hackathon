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
}

/**
 * Transcribe an audio file using Groq's Whisper API
 */
export async function transcribeAudio(
  options: TranscriptionOptions
): Promise<TranscriptionResponse> {
  const {
    file,
    language,
    prompt,
    responseFormat = "verbose_json",
    temperature = 0,
    model = "whisper-large-v3-turbo",
    timestampGranularities = ["word", "segment"],
  } = options;

  const formData = new FormData();
  formData.append("file", file);
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
