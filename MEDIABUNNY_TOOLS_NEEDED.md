# MediaBunny Tools Required for AI Agent Video Editing

## Executive Summary

To enable the AI agent to create short-form videos from uploaded content, we need **6 core MediaBunny/FFmpeg operations**. These tools will work with files stored in IndexedDB (max 500MB) to cut, stitch, and overlay content client-side.

---

## Tool Requirements Breakdown

### 🎯 Use Case

Given a timeline plan like this:

| Time in Clip | Video Asset        | Audio Asset        | Picture Overlay                   | Text Overlay               |
| ------------ | ------------------ | ------------------ | --------------------------------- | -------------------------- |
| 0:00-0:05    | File 1 [0:00→0:05] | File 1 [0:00→0:05] | File 5 (logo) 0:00-0:05 top-right | "Build a client-side app!" |
| 0:05-0:10    | File 1 [0:35→0:40] | File 4 [0:04→0:09] | None                              | None                       |

We need to:

1. Extract specific time segments from videos
2. Stitch segments together
3. Replace/overlay audio tracks
4. Add image overlays at specific positions
5. Add text overlays with styling
6. Create black screens for gaps

---

## Required MediaBunny Operations

### 1. **trim()** - Extract Time Segments

**Purpose:** Cut a specific time range from a video or audio file

**Parameters:**

```typescript
{
  file: Blob,           // Input video/audio blob
  startTime: number,    // Start time in seconds
  endTime: number,      // End time in seconds
  outputFileName: string,
  onProgress?: (progress: number) => void
}
```

**FFmpeg Equivalent:**

```bash
ffmpeg -i input.mp4 -ss 00:00:05 -to 00:00:10 -c copy output.mp4
```

**Example Use:**

```typescript
// Extract 5-10 second segment from video
const segment = await mb.trim({
  file: videoBlob,
  startTime: 5,
  endTime: 10,
  outputFileName: "segment_1.mp4",
});
```

**Why Needed:** Extract specific moments from long-form content based on transcript timestamps

---

### 2. **concat()** - Stitch Segments Together

**Purpose:** Join multiple video segments into one continuous video

**Parameters:**

```typescript
{
  files: Blob[],        // Array of video blobs to concatenate
  outputFileName: string,
  onProgress?: (progress: number) => void
}
```

**FFmpeg Equivalent:**

```bash
ffmpeg -f concat -safe 0 -i filelist.txt -c copy output.mp4
```

**Example Use:**

```typescript
// Stitch 3 segments together
const finalVideo = await mb.concat({
  files: [segment1, segment2, segment3],
  outputFileName: "final_video.mp4",
});
```

**Why Needed:** Combine multiple extracted segments into the final short clip

---

### 3. **replaceAudio()** - Add/Replace Audio Track

**Purpose:** Replace or overlay audio on a video, potentially from a different source

**Parameters:**

```typescript
{
  videoFile: Blob,      // Video blob
  audioFile: Blob,      // Audio blob (can be from different file)
  outputFileName: string,
  volume?: number,      // 0.0 to 1.0
  onProgress?: (progress: number) => void
}
```

**FFmpeg Equivalent:**

```bash
ffmpeg -i video.mp4 -i audio.mp3 -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest output.mp4
```

**Example Use:**

```typescript
// Use audio from one file on video from another
const videoWithAudio = await mb.replaceAudio({
  videoFile: videoSegment,
  audioFile: audioSegment,
  volume: 1.0,
  outputFileName: "video_with_new_audio.mp4",
});
```

**Why Needed:** Mix audio tracks - e.g., use narration from one clip on visuals from another

---

### 4. **overlay()** - Add Image Overlay

**Purpose:** Place an image (logo, screenshot, graphic) on top of video at specific position and time

**Parameters:**

```typescript
{
  mainFile: Blob,       // Main video
  overlayFile: Blob,    // Image to overlay (PNG, JPG)
  position: string,     // "top-left", "top-right", "bottom-right", etc.
  startTime: number,    // When to start showing overlay
  endTime: number,      // When to stop showing overlay
  scale: number,        // 0.0 to 1.0 (0.2 = 20% of video size)
  outputFileName: string,
  onProgress?: (progress: number) => void
}
```

