# Tool Calling System - Fixes & Implementation Status

## ✅ Fixed Issues

### 1. MediaBunny Import Error

**Problem:** The code was trying to import a non-existent `MediaBunny` class

```typescript
import { MediaBunny } from "mediabunny"; // ❌ Wrong
```

**Fix:** Updated to use the correct MediaBunny API exports

```typescript
import {
  Input,
  Output,
  Conversion,
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Mp4OutputFormat,
} from "mediabunny"; // ✅ Correct
```

### 2. Token Limit Exceeded

**Problem:** Groq API was receiving 9,231 tokens when the limit is 8,000

- Each file was sending 6,000 characters of raw text
- Each file was sending 30 transcript segments

**Fix:** Reduced context size in `agent-chat.ts`

- Raw text preview: 6,000 → 2,000 characters
- Transcript segments: 30 → 15 segments

### 3. Tool Execution Not Connected

**Problem:** The page.tsx wasn't executing tools when the AI requested them

**Fix:** Added tool execution logic to `handleSubmit`:

```typescript
// Detects keywords like "create", "make", "generate", "yes"
if (shouldCheckTools) {
  // Calls non-streaming API to check for tool calls
  const response = await callGroqAPIWithTools(...);

  // If tool call found, execute it
  if (response.toolCalls && response.toolCalls.length > 0) {
    const toolResult = await executeToolCall(...);
    // Show progress and results
  }
}
```

### 4. IndexedDB File Retrieval

**Problem:** Tool functions were trying to get raw Blobs but IndexedDB stores UploadedFile objects

**Fix:** Updated `getFileFromStorage` helper:

```typescript
async function getFileFromStorage(fileIdOrName: string) {
  const files = await fileStorage.getFiles();
  // Try to find by ID first, then by name
  const uploadedFile = files.find(
    (f) => f.id === fileIdOrName || f.name === fileIdOrName
  );
  return { file: uploadedFile.file, uploadedFile };
}
```

### 5. Simplified Tool Implementation

**Problem:** The original code assumed MediaBunny had high-level methods like `trim()`, `concat()`, `replaceAudio()` which don't exist

**Fix:** Created simplified implementations:

- `extractSegment` - Returns file with metadata about time range
- `concatenateSegments` - Returns first segment (placeholder for now)
- `overlayAudio`, `overlayImage`, `overlayText` - Return video unchanged (TODOs)
- `composeVideo` - Main orchestrator that saves result to IndexedDB

## 🎯 Current Behavior

### What Works Now:

1. ✅ Tool calls are properly detected when user says "create", "make", "generate", etc.
2. ✅ The `composeVideo` tool is called with the timeline
3. ✅ Files are retrieved from IndexedDB by ID or name
4. ✅ The result is saved back to IndexedDB
5. ✅ File list refreshes to show the new video
6. ✅ Progress updates are shown during tool execution
7. ✅ No more import errors or linter errors

### What's Simplified:

- **Video composition:** Currently just saves the first video segment from the timeline
- **Trimming:** Metadata is tracked but actual video trimming not implemented
- **Concatenation:** Only returns first segment
- **Overlays (audio/image/text):** Pass-through (return unchanged)
- **Black screen generation:** Not implemented (throws error)

## 🔧 What Needs Full Implementation

### MediaBunny Integration

The real MediaBunny API is lower-level and requires:

1. **Input/Output System:**

   ```typescript
   const input = new Input({
     source: new BlobSource(file),
     formats: ALL_FORMATS,
   });

   const output = new Output({
     format: new Mp4OutputFormat(),
     target: new BufferTarget(),
   });
   ```

2. **Conversion System:**
   ```typescript
   const conversion = await Conversion.init({ input, output });
   await conversion.execute();
   const buffer = output.target.buffer;
   ```

### Features to Implement:

#### 1. Video Trimming

```typescript
// Extract specific time range from video
export async function extractSegment(fileId, timeRange) {
  const input = new Input({ source: new BlobSource(file) });
  const output = new Output({ format: new Mp4OutputFormat() });

  // Set trim filters/options (need to research MediaBunny API)
  // Apply startTime and endTime

  const conversion = await Conversion.init({ input, output });
  await conversion.execute();
  return new File([output.target.buffer], "segment.mp4");
}
```

#### 2. Video Concatenation

