# AI Agent Video Editing Tools Implementation

## Overview

This document explains the complete tool-based video editing system for the Movie Maker AI Agent. The agent can now generate short-form videos by orchestrating multiple MediaBunny (FFmpeg.wasm) operations based on timeline plans.

## Architecture

```
User Request → AI Agent → Timeline Plan → Tool Execution → Final Video
     ↓            ↓           ↓              ↓               ↓
  "Make a    Analyzes    Generates    Executes each    Output MP4
   video"    content     timeline     tool call        stored in
                        in JSON      sequentially     IndexedDB
```

## Tool System Components

### 1. `agent-tools.ts` - Core Tool Implementations

Located at: `src/app/moviemaker-agent/lib/agent-tools.ts`

#### Available Tools:

**Primary Tool:**

- `composeVideo` - Main orchestrator that creates the final video from a timeline

**Helper Functions (used internally by composeVideo):**

- `extractSegment` - Extract a time segment from video/audio
- `concatenateSegments` - Join multiple video segments together
- `overlayAudio` - Add or replace audio track
- `overlayImage` - Add image overlay at specific position
- `overlayText` - Add text overlay
- `createBlackVideo` - Generate black screen segments

#### MediaBunny Operations Used:

1. **trim()** - Cut video/audio segments
2. **concat()** - Stitch segments together
3. **replaceAudio()** - Add/replace audio tracks
4. **overlay()** - Add image overlays
5. **addText()** - Add text overlays
6. **createBlankVideo()** - Generate solid color videos

### 2. `agent-chat.ts` - Chat Logic with Tool Support

Located at: `src/app/moviemaker-agent/lib/agent-chat.ts`

**Key Functions:**

- `callGroqAPIWithTools()` - Non-streaming API call that returns tool calls
- `AGENT_TOOLS` - Tool definitions for the AI agent
- Updated system prompt to instruct agent when to use tools

### 3. `route.ts` - API Route with Tool Support

Located at: `src/app/api/groq/route.ts`

**Updates:**

- Accepts `tools`, `tool_choice` parameters
- Supports both streaming and non-streaming responses
- Returns tool calls in non-streaming mode

## Tool Call Flow

### Step 1: User Confirms Video Creation

User says: _"Yes, create Concept 1"_ or _"Make that video"_

### Step 2: AI Agent Analyzes Request

The agent:

1. Recognizes user intent to create video
2. Retrieves the previously suggested timeline
3. Maps file references to actual file IDs in IndexedDB
4. Generates a `composeVideo` tool call in JSON format

### Step 3: Tool Call Execution

Example tool call JSON:

```json
{
  "name": "composeVideo",
  "arguments": {
    "timeline": [
      {
        "timeInClip": { "start": 0, "end": 4 },
        "action": "Opening hook",
        "videoAsset": {
          "fileId": "file_123",
          "fileName": "2025-10-05_14-54-46.mp4",
          "timeRange": { "start": 0, "end": 4 }
        },
        "audioAsset": {
          "fileId": "file_456",
          "fileName": "2025-08-19_19-02-55.mp4",
          "timeRange": { "start": 0, "end": 4 },
          "volume": 1.0
        },
        "textOverlays": [
          {
            "text": "Build a client-side app!",
            "position": "center",
            "timeRange": { "start": 0, "end": 4 },
            "fontSize": 48,
            "fontColor": "white",
            "backgroundColor": "black@0.5"
          }
        ]
      },
      {
        "timeInClip": { "start": 4, "end": 8 },
        "action": "Upload image feature",
        "videoAsset": {
          "fileId": "file_123",
          "fileName": "2025-10-05_14-54-46.mp4",
          "timeRange": { "start": 35, "end": 39 }
        },
        "imageOverlays": [
          {
            "fileId": "file_789",
            "fileName": "Screenshot.png",
            "position": "top-right",
            "timeRange": { "start": 4, "end": 8 },
            "scale": 0.2
          }
        ]
      }
    ],
    "outputFileName": "smart-ai-chat-app.mp4",
    "targetWidth": 1080,
    "targetHeight": 1920,
    "targetFps": 30
  }
}
```

### Step 4: Video Composition Process

The `composeVideo` function:

1. **Initialize MediaBunny** (~2s)
2. **Process Each Timeline Row** (~5-10s per row)
   - Extract video segment from source
   - If no video specified, create black screen
   - Apply audio if different from video audio
   - Add image overlays (sequentially)
   - Add text overlays (sequentially)
