# Agent Prompt & Architecture Improvements

## Overview

This document describes the improvements made to the Movie Maker AI Agent to provide more detailed, granular video editing timelines.

## Latest Updates (3 Key Improvements)

### 🔑 1. File Reference Table

Every AI response now includes a **FILE REFERENCE TABLE** at the top that maps file numbers to actual filenames:

```
📋 FILE REFERENCE TABLE
- File 1: 2025-10-05_14-54-46.mp4 (video)
- File 2: background-music.mp3 (audio)
- File 3: logo.png (image)
```

This makes it crystal clear which file is which, and the AI includes the filename in every timeline entry.

### 🖼️ 2. Picture Overlay Column

Added a new **Picture Overlay** column to the timeline table (before Text Overlay). This allows you to:

- Add logos to your clips (e.g., "File 3 (logo.png) (0:00-0:30 bottom-right)")
- Overlay screenshots or graphics at specific times
- Show images full-screen or in specific positions
- Specify duration and position for each picture overlay

### 📝 3. Enhanced Context with Full Details

The AI now receives **much more detailed context** about your files:

- **3000 characters** of transcript/content (up from 1000) - 3x more context!
- **30 transcript segments** with timestamps (up from 20)
- Full visual descriptions and detailed analysis for images
- This helps the AI understand visual cues, dialogue, and what's actually in each clip

**Result:** The AI can make much more informed suggestions about which clips to use and when.

## What Changed

### 1. **Refactored Architecture**

- **Created `agent-chat.ts`**: Moved all agent logic from `page.tsx` into a dedicated module at `src/app/moviemaker-agent/lib/agent-chat.ts`
- **Better separation of concerns**: UI logic stays in page.tsx, AI/prompt logic lives in agent-chat.ts
- **More maintainable**: Easier to update prompts and agent behavior without touching UI code

### 2. **Enhanced Prompt Structure**

The AI agent now generates much more detailed video editing timelines with the following table format:

| Column              | Description                       | Example                                                                    |
| ------------------- | --------------------------------- | -------------------------------------------------------------------------- |
| **Time in Clip**    | Timestamp in final short clip     | 0:00-0:05                                                                  |
| **Action**          | What happens in this moment       | Opening hook with question                                                 |
| **Video Asset**     | Source file and exact timestamps  | File 1 (demo.mp4) [0:05 → 0:10]                                            |
| **Audio Asset**     | Audio source and timestamps       | File 1 (demo.mp4) [0:05 → 0:10] (same) or File 3 (audio.mp3) [0:12 → 0:20] |
| **Picture Overlay** | Image/graphic to overlay on video | File 5 (logo.png) (0:00-0:30 bottom-right)                                 |
| **Text Overlay**    | Text to display with duration     | "Meet the future of chat" (0:02-0:05 center)                               |
| **Why It Works**    | Creative rationale                | Grabs attention immediately                                                |

**Key Improvements:**

- ✅ **File Reference Table**: Every response includes a reference table mapping File 1, File 2, etc. to actual filenames
- ✅ **Picture Overlay Column**: New column for adding image overlays (logos, graphics, screenshots)
- ✅ **Detailed Context**: The AI receives up to 3000 characters of raw transcript/content per file (increased from 1000)
- ✅ **More Transcript Segments**: Shows 30 segments with timestamps (increased from 20)
- ✅ **Visual Cue Awareness**: With full content access, the AI better understands what's in each video

### 3. **Two-Option Output Format**

The agent now provides **TWO sets of suggestions** for every request:

#### **Option A: Using Only Current Assets**

- Creates 2-3 clip concepts using ONLY the files already uploaded
- Each concept has a complete timeline table
- Specific about which file and exact timestamps to use
- Ready to execute immediately

#### **Option B: Enhanced Version with Additional Assets**

- Shows what additional clips/assets would make the video even better
- Suggests specific things to record or add (e.g., "Add a close-up of X", "Record voiceover saying Y")
- Shows how these would integrate into the timeline
- Marked with "⚠️ NEEDS NEW ASSET" in the Video Asset column

### 4. **Improved Context Building**

The `buildContextFromFiles` function now includes:

**File Reference Table** (NEW!)