**FFmpeg Equivalent:**

```bash
# Logo in top-right corner, scaled to 20%
ffmpeg -i video.mp4 -i logo.png \
  -filter_complex "[1:v]scale=iw*0.2:ih*0.2[logo];[0:v][logo]overlay=W-w-10:10:enable='between(t,0,5)'" \
  output.mp4
```

**Position Calculations:**

- `top-left`: `x=10, y=10`
- `top-right`: `x=W-w-10, y=10`
- `bottom-left`: `x=10, y=H-h-10`
- `bottom-right`: `x=W-w-10, y=H-h-10`
- `center`: `x=(W-w)/2, y=(H-h)/2`
- `full-screen`: `x=0, y=0, scale=1.0`

**Example Use:**

```typescript
// Add logo to top-right for first 5 seconds
const videoWithLogo = await mb.overlay({
  mainFile: videoBlob,
  overlayFile: logoBlob,
  position: "top-right",
  startTime: 0,
  endTime: 5,
  scale: 0.2,
  outputFileName: "video_with_logo.mp4",
});
```

**Why Needed:** Add branding (logos), screenshots, graphics to highlight features

---

### 5. **addText()** - Add Text Overlay

**Purpose:** Display text on video with styling (captions, titles, call-to-actions)

**Parameters:**

```typescript
{
  file: Blob,           // Video to add text to
  text: string,         // Text content
  position: string,     // Position on screen
  startTime: number,    // When to show text
  endTime: number,      // When to hide text
  fontSize: number,     // Font size in pixels
  fontColor: string,    // Color (e.g., "white", "#FFFFFF")
  backgroundColor: string, // Background color with alpha (e.g., "black@0.5")
  outputFileName: string,
  onProgress?: (progress: number) => void
}
```

**FFmpeg Equivalent:**

```bash
# White text with semi-transparent black background
ffmpeg -i input.mp4 \
  -vf "drawtext=text='Hello World':x=(w-text_w)/2:y=(h-text_h)/2:fontsize=48:fontcolor=white:box=1:boxcolor=black@0.5:boxborderw=10:enable='between(t,0,5)'" \
  output.mp4
```

**Position Calculations:**

- `center`: `x=(w-text_w)/2, y=(h-text_h)/2`
- `top-center`: `x=(w-text_w)/2, y=50`
- `bottom-center`: `x=(w-text_w)/2, y=h-100`
- `top-left`: `x=50, y=50`
- `bottom-right`: `x=w-text_w-50, y=h-100`

**Example Use:**

```typescript
// Add centered text for 3 seconds
const videoWithText = await mb.addText({
  file: videoBlob,
  text: "Build a client-side app!",
  position: "center",
  startTime: 0,
  endTime: 3,
  fontSize: 48,
  fontColor: "white",
  backgroundColor: "black@0.5",
  outputFileName: "video_with_text.mp4",
});
```

**Why Needed:** Add titles, captions, call-to-actions, key messages

---

### 6. **createBlankVideo()** - Generate Solid Color Video

**Purpose:** Create a blank video segment (black screen, colored background) for transitions or when no video asset is specified

**Parameters:**

```typescript
{
  duration: number,     // Duration in seconds
  width: number,        // Width in pixels (e.g., 1080)
  height: number,       // Height in pixels (e.g., 1920 for vertical)
  color: string,        // Color name or hex (e.g., "black", "#000000")
  outputFileName: string
}
```

**FFmpeg Equivalent:**

```bash
# Create 5-second black video at 1080x1920 (vertical)
ffmpeg -f lavfi -i color=c=black:s=1080x1920:d=5:r=30 -c:v libx264 -pix_fmt yuv420p output.mp4
```

**Example Use:**

```typescript
// Create 5-second black screen
const blackScreen = await mb.createBlankVideo({
  duration: 5,
  width: 1080,
  height: 1920,
  color: "black",
  outputFileName: "black_screen.mp4",
});
```