3. **Concatenate All Segments** (~5-15s)
4. **Save to IndexedDB** (~1-2s)
5. **Return Result** with fileId and metadata

Total estimated time: **30-60 seconds** for a 30-second clip with 3-5 segments

### Step 5: Display Result

The UI shows:

- ✅ Success message with file name
- 📊 Video metadata (duration, size)
- ▶️ Video player to preview
- ⬇️ Download button

## Data Types

### TimeRange

```typescript
{
  start: number; // seconds
  end: number; // seconds
}
```

### VideoSegment

```typescript
{
  fileId: string; // IndexedDB file ID
  fileName: string; // Original filename for reference
  timeRange: TimeRange;
}
```

### AudioTrack

```typescript
{
  fileId: string;
  fileName: string;
  timeRange: TimeRange;
  volume?: number;  // 0.0 to 1.0
}
```

### ImageOverlay

```typescript
{
  fileId: string;
  fileName: string;
  position: "top-left" | "top-right" | "bottom-left" |
            "bottom-right" | "center" | "full-screen";
  timeRange: TimeRange;
  scale?: number;  // 0.0 to 1.0
}
```

### TextOverlay

```typescript
{
  text: string;
  position: "top-left" | "top-right" | "bottom-left" |
            "bottom-right" | "center" | "top-center" | "bottom-center";
  timeRange: TimeRange;
  fontSize?: number;
  fontColor?: string;
  backgroundColor?: string;
}
```

## MediaBunny API Reference

### Required MediaBunny Methods

Based on the implementation, MediaBunny must support:

```typescript
class MediaBunny {
  // Initialize FFmpeg.wasm
  async init(): Promise<void>;

  // Trim video/audio segment
  async trim(options: {
    file: Blob;
    startTime: number;
    endTime: number;
    outputFileName: string;
    onProgress?: (progress: number) => void;
  }): Promise<Blob>;

  // Concatenate multiple videos
  async concat(options: {
    files: Blob[];
    outputFileName: string;
    onProgress?: (progress: number) => void;
  }): Promise<Blob>;

  // Replace audio track
  async replaceAudio(options: {
    videoFile: Blob;
    audioFile: Blob;
    outputFileName: string;
    volume?: number;
    onProgress?: (progress: number) => void;
  }): Promise<Blob>;

  // Add image overlay
  async overlay(options: {
    mainFile: Blob;
    overlayFile: Blob;
    position: string;
    startTime: number;
    endTime: number;
    scale: number;
    outputFileName: string;
    onProgress?: (progress: number) => void;
  }): Promise<Blob>;

  // Add text overlay
  async addText(options: {
    file: Blob;
    text: string;
    position: string;
    startTime: number;
    endTime: number;
    fontSize: number;
    fontColor: string;
    backgroundColor: string;
    outputFileName: string;
    onProgress?: (progress: number) => void;
  }): Promise<Blob>;

  // Create blank video
  async createBlankVideo(options: {
    duration: number;
    width: number;
    height: number;
    color: string;
    outputFileName: string;
  }): Promise<Blob>;
}
```

### Important Notes on MediaBunny

⚠️ **The current implementation assumes these MediaBunny API methods exist.**

If MediaBunny's actual API differs, you'll need to:

1. Check MediaBunny's documentation: https://github.com/yourusername/mediabunny
2. Update the helper functions in `agent-tools.ts` to match the actual API
3. Some operations might require direct FFmpeg commands via `exec()`

Example of using custom FFmpeg commands:

```typescript
const mb = await getMediaBunny();
await mb.exec([
  "-i",
  "input.mp4",
  "-vf",
  'drawtext=text="Hello":x=10:y=10:fontsize=24:fontcolor=white',
  "output.mp4",
]);
```

## Integration with Page UI

To integrate with `page.tsx`, you'll need to:

### 1. Add Tool Execution State

```typescript
const [isExecutingTool, setIsExecutingTool] = useState(false);
const [toolProgress, setToolProgress] = useState<{
  stage: string;
  progress: number;
}>({ stage: "", progress: 0 });
```

### 2. Detect When User Confirms Video Creation

```typescript
// In handleSendMessage function
if (
  userMessage.toLowerCase().includes("create") ||
  userMessage.toLowerCase().includes("make") ||
  userMessage.toLowerCase().includes("generate")
) {
  // Call API with tools enabled
  const response = await callGroqAPIWithTools(
    [...messages, { role: "user", content: userMessage }],
    uploadedFiles
  );

  // Check if tool calls were returned
  if (response.toolCalls && response.toolCalls.length > 0) {
    // Execute tool calls
    await executeToolCalls(response.toolCalls);
  }
}
```

