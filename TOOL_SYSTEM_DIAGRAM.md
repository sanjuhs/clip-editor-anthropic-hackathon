# AI Agent Video Editing Tool System - Visual Diagram

## 🎬 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER INTERACTION                               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌───────────────────────────────────────────────────┐
        │  User: "Create a 30-second TikTok from my demo"  │
        └───────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        AI AGENT ANALYSIS                                 │
│  - Searches relevant files (searchRelevantFiles)                        │
│  - Builds context with transcripts (buildContextFromFiles)              │
│  - Generates timeline suggestion with timestamps                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌───────────────────────────────────────────────────┐
        │  Agent: "Here are 2 concepts with timelines..."   │
        │                                                    │
        │  Concept 1 - Timeline Table:                      │
        │  0:00-0:05: Video from File 1 [0:05→0:10]        │
        │  0:05-0:10: Video from File 1 [2:30→2:35]        │
        │  + Logo overlay + Text "Watch this!"             │
        └───────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌───────────────────────────────────────────────────┐
        │  User: "Yes, make Concept 1"                      │
        └───────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      TOOL CALL GENERATION                                │
│  - Agent recognizes user intent to create video                         │
│  - Maps "File 1", "File 2" to actual IndexedDB file IDs                │
│  - Generates composeVideo tool call in JSON                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌───────────────────────────────────────────────────┐
        │  Tool Call JSON:                                  │
        │  {                                                 │
        │    "name": "composeVideo",                        │
        │    "arguments": {                                 │
        │      "timeline": [...],                           │
        │      "outputFileName": "tiktok.mp4"               │
        │    }                                               │
        │  }                                                 │
        └───────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      TOOL EXECUTION (client-side)                        │
│  executeToolCall("composeVideo", arguments, onProgress)                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │   composeVideo Orchestrator   │
                    └───────────────┬───────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
            ▼                       ▼                       ▼
    ┌──────────────┐        ┌──────────────┐      ┌──────────────┐
    │  Timeline    │        │  Timeline    │      │  Timeline    │
    │  Row 1       │        │  Row 2       │      │  Row 3       │
    │  (0:00-0:05) │        │  (0:05-0:10) │      │  (0:10-0:15) │
    └──────────────┘        └──────────────┘      └──────────────┘
            │                       │                       │
            ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     SEGMENT PROCESSING PIPELINE                          │
│                                                                           │
│  For Each Timeline Row:                                                  │
│                                                                           │
│  1. ┌─────────────────┐                                                 │
│     │ extractSegment  │  Cut video from source file                     │
│     │ (MediaBunny     │  Input: File blob + time range                  │
│     │  trim method)   │  Output: Video segment blob                     │
│     └────────┬────────┘                                                 │
│              │                                                            │
│              ▼                                                            │
│  2. ┌─────────────────┐                                                 │
│     │ overlayAudio    │  Add/replace audio track (if different)         │
│     │ (MediaBunny     │  Input: Video blob + audio blob                 │
│     │  replaceAudio)  │  Output: Video with new audio                   │
│     └────────┬────────┘                                                 │
│              │                                                            │
│              ▼                                                            │
│  3. ┌─────────────────┐                                                 │
│     │ overlayImage    │  Add logo/graphic overlay (for each)            │
│     │ (MediaBunny     │  Input: Video blob + image blob + position      │
│     │  overlay)       │  Output: Video with image overlay               │
│     └────────┬────────┘                                                 │
│              │                                                            │
│              ▼                                                            │
│  4. ┌─────────────────┐                                                 │
│     │ overlayText     │  Add text overlay (for each)                    │
│     │ (MediaBunny     │  Input: Video blob + text config                │
│     │  addText)       │  Output: Video with text overlay                │
│     └────────┬────────┘                                                 │
│              │                                                            │
│              ▼                                                            │
│     ┌─────────────────┐                                                 │
│     │ Processed       │                                                  │
│     │ Segment Blob    │                                                  │
│     └─────────────────┘                                                 │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
            ┌──────────────┐              ┌──────────────┐
            │  Segment 1   │              │  Segment 2   │  ...
            │  Blob        │              │  Blob        │
            └──────┬───────┘              └──────┬───────┘
                   │                              │
                   └──────────────┬───────────────┘
                                  ▼
                    ┌──────────────────────────┐
                    │  concatenateSegments     │
                    │  (MediaBunny concat)     │
                    │  Input: Array of blobs   │
                    │  Output: Final video     │
                    └──────────┬───────────────┘
                               ▼
                    ┌──────────────────────────┐
                    │  Final Video Blob        │
                    │  (e.g., 30-second clip)  │
                    └──────────┬───────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        SAVE TO INDEXEDDB                                 │