```typescript
// Join multiple video segments
export async function concatenateSegments(segments) {
  // Need to research MediaBunny's concat functionality
  // May need to use custom filters or multiple conversion steps
}
```

#### 3. Audio Overlay

```typescript
// Replace or mix audio tracks
export async function overlayAudio(videoBlob, audioFileId, timeRange) {
  // Need to research MediaBunny's audio track manipulation
  // May need to extract audio track, trim it, then replace
}
```

#### 4. Image Overlay

```typescript
// Overlay image on video at position
export async function overlayImage(
  videoBlob,
  imageFileId,
  position,
  timeRange
) {
  // Need FFmpeg filter_complex equivalent in MediaBunny
  // Position calculations already implemented
}
```

#### 5. Text Overlay

```typescript
// Add text to video
export async function overlayText(videoBlob, textConfig) {
  // Need FFmpeg drawtext filter equivalent in MediaBunny
}
```

## 📚 Next Steps

### Immediate (Tool Calling Works):

1. ✅ Fix MediaBunny imports
2. ✅ Reduce token usage
3. ✅ Connect tool execution
4. ✅ Save results to IndexedDB

### Phase 2 (Basic Video Editing):

1. ⚠️ Research MediaBunny's actual API for video operations
2. ⚠️ Implement proper video trimming
3. ⚠️ Implement video concatenation
4. ⚠️ Test with real video files

### Phase 3 (Advanced Features):

1. ⚠️ Implement audio overlay/replacement
2. ⚠️ Implement image overlays with positioning
3. ⚠️ Implement text overlays
4. ⚠️ Implement blank video generation

### Phase 4 (Polish):

1. ⚠️ Add better progress tracking with actual percentages
2. ⚠️ Add preview functionality for generated videos
3. ⚠️ Add video player in the UI
4. ⚠️ Add download functionality

## 🧪 Testing the Current Implementation

### Test 1: Simple Tool Call

```
User: "Create a video from my uploaded files"
Expected:
- Tool detected ✅
- composeVideo called ✅
- First video segment saved to IndexedDB ✅
- File list refreshed ✅
```

### Test 2: Timeline-Based Request

```
User: "Yes, create Option A" (after agent suggests timeline)
Expected:
- Tool detected ✅
- Timeline parsed from conversation context ✅
- Video created and saved ✅
- Success message shown ✅
```

### Test 3: Progress Updates

```
During tool execution:
- "Initializing" - 0%
- "Processing timeline segments" - 10%
- "Processing segment 1/4" - 20%
- "Creating final video" - 60%
- "Saving final video" - 80%
- "Complete" - 100%
```

## 🎬 Example Tool Call Flow

1. **User:** "Yes, create that video"
2. **System:** Detects keywords → calls `callGroqAPIWithTools`
3. **AI:** Returns tool call: `composeVideo` with timeline JSON
4. **System:** Shows "🎬 Executing tool: composeVideo"
5. **Tool:**
   - Validates timeline
   - Extracts video segments (with time range metadata)
   - Creates final file (currently: first segment)
   - Saves to IndexedDB
6. **System:** Shows success message with file details
7. **UI:** Refreshes file list → new video appears

## 📝 Important Notes

### Current Limitations:

- Video editing is **simplified** - just returns first segment
- No actual trimming/cutting implemented yet
- No overlays working yet
- MediaBunny API needs further research for full implementation

### What Works Well:

- Tool calling mechanism ✅
- File storage/retrieval ✅
- Progress tracking ✅
- Error handling ✅
- UI updates ✅

### Files Modified:

1. `src/app/moviemaker-agent/lib/agent-tools.ts` - Fixed imports, simplified implementations
2. `src/app/moviemaker-agent/lib/agent-chat.ts` - Reduced context size
3. `src/app/moviemaker-agent/page.tsx` - Added tool execution logic

## 🔗 Resources

- [MediaBunny Documentation](https://mediabunny.dev/) - Full API reference
- [MediaBunny GitHub](https://github.com/birjolaxew/mediabunny) - Source code and examples
- Project uses mediabunny@1.23.0

## 🚀 Getting Started

To test the current implementation:

1. Upload video files
2. Ask the AI to suggest clips
3. Say "yes, create that" or "make option A"
4. Watch the tool execution progress
5. Check IndexedDB for the saved video (currently the source video file)

The tool calling system is **working** but video editing features need MediaBunny API implementation!
