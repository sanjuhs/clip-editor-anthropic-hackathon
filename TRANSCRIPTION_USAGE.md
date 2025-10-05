# Audio Transcription with Groq Whisper API

This project uses Groq's Whisper API for fast, accurate audio transcription with word-level timestamps.

## Features

- ⚡ Ultra-fast transcription using `whisper-large-v3-turbo`
- 📊 Word-level and segment-level timestamps
- 🌍 Multilingual support (99+ languages)
- 📈 Quality metrics (confidence scores, speech detection)
- 🎯 Automatic language detection
- 💾 Persistent storage in IndexedDB

## API Endpoint

### POST `/api/groq/transcribe`

Transcribes audio files to text with detailed timestamps.

#### Request (FormData)

```typescript
const formData = new FormData();
formData.append("file", audioFile); // Required
formData.append("model", "whisper-large-v3-turbo"); // Optional
formData.append("language", "en"); // Optional
formData.append("response_format", "verbose_json"); // Optional
formData.append("temperature", "0"); // Optional
formData.append("prompt", "Context about the audio..."); // Optional
formData.append("timestamp_granularities", '["word","segment"]'); // Optional
```

#### Response

```json
{
  "success": true,
  "transcription": {
    "text": "Full transcribed text...",
    "language": "en",
    "duration": 123.45,
    "segments": [
      {
        "id": 0,
        "start": 0.0,
        "end": 5.2,
        "text": "First segment text",
        "avg_logprob": -0.12,
        "compression_ratio": 1.65,
        "no_speech_prob": 0.01
      }
    ],
    "words": [
      {
        "word": "First",
        "start": 0.0,
        "end": 0.5
      }
    ]
  },
  "metadata": {
    "fileName": "audio.mp3",
    "fileSize": 1048576,
    "fileType": "audio/mpeg",
    "model": "whisper-large-v3-turbo",
    "language": "en",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## Client-Side Usage

### Basic Transcription

```typescript
import { transcribeAudio } from "@/app/moviemaker-agent/lib/transcription";

const audioFile = document.querySelector('input[type="file"]').files[0];

const result = await transcribeAudio({
  file: audioFile,
  model: "whisper-large-v3-turbo",
  responseFormat: "verbose_json",
});

console.log(result.transcription.text);
```

### With Language Specification

```typescript
const result = await transcribeAudio({
  file: audioFile,
  language: "es", // Spanish
  model: "whisper-large-v3-turbo",
});
```

### With Context Prompt

```typescript
const result = await transcribeAudio({
  file: audioFile,
  prompt: "This is a medical consultation discussing diabetes treatment",
  model: "whisper-large-v3",
});
```

## Helper Functions

### Extract Text by Time Range

```typescript
import { extractTextByTimeRange } from "@/app/moviemaker-agent/lib/transcription";

const segments = result.transcription.segments;
const text = extractTextByTimeRange(segments, 10, 30); // 10s to 30s
```

### Find Segments by Keywords

```typescript
import { findSegmentsByKeywords } from "@/app/moviemaker-agent/lib/transcription";

const segments = result.transcription.segments;
const relevantSegments = findSegmentsByKeywords(segments, [
  "important",
  "key point",
]);
```

### Calculate Quality Score

```typescript
import { calculateQualityScore } from "@/app/moviemaker-agent/lib/transcription";

const segment = result.transcription.segments[0];
const { score, issues } = calculateQualityScore(segment);

if (score < 70) {
  console.log("Low quality segment:", issues);
}
```

### Generate Quality Summary

```typescript
import { generateQualitySummary } from "@/app/moviemaker-agent/lib/transcription";

const summary = generateQualitySummary(result.transcription.segments);
console.log(`Average confidence: ${summary.averageConfidence}`);
console.log(`Low quality segments: ${summary.lowQualitySegments}`);
console.log(`Issues: ${summary.issues.join(", ")}`);
```

## Understanding Quality Metrics

### avg_logprob (Average Log Probability)

- **Range**: -∞ to 0
- **Good**: -0.1 or higher (closer to 0)
- **Concerning**: Below -0.5
- **Indicates**: Model's confidence in the transcription

### no_speech_prob (No Speech Probability)

- **Range**: 0 to 1
- **Good**: Below 0.1
- **Concerning**: Above 0.5
- **Indicates**: Likelihood that the segment contains no speech

### compression_ratio

- **Range**: Typically 1.0 to 2.5
- **Good**: 1.5 to 2.0
- **Concerning**: < 1.0 or > 2.5
- **Indicates**: Speech pattern normality

## Model Selection

### whisper-large-v3-turbo (Default)

- **Speed**: 216x faster than real-time
- **Cost**: $0.04 per hour
- **Word Error Rate**: 12%
- **Best for**: Fast processing, good accuracy, cost-effective

### whisper-large-v3

- **Speed**: 189x faster than real-time
- **Cost**: $0.111 per hour
- **Word Error Rate**: 10.3%
- **Best for**: Maximum accuracy, error-sensitive applications

## Supported File Types

- FLAC (.flac)
- MP3 (.mp3)
- MP4 (.mp4)
- MPEG (.mpeg)
- MPGA (.mpga)
- M4A (.m4a)
- OGG (.ogg)
- WAV (.wav)
- WebM (.webm)

## File Size Limits

- **Free tier**: 25 MB
- **Dev tier**: 100 MB
- **Minimum duration**: 0.01 seconds
- **Minimum billed**: 10 seconds

## Automatic Processing

When you upload an audio or video file in the Movie Maker Agent, it automatically:

1. ✅ Uploads the file to IndexedDB
2. 🎙️ Starts transcription with Groq Whisper
3. ⏱️ Extracts word-level and segment-level timestamps
4. 📝 Saves the full transcript as raw text
5. 📊 Generates a summary with metadata
6. ✅ Marks the file as "indexed" when complete

## Error Handling

```typescript
try {
  const result = await transcribeAudio({ file: audioFile });
} catch (error) {
  if (error.message.includes("API key")) {
    // Handle API key issues
  } else if (error.message.includes("file size")) {
    // Handle file size issues
  } else {
    // Handle other errors
  }
}
```

## Best Practices

1. **Specify language when known** - Improves accuracy and speed
2. **Use prompt for context** - Helps with domain-specific terminology
3. **Monitor quality metrics** - Check segments with low confidence
4. **Optimize audio quality** - 16kHz mono WAV is ideal
5. **Keep files under 25MB** - Or use chunking for larger files

## Next Steps

- Video transcription with keyframe extraction
- Image analysis with Moondream API
- Document text extraction
- AI-powered clip generation based on transcripts