**Why Needed:** Fill gaps when no video asset is available, create transitions

---

## Complete Workflow Example

### Scenario: Create 15-second TikTok from 4-minute demo video

**Input:**

- File 1: `demo.mp4` (4 minutes, product demo)
- File 2: `music.mp3` (background music)
- File 3: `logo.png` (company logo)

**Timeline Plan:**

```
0:00-0:05: Opening hook (demo at 0:05-0:10) + logo + text "Watch this!"
0:05-0:10: Feature demo (demo at 2:30-2:35) + logo
0:10-0:15: CTA (black screen) + logo + text "Try it now!"
```

**Tool Execution Sequence:**

```typescript
// 1. Extract opening hook segment
const segment1 = await mb.trim({
  file: demoBlob,
  startTime: 5,
  endTime: 10,
  outputFileName: "seg1.mp4",
});

// 2. Add text to segment 1
const seg1WithText = await mb.addText({
  file: segment1,
  text: "Watch this!",
  position: "center",
  startTime: 0,
  endTime: 5,
  fontSize: 48,
  fontColor: "white",
  backgroundColor: "black@0.5",
  outputFileName: "seg1_text.mp4",
});

// 3. Add logo to segment 1
const seg1Complete = await mb.overlay({
  mainFile: seg1WithText,
  overlayFile: logoBlob,
  position: "top-right",
  startTime: 0,
  endTime: 5,
  scale: 0.15,
  outputFileName: "seg1_complete.mp4",
});

// 4. Extract feature demo segment
const segment2 = await mb.trim({
  file: demoBlob,
  startTime: 150, // 2:30
  endTime: 155, // 2:35
  outputFileName: "seg2.mp4",
});

// 5. Add logo to segment 2
const seg2Complete = await mb.overlay({
  mainFile: segment2,
  overlayFile: logoBlob,
  position: "top-right",
  startTime: 0,
  endTime: 5,
  scale: 0.15,
  outputFileName: "seg2_complete.mp4",
});

// 6. Create black screen for CTA
const blackScreen = await mb.createBlankVideo({
  duration: 5,
  width: 1080,
  height: 1920,
  color: "black",
  outputFileName: "black.mp4",
});

// 7. Add text to black screen
const seg3WithText = await mb.addText({
  file: blackScreen,
  text: "Try it now!",
  position: "center",
  startTime: 0,
  endTime: 5,
  fontSize: 64,
  fontColor: "white",
  backgroundColor: "transparent",
  outputFileName: "seg3_text.mp4",
});

// 8. Add logo to segment 3
const seg3Complete = await mb.overlay({
  mainFile: seg3WithText,
  overlayFile: logoBlob,
  position: "top-right",
  startTime: 0,
  endTime: 5,
  scale: 0.15,
  outputFileName: "seg3_complete.mp4",
});

// 9. Concatenate all segments
const finalVideo = await mb.concat({
  files: [seg1Complete, seg2Complete, seg3Complete],
  outputFileName: "tiktok_demo.mp4",
});

// 10. Add background music
const finalWithMusic = await mb.replaceAudio({
  videoFile: finalVideo,
  audioFile: musicBlob,
  volume: 0.7,
  outputFileName: "tiktok_demo_final.mp4",
});
```

**Result:** `tiktok_demo_final.mp4` (15 seconds, vertical, with music, text, and logo)

---

## Performance Considerations

### Memory Management

- Files in IndexedDB: max 500MB
- Working memory during composition: ~2-3x input size
- Recommendation: Limit to 3-5 segments per composition
- Clean up intermediate blobs after each step

### Processing Time Estimates

| Operation                     | Time (approximate)      |
| ----------------------------- | ----------------------- |
| trim()                        | 1-3 seconds             |
| concat()                      | 2-5 seconds per segment |
| replaceAudio()                | 2-4 seconds             |
| overlay()                     | 3-5 seconds             |
| addText()                     | 3-5 seconds             |
| createBlankVideo()            | 1-2 seconds             |
| **Total for 3-segment video** | **30-60 seconds**       |