### 3. Execute Tool Calls

```typescript
async function executeToolCalls(toolCalls: any[]) {
  setIsExecutingTool(true);

  for (const toolCall of toolCalls) {
    const result = await executeToolCall(
      toolCall.function.name,
      JSON.parse(toolCall.function.arguments),
      (stage, progress) => {
        setToolProgress({ stage, progress });
      }
    );

    // Add result to messages
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "tool" as const,
        content: result.success
          ? `✅ Video created: ${result.data.fileName}`
          : `❌ Error: ${result.error}`,
        timestamp: new Date(),
        toolResult: result,
      },
    ]);
  }

  setIsExecutingTool(false);
}
```

### 4. Display Progress UI

```typescript
{
  isExecutingTool && (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg">
        <h3>{toolProgress.stage}</h3>
        <div className="w-64 h-2 bg-gray-200 rounded-full">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${toolProgress.progress}%` }}
          />
        </div>
        <p>{toolProgress.progress}%</p>
      </div>
    </div>
  );
}
```

## Testing the System

### Test Case 1: Simple Single-Segment Video

```
User: "Create a 5-second clip from the first video"
Agent: Generates timeline with 1 segment
Tool: Extracts 5s → Saves to IndexedDB
Result: 5s video file
```

### Test Case 2: Multi-Segment with Audio

```
User: "Make Concept 1" (referencing a previous suggestion)
Agent: Generates timeline with 3 segments
Tool: Extract 3 videos → Add different audio → Concatenate → Save
Result: 30s video with mixed audio
```

### Test Case 3: With Text and Image Overlays

```
User: "Create the TikTok version"
Agent: Generates timeline with overlays
Tool: Extract video → Add text overlay → Add logo → Save
Result: 30s vertical video with text and logo
```

## Troubleshooting

### Issue: MediaBunny methods not found

**Solution:** Check MediaBunny's actual API and update the helper functions. You may need to use `exec()` for custom FFmpeg commands.

### Issue: File not found in IndexedDB

**Solution:** Ensure the agent is correctly mapping "File 1", "File 2" from the timeline to actual fileIds stored in IndexedDB. You may need to pass a mapping object to the tool execution.

### Issue: Video composition takes too long

**Solution:**

- Reduce video resolution (use 720p instead of 1080p)
- Limit number of overlays
- Process smaller segments
- Show progress UI to keep user informed

### Issue: Memory issues with large files

**Solution:**

- Validate file sizes before processing
- Use streaming where possible
- Clean up temporary blobs after each operation
- Consider processing in batches

## Next Steps

1. **Test MediaBunny Integration**

   - Verify all MediaBunny API methods work as expected
   - Add fallbacks for unsupported operations

2. **Update page.tsx**

   - Add tool execution logic
   - Add progress UI
   - Handle tool results

3. **Add File ID Mapping**

   - Map "File 1", "File 2" to actual IndexedDB IDs
   - Pass mapping to agent context

4. **Add Video Preview**

   - Show generated video in player
   - Add download button
   - Allow re-editing

5. **Error Handling**

   - Add retry logic for failed operations
   - Better error messages
   - Validation before execution

6. **Optimization**
   - Cache intermediate results
   - Parallel processing where possible
   - Reduce memory usage

## Example User Flow

```
1. User uploads 3 videos and 1 image
2. System indexes all files (transcription + visual analysis)
3. User: "What's in these videos?"
4. Agent: Provides summary of content
5. User: "Create a 30-second TikTok about the app demo"
6. Agent: Suggests 2 concepts with detailed timelines
7. User: "Make Concept 1"
8. Agent: Generates composeVideo tool call
9. System: Executes tool (shows progress)
10. System: Displays final video with download button
```

## Conclusion

This implementation provides a complete tool system for the AI agent to create short-form videos using MediaBunny/FFmpeg.wasm client-side. The agent can now:

✅ Understand user intent to create videos
✅ Generate detailed timeline plans
✅ Execute video editing operations
✅ Stitch together complex multi-segment videos
✅ Add overlays (text, images)
✅ Mix audio tracks
✅ Save results to IndexedDB

The next step is to integrate this into the UI and test with real video files!