```
📋 FILE REFERENCE TABLE

- File 1: demo.mp4 (video)
- File 2: background-music.mp3 (audio)
- File 3: intro-clip.mp4 (video)
- File 4: logo.png (image)
- File 5: screenshot.jpg (image)
```

**Detailed File Contents** with:

- File number + filename for easy reference
- Type and MIME type
- Duration in both seconds and minutes:seconds format
- Summary
- **Full content/transcript** (up to 3000 characters, increased from 1000)
- **30 transcript segments** with timestamps (increased from 20)
- Image descriptions for visual assets
- Visual descriptions with detailed analysis

Example context:

```
📋 **FILE REFERENCE TABLE**

Use these exact file references in your timeline tables:

- **File 1**: 2025-10-05_14-54-46.mp4 (video)
- **File 2**: intro-voiceover.mp3 (audio)
- **File 3**: company-logo.png (image)

---

📁 **DETAILED FILE CONTENTS**

**File 1: 2025-10-05_14-54-46.mp4**
Type: video
MIME Type: video/mp4
Duration: 240s (4m 0s)

Summary: Demo of browser-only chat app

📝 **Full Content/Transcript:**
Welcome to this comprehensive demo of our browser-only chat application.
In this video, I'll show you how we've built a full-featured chat app that
runs entirely in the client's browser with no server required...
[full transcript up to 3000 chars]

🎬 **Transcript Segments with Timestamps:** (Total: 85)
  [0s-5s]: Welcome to this demo
  [5s-12s]: First step is to make it completely client-side
  [12s-20s]: We support multiple chat threads
  [20s-28s]: Each thread can have its own assets
  ... [30 total segments shown]
  ... and 55 more segments (total duration: 240s)

================================================================================
```

This richer context helps the AI:

- 🎯 Reference files correctly with both number and name
- 🎬 Understand what visual content exists in each clip
- 📝 Quote actual dialogue accurately
- ⏱️ Suggest precise timestamps based on content

**What Context Data Is Sent?**

For each file, the AI receives:

1. ✅ **Summary** - Short AI-generated summary of the file
2. ✅ **Raw Text/Transcript** - Up to 3000 characters of the actual content
3. ✅ **Transcript Segments** - Up to 30 segments with precise timestamps
4. ✅ **Image Descriptions** - Full visual analysis for images

This gives the AI both high-level understanding (summary) AND detailed content (raw text + segments) to make informed suggestions.

### 5. **Enhanced Clip Suggestions**

Each clip concept now includes:

- **Suggested Title**: Platform-optimized catchy title
- **Suggested Description**: With relevant hashtags
- **Target Platform**: TikTok, Instagram Reels, YouTube Shorts, etc.
- **Target Length**: Exact duration (e.g., 30s, 60s)

## Example Output

When you ask for clip suggestions, you'll get:

```markdown
### 🎬 Option A: Using Only Current Assets

#### Clip 1: "Quick-Start: Build a Browser-Only Chat App"

**Target Platform:** Instagram Reels
**Target Length:** 30 seconds

| Time in Clip | Action            | Video Asset                     | Audio Asset                 | Text Overlay                           | Why It Works                             |
| ------------ | ----------------- | ------------------------------- | --------------------------- | -------------------------------------- | ---------------------------------------- |
| 0:00-0:05    | Opening hook      | File 3 (chat.mp4) [0:00 → 0:05] | File 3 [0:00 → 0:05] (same) | "Meet the future of chat" (0:00-0:05)  | Grabs attention with intriguing question |
| 0:05-0:15    | Show architecture | File 1 (demo.mp4) [0:05 → 0:15] | File 1 [0:05 → 0:15] (same) | None                                   | Demonstrates core concept clearly        |
| 0:15-0:25    | Feature highlight | File 1 (demo.mp4) [0:45 → 0:55] | File 1 [0:45 → 0:55] (same) | "No server needed!" (0:15-0:20)        | Shows unique value proposition           |
| 0:25-0:30    | Call to action    | File 5 (outro.jpg) [static]     | File 1 [1:20 → 1:25]        | "Try it now - link in bio" (0:25-0:30) | Clear next step for viewer               |

**Suggested Title:** "Build a Browser-Only Chat App in 30s"
**Suggested Description:** "See how to create a full-stack chat app that runs entirely in the browser. From client-side UI to image indexing—no server needed! #webdev #chatapp"

---

### 🎬 Option B: Enhanced Version with Additional Assets

#### Clip 1 Enhanced: "Quick-Start: Build a Browser-Only Chat App"

**Target Platform:** TikTok
**Target Length:** 30 seconds
**Additional Assets Needed:**

- Close-up screen recording of typing code (5-10s)
- Voiceover explaining "Why browser-only matters"
- B-roll of developer at computer

| Time in Clip | Action            | Video Asset                       | Audio Asset                                             | Text Overlay                    | Why It Works                           |
| ------------ | ----------------- | --------------------------------- | ------------------------------------------------------- | ------------------------------- | -------------------------------------- |
| 0:00-0:05    | Opening hook      | ⚠️ NEEDS: Close-up of typing code | Custom voiceover: "What if chat apps needed no server?" | "Browser-Only Chat" (0:00-0:05) | More dynamic, shows building in action |
| 0:05-0:15    | Show architecture | File 1 (demo.mp4) [0:05 → 0:15]   | File 1 [0:05 → 0:15] (same)                             | None                            | Demonstrates core concept              |
| ...          | ...               | ...                               | ...                                                     | ...                             | ...                                    |
```