│  - Convert blob to File object                                           │
│  - Store in IndexedDB with unique ID                                     │
│  - Return file metadata (id, name, size, duration)                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌───────────────────────────────────────────────────┐
        │  Success Result:                                  │
        │  {                                                 │
        │    success: true,                                 │
        │    message: "Video composed successfully",        │
        │    data: {                                         │
        │      fileId: "generated_1728123456",              │
        │      fileName: "tiktok.mp4",                      │
        │      size: 5242880,                               │
        │      duration: 30                                 │
        │    }                                               │
        │  }                                                 │
        └───────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           DISPLAY RESULT                                 │
│  - Show success message in chat                                          │
│  - Display video player with preview                                     │
│  - Provide download button                                               │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ File Structure

```
clip-editor-anthropic-hackathon/
│
├── src/app/moviemaker-agent/
│   ├── lib/
│   │   ├── agent-tools.ts          ⭐ NEW - All video editing tools
│   │   ├── agent-chat.ts           🔧 UPDATED - Tool call support
│   │   ├── indexeddb.ts            ✅ Used for file storage
│   │   ├── transcription.ts        ✅ Used for audio analysis
│   │   ├── video.ts                ✅ Used for keyframe extraction
│   │   └── document.ts             ✅ Used for document analysis
│   │
│   ├── page.tsx                    ⚠️ NEEDS UPDATE - Add tool execution
│   └── types.ts                    ✅ Used for type definitions
│
├── src/app/api/
│   └── groq/
│       └── route.ts                🔧 UPDATED - Tool call API support
│
└── Documentation/
    ├── MEDIABUNNY_TOOLS_NEEDED.md      📚 MediaBunny requirements
    ├── AGENT_TOOLS_IMPLEMENTATION.md   📚 Architecture guide
    ├── IMPLEMENTATION_SUMMARY.md       📚 Quick summary
    └── TOOL_SYSTEM_DIAGRAM.md          📚 This file
```

---

## 🔧 MediaBunny Operations Pipeline

### Example: Creating a 15-second clip with 3 segments

```
Input Files (IndexedDB):
├── file_abc123: demo.mp4 (4 minutes)
├── file_def456: music.mp3 (2 minutes)
└── file_ghi789: logo.png

Timeline Definition:
├── Segment 1: 0:00-0:05 (video[0:05→0:10] + text "Watch!" + logo)
├── Segment 2: 0:05-0:10 (video[2:30→2:35] + logo)
└── Segment 3: 0:10-0:15 (black screen + text "Try it!" + logo)

Processing Flow:
│
├─ Segment 1 Processing
│  ├─ 1. trim(demo.mp4, 5, 10) → seg1.mp4
│  ├─ 2. addText(seg1.mp4, "Watch!") → seg1_text.mp4
│  └─ 3. overlay(seg1_text.mp4, logo.png) → seg1_final.mp4
│
├─ Segment 2 Processing
│  ├─ 1. trim(demo.mp4, 150, 155) → seg2.mp4
│  └─ 2. overlay(seg2.mp4, logo.png) → seg2_final.mp4
│
├─ Segment 3 Processing
│  ├─ 1. createBlankVideo(5s, black) → seg3.mp4
│  ├─ 2. addText(seg3.mp4, "Try it!") → seg3_text.mp4
│  └─ 3. overlay(seg3_text.mp4, logo.png) → seg3_final.mp4
│
└─ Final Composition
   ├─ 1. concat([seg1_final, seg2_final, seg3_final]) → final.mp4
   ├─ 2. replaceAudio(final.mp4, music.mp3) → final_music.mp4
   └─ 3. saveToIndexedDB(final_music.mp4) → file_generated_xyz

Result: 15-second vertical video with text, logo, and music
```

---

## 🎯 Tool Call Decision Tree

```
User Message
    │
    ├─ Contains "create", "make", "generate"?
    │   │
    │   ├─ YES → Call callGroqAPIWithTools() with tools enabled
    │   │   │
    │   │   ├─ Agent returns tool_calls?
    │   │   │   │
    │   │   │   ├─ YES → Execute tool calls
    │   │   │   │   └─ For each tool call:
    │   │   │   │       ├─ Parse arguments
    │   │   │   │       ├─ Execute composeVideo()
    │   │   │   │       ├─ Show progress UI
    │   │   │   │       └─ Display result
    │   │   │   │
    │   │   │   └─ NO → Show normal text response
    │   │   │
    │   │   └─ Return assistant message
    │   │
    │   └─ NO → Normal chat flow (no tools)
    │
    └─ Display message in chat
```