### Optimization Tips

1. **Process segments in parallel where possible** (if MediaBunny supports it)
2. **Cache intermediate results** during composition
3. **Use lower resolutions** for preview (720p instead of 1080p)
4. **Minimize quality loss** by using `-c copy` when possible
5. **Show progress UI** to keep user informed

---

## MediaBunny Integration Checklist

### ✅ What We've Built

- [x] `agent-tools.ts` - Tool definitions and helper functions
- [x] `agent-chat.ts` - Updated chat logic with tool support
- [x] `route.ts` - API route with tool call support
- [x] Tool call JSON schema for AI agent
- [x] Progress tracking callbacks
- [x] Error handling and result types

### ⚠️ What Needs Verification

- [ ] **Verify MediaBunny API methods exist** (check actual library)
- [ ] **Test each operation** with real video files
- [ ] **Adjust parameters** to match actual MediaBunny API
- [ ] **Add fallbacks** if methods don't exist (use `exec()` for raw FFmpeg)

### 🔧 Potential Issues & Solutions

**Issue 1: MediaBunny doesn't have `overlay()` method**

```typescript
// Fallback: Use exec() with custom FFmpeg command
const mb = await getMediaBunny();
await mb.exec([
  "-i",
  "video.mp4",
  "-i",
  "logo.png",
  "-filter_complex",
  "[1:v]scale=iw*0.2:ih*0.2[logo];[0:v][logo]overlay=W-w-10:10",
  "output.mp4",
]);
```

**Issue 2: Text overlays need font file**

```typescript
// May need to load font file first
await mb.loadFont("Arial.ttf");
// Or use embedded font
"-vf", "drawtext=text=...:fontfile=/path/to/font.ttf";
```

**Issue 3: Concatenation requires same codec/resolution**

```typescript
// Re-encode segments to same format before concat
await mb.normalize({
  files: segments,
  targetWidth: 1080,
  targetHeight: 1920,
  targetFps: 30,
});
```

---

## Testing Checklist

### Unit Tests

- [ ] Extract single segment from video
- [ ] Concatenate 2 segments
- [ ] Replace audio track
- [ ] Add image overlay at each position
- [ ] Add text overlay at each position
- [ ] Create black video of various durations

### Integration Tests

- [ ] Complete 2-segment composition
- [ ] Complete 5-segment composition
- [ ] Composition with all overlay types
- [ ] Handle missing files gracefully
- [ ] Handle invalid time ranges
- [ ] Memory cleanup after composition

### User Flow Tests

- [ ] User uploads video → Agent analyzes → User confirms → Video created
- [ ] Multiple compositions in same session
- [ ] Error recovery when composition fails
- [ ] Preview and download final video

---

## Next Implementation Steps

### Step 1: Verify MediaBunny API (High Priority)

```bash
# Install and test MediaBunny
npm install mediabunny@latest
# Create test script
node test-mediabunny.js
```

### Step 2: Update page.tsx with Tool Execution

- Add state for tool execution progress
- Add function to execute tool calls
- Add UI to show progress
- Add video player for result

### Step 3: File ID Mapping

- Build mapping between "File 1", "File 2" and actual IndexedDB IDs
- Pass mapping to agent in context
- Update agent to use correct file IDs in tool calls

### Step 4: Test End-to-End

- Upload test videos
- Request video creation
- Verify tool execution
- Check final output

### Step 5: Polish & Optimize

- Add retry logic
- Improve error messages
- Optimize memory usage
- Add video preview before download

---

## Summary

We need **6 core MediaBunny operations** to enable AI-powered video editing:

1. ✂️ **trim** - Extract segments
2. 🔗 **concat** - Stitch together
3. 🎵 **replaceAudio** - Mix audio tracks
4. 🖼️ **overlay** - Add images
5. 📝 **addText** - Add text
6. ⬛ **createBlankVideo** - Generate solid colors

These tools are already implemented in `agent-tools.ts` with proper error handling, progress tracking, and type safety. The next step is to **verify MediaBunny's actual API** and adjust our implementation accordingly!