## Benefits

1. **Clear File References**: File reference table shows exactly which file is which (e.g., File 1 = demo.mp4)
2. **Picture Overlay Support**: New column for adding logos, graphics, screenshots on top of video
3. **Better Context Awareness**: AI receives 3x more transcript content (3000 chars vs 1000) and 30 segments (vs 20)
4. **More Precise Editing**: Know exactly which seconds of which file to use with actual filenames
5. **Audio Flexibility**: Can mix audio from different sources
6. **Visual Layer Planning**: Know what picture overlays and text to add and when
7. **Two Options**: Quick version with current assets + enhanced version with suggestions for additional footage
8. **Better Organization**: Code is cleaner and easier to maintain

## Usage Tips

### For Best Results:

1. **Upload all your assets first** - videos, audio, images, documents
2. **Wait for transcription to complete** - the agent needs the transcript segments with timestamps
3. **Be specific in your request**:

   - ✅ "Suggest 3 short clips under 30 seconds for Instagram Reels highlighting the key features"
   - ✅ "Create a 60-second TikTok from my demo video focusing on the setup process"
   - ❌ "Make something cool" (too vague)

4. **Review both options**:

   - Option A is ready to execute immediately
   - Option B shows what you could add to make it even better

5. **Provide feedback**: Tell the agent which option you prefer or ask for variations

## Technical Details

### Functions in `agent-chat.ts`:

- **`searchRelevantFiles(query, uploadedFiles)`**: Finds files relevant to the user's query using keyword matching
- **`buildContextFromFiles(relevantFiles)`**: Creates detailed context including transcript segments with timestamps
- **`buildSystemPrompt()`**: Generates the AI agent's system prompt with the new table format instructions
- **`buildFullPrompt(userQuery, filesContext, messages)`**: Combines everything into the final prompt sent to the API
- **`callGroqAPI(prompt)`**: Makes the API call to Groq
- **`streamResponse(stream)`**: Handles streaming responses from the API

### Message Interface:

```typescript
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}
```

## Future Enhancements

Potential improvements to consider:

1. **Export to timeline JSON**: Convert the table to a machine-readable format for automated editing
2. **Visual timeline preview**: Show the timeline graphically
3. **Drag-and-drop timeline editor**: Let users adjust the suggested timeline
4. **Template library**: Save successful timelines as templates
5. **Automated video assembly**: Use FFmpeg to automatically create the clip from the timeline
6. **A/B testing suggestions**: Generate multiple variations for testing

## Files Modified

1. ✅ **Created**: `src/app/moviemaker-agent/lib/agent-chat.ts` - New agent logic module
2. ✅ **Updated**: `src/app/moviemaker-agent/page.tsx` - Refactored to use new agent module
3. ✅ **Updated**: Welcome message to explain new capabilities

## Testing

To test the new format:

1. Upload at least 2-3 video/audio files
2. Wait for transcription to complete
3. Ask: "Analyze my content and suggest 2-3 attractive video clip options for Instagram Reels"
4. You should receive detailed timeline tables with both Option A and Option B

---

**Questions or Issues?** Check the console logs for detailed information about file processing and API calls.