---

## 📊 State Management Flow

```
React Component State:
│
├── uploadedFiles: UploadedFile[]
│   └── Files stored in IndexedDB with metadata
│
├── messages: Message[]
│   ├── User messages
│   ├── Assistant messages
│   └── Tool result messages
│
├── isExecutingTool: boolean
│   └── Controls progress UI visibility
│
└── toolProgress: { stage: string, progress: number }
    └── Updates during video composition

State Updates:
│
1. User uploads files → uploadedFiles updated
2. User sends message → messages updated with user message
3. Agent responds → messages updated with assistant message
4. User confirms video → isExecutingTool = true
5. Tool executes → toolProgress updates (0% → 100%)
6. Tool completes → messages updated with result
7. Tool completes → isExecutingTool = false
```

---

## 🔍 Data Flow Through System

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. FILE UPLOAD                                                  │
│    User uploads video → IndexedDB → UploadedFile object         │
│    {                                                             │
│      id: "file_abc123",                                         │
│      name: "demo.mp4",                                          │
│      type: "video",                                             │
│      file: Blob,                                                │
│      transcript: { segments: [...] },                           │
│      duration: 266                                              │
│    }                                                             │
└─────────────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. CONTEXT BUILDING                                             │
│    buildContextFromFiles(uploadedFiles) → Context string        │
│    "File 1: demo.mp4 (video) - Duration: 4m 26s                │
│     Transcript: [0s-5s]: 'Welcome to the demo...'              │
│                 [5s-10s]: 'Here's how it works...'             │
│     ..."                                                         │
└─────────────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. AI AGENT PROCESSING                                          │
│    Prompt + Context → Groq API → Timeline suggestion            │
│    "Concept 1:                                                  │
│     0:00-0:05: File 1 [0:05→0:10]                              │
│     0:05-0:10: File 1 [2:30→2:35] + logo                       │
│     ..."                                                         │
└─────────────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. TOOL CALL GENERATION                                         │
│    Timeline → JSON tool call                                    │
│    {                                                             │
│      name: "composeVideo",                                      │
│      arguments: {                                               │
│        timeline: [                                              │
│          {                                                       │
│            timeInClip: { start: 0, end: 5 },                   │
│            videoAsset: {                                        │
│              fileId: "file_abc123",                            │
│              timeRange: { start: 5, end: 10 }                  │
│            }                                                     │
│          }                                                       │
│        ]                                                         │
│      }                                                           │
│    }                                                             │
└─────────────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. TOOL EXECUTION                                               │
│    executeToolCall() → composeVideo() → MediaBunny operations   │
│    - Extract segments from IndexedDB files                      │
│    - Process each with overlays                                 │
│    - Concatenate all segments                                   │
│    - Save final video to IndexedDB                              │
└─────────────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. RESULT                                                       │
│    ToolExecutionResult                                          │
│    {                                                             │
│      success: true,                                             │
│      message: "Video composed successfully",                    │
│      data: {                                                     │
│        fileId: "generated_1728123456",                         │
│        fileName: "tiktok.mp4",                                 │
│        size: 5242880,                                          │
│        duration: 30                                             │
│      }                                                           │
│    }                                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Reference: Integration Checklist

### ✅ Already Done

- [x] agent-tools.ts created with all tools
- [x] agent-chat.ts updated with tool support
- [x] route.ts updated with tool call handling
- [x] Type definitions for all tool interfaces
- [x] Progress tracking callbacks
- [x] Error handling

### ⚠️ Needs To Be Done

- [ ] Verify MediaBunny API matches our implementation
- [ ] Update page.tsx with tool execution logic
- [ ] Add progress UI components
- [ ] Add file ID mapping between agent and IndexedDB
- [ ] Add video preview and download UI
- [ ] Test end-to-end with real videos

---

## 💡 Key Integration Points

### 1. File ID Mapping

```typescript
// In agent-chat.ts, add to context:
context += `[File ID: ${file.id}]`; // So agent knows actual IDs

// Or in page.tsx, before execution:
const mappedArgs = mapFileReferences(toolArgs, uploadedFiles);
```

### 2. Progress Tracking

```typescript
// In page.tsx:
<ProgressBar stage={toolProgress.stage} progress={toolProgress.progress} />
```

### 3. Result Display

```typescript
// In page.tsx, after tool execution:
{
  toolResult.success && <VideoPlayer fileId={toolResult.data.fileId} />;
}
```

---

This visual diagram should help you understand how all the pieces fit together! 🎬
