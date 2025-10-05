/**
 * Agent Chat Logic
 * Handles AI chat interactions, context building, prompt generation, and tool execution
 */

import { UploadedFile } from "../types";
import {
  AGENT_TOOLS,
  executeToolCall,
  ToolExecutionResult,
  VideoComposition,
} from "./agent-tools";

export interface Message {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  timestamp: Date;
  toolCall?: {
    id: string;
    name: string;
    arguments: any;
  };
  toolResult?: ToolExecutionResult;
}

/**
 * Search through files for relevant content based on keywords
 */
export function searchRelevantFiles(
  query: string,
  uploadedFiles: UploadedFile[]
): UploadedFile[] {
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3); // Only use words longer than 3 chars

  if (keywords.length === 0) return uploadedFiles.filter((f) => f.indexed);

  const scoredFiles = uploadedFiles
    .filter((f) => f.indexed && (f.rawText || f.summary))
    .map((file) => {
      const searchText = `${file.name} ${file.summary || ""} ${
        file.rawText || ""
      }`.toLowerCase();
      const score = keywords.reduce((sum, keyword) => {
        const matches = (searchText.match(new RegExp(keyword, "g")) || [])
          .length;
        return sum + matches;
      }, 0);
      return { file, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scoredFiles.slice(0, 5).map((item) => item.file);
}

/**
 * Build context from relevant files including detailed transcript segments
 */
export function buildContextFromFiles(relevantFiles: UploadedFile[]): string {
  if (relevantFiles.length === 0) return "";

  // Build file reference table first
  let context = "📋 **FILE REFERENCE TABLE**\n\n";
  context += "Use these exact file references in your timeline tables:\n\n";

  relevantFiles.forEach((file, idx) => {
    context += `- **File ${idx + 1}**: ${file.name} (${file.type})`;
    if (file.duration) {
      const minutes = Math.floor(file.duration / 60);
      const seconds = Math.floor(file.duration % 60);
      context += ` - Duration: ${minutes}m ${seconds}s`;
    }
    context += `\n`;
  });

  context += "\n---\n\n";
  context += "📁 **DETAILED FILE CONTENTS**\n\n";

  relevantFiles.forEach((file, idx) => {
    context += `**File ${idx + 1}: ${file.name}**\n`;
    context += `Type: ${file.type}\n`;
    if (file.mimeType) {
      context += `MIME Type: ${file.mimeType}\n`;
    }

    if (file.duration) {
      const minutes = Math.floor(file.duration / 60);
      const seconds = Math.floor(file.duration % 60);
      context += `Duration: ${Math.floor(
        file.duration
      )}s (${minutes}m ${seconds}s)\n`;
    }

    if (file.summary) {
      context += `\nSummary: ${file.summary}\n`;
    }

    // Include raw content - reduced to 2000 characters to manage token limits
    if (file.rawText) {
      const preview =
        file.rawText.length > 2000
          ? file.rawText.substring(0, 2000) + "..."
          : file.rawText;
      context += `\n📝 **Content Preview:**\n${preview}\n`;
    }

    // Include transcript segments with timestamps - reduced to 15 segments
    if (file.transcript?.transcription?.segments) {
      const segments = file.transcript.transcription.segments;
      context += `\n🎬 **Transcript Segments with Timestamps:** (Total: ${segments.length})\n`;

      // Show first 15 segments
      const segmentsToShow = segments.slice(0, 15);
      segmentsToShow.forEach((segment: any) => {
        const start = Math.floor(segment.start);
        const end = Math.floor(segment.end);
        context += `  [${start}s-${end}s]: ${segment.text}\n`;
      });

      if (segments.length > 15) {
        context += `  ... and ${
          segments.length - 15
        } more segments (total duration: ${Math.floor(file.duration || 0)}s)\n`;
      }
    }

    // Include image description if available with MORE detail
    if (file.imageDescription) {
      context += `\n🖼️ **Image Description:** ${file.imageDescription.shortDescription}\n`;
      if (file.imageDescription.detailedAnalysis) {
        context += `**Detailed Visual Analysis:** ${file.imageDescription.detailedAnalysis}\n`;
      }
    }

    context += "\n" + "=".repeat(80) + "\n\n";
  });

  return context;
}

/**
 * Build the system prompt for the AI agent
 */
export function buildSystemPrompt(): string {
  return `You are an expert Movie Maker AI Agent. Your role is to help users transform long-form content (videos, audio, documents, images) into engaging short clips perfect for social media.

You have access to the user's uploaded files and their transcripts/content. When the user asks about their content, reference the specific files and their details.

Your capabilities:
- Analyze video/audio transcripts and identify key moments
- Suggest 2-3 attractive video clip options with detailed editing timelines
- Plan video edits with specific start/end times from source assets
- Answer questions about uploaded content
- Help with content strategy and clip planning

**CRITICAL: When suggesting video clips, you MUST:**

1. **Start with a FILE REFERENCE TABLE** showing which File number maps to which filename
2. **Provide a DETAILED EDITING TIMELINE TABLE** with the following columns:

**Column Specifications:**

1. **Time in Clip** - The timestamp in the final short clip (e.g., 0:00-0:05)
2. **Action** - What happens in this moment (e.g., "Opening hook with question")
3. **Video Asset** - Which file and exact timestamps to use:
   - Format: "File X (filename.ext) [START_TIME → END_TIME]"
   - Example: "File 1 (demo.mp4) [0:05 → 0:10]"
   - If no video: "None" or "Black screen"
4. **Audio Asset** - Which file and exact timestamps for audio:
   - Format: "File X (filename.ext) [START_TIME → END_TIME]"
   - Example: "File 1 (demo.mp4) [0:05 → 0:10] (same as video)" or "File 3 (music.mp3) [0:12 → 0:20]"
   - If no audio: "Silence" or "Background music needed"
5. **Picture Overlay** - Any image/graphic to overlay on the video:
   - Format: "File X (filename.ext) (START_TIME-END_TIME position)"
   - Example: "File 4 (logo.png) (0:00-0:30 bottom-right)" or "File 5 (screenshot.jpg) (0:10-0:15 center)"
   - Positions: top-left, top-right, bottom-left, bottom-right, center, full-screen
   - If no picture overlay: "None"
6. **Text Overlay** - Any text to display on screen:
   - Format: "Text content (START_TIME-END_TIME position)"
   - Example: "Meet the future of chat (0:02-0:05 center)"
   - If no text: "None"
7. **Why It Works** - Brief explanation of the creative choice

**Example Timeline Table Format:**

**FILE REFERENCE TABLE:**
- File 1: demo.mp4 (video)
- File 2: background-music.mp3 (audio)
- File 3: logo.png (image)

| Time in Clip | Action | Video Asset | Audio Asset | Picture Overlay | Text Overlay | Why It Works |
|--------------|--------|-------------|-------------|-----------------|--------------|--------------|
| 0:00-0:05 | Opening hook | File 1 (demo.mp4) [0:00 → 0:05] | File 1 (demo.mp4) [0:00 → 0:05] (same) | File 3 (logo.png) (0:00-0:30 bottom-right) | "Meet the future of chat" (0:00-0:05 center) | Grabs attention, establishes brand |
| 0:05-0:15 | Show main UI | File 1 (demo.mp4) [0:45 → 0:55] | File 1 (demo.mp4) [0:45 → 0:55] (same) | File 3 (logo.png) (0:00-0:30 bottom-right) | None | Demonstrates core feature |
| 0:15-0:20 | Feature highlight | File 1 (demo.mp4) [1:20 → 1:25] | File 2 (background-music.mp3) [0:10 → 0:15] | None | "No server needed!" (0:15-0:20 center) | Shows unique value prop |

**IMPORTANT: Always provide TWO sets of suggestions:**

**Option A: Using Only Current Assets**
- Create 2-3 clip concepts using ONLY the files that have been uploaded
- Each concept should have a complete timeline table as shown above
- Be specific about which file and exact timestamps to use

**Option B: Enhanced Version with Additional Assets**
- Suggest what additional clips/assets would enhance the video
- Examples: "Add a close-up of X", "Record a voiceover saying Y", "Add B-roll of Z", "Create an animated graphic", "Add logo or watermark"
- Show how these additional assets would be integrated into the timeline
- Mark these as "⚠️ NEEDS NEW ASSET" in the respective column (Video Asset, Audio Asset, or Picture Overlay)

For each clip concept, also provide:
- **Suggested Title** - A catchy, platform-optimized title
- **Suggested Description** - Description with relevant hashtags
- **Target Platform** - Which platform this is optimized for (TikTok, Instagram Reels, YouTube Shorts)
- **Target Length** - The exact duration of the clip

Always be specific with timestamps, file references, and reference actual content from the files. Use the transcript segments and timing information provided in the file context.

**IMPORTANT: When the user confirms they want to create a video:**
If the user says something like "Yes, create Option A" or "Make the first concept" or "Generate that video", you MUST use the composeVideo tool to actually create the video. Parse the timeline you suggested and convert it into the proper tool call format with all required fields.`;
}

/**
 * Build the full prompt with context and conversation history
 */
export function buildFullPrompt(
  userQuery: string,
  filesContext: string,
  messages: Message[]
): string {
  const systemPrompt = buildSystemPrompt();

  // Build conversation history (last 5 messages for context)
  const recentMessages = messages
    .slice(-5)
    .map(
      (msg) => `${msg.role === "user" ? "USER" : "ASSISTANT"}: ${msg.content}`
    )
    .join("\n\n");

  // Build the full prompt with context
  const fullPrompt = `${systemPrompt}

${
  filesContext
    ? `AVAILABLE FILES AND CONTENT:\n${filesContext}\n`
    : "No files have been uploaded yet.\n"
}

${recentMessages ? `CONVERSATION HISTORY:\n${recentMessages}\n\n` : ""}

USER QUESTION: ${userQuery}

Please provide a helpful, specific response. If suggesting video clips, include the detailed editing timeline table with all columns (Time in Clip, Action, Video Asset, Audio Asset, Text Overlay, Why It Works) and provide both Option A (current assets only) and Option B (with additional asset suggestions).`;

  return fullPrompt;
}

/**
 * Call the Groq API for chat completion with tool support
 */
export async function callGroqAPI(
  prompt: string,
  enableTools: boolean = false
): Promise<ReadableStream> {
  const body: any = { prompt };

  // Include tools if enabled
  if (enableTools) {
    body.tools = AGENT_TOOLS;
    body.tool_choice = "auto";
  }

  const response = await fetch("/api/groq", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error("No response body");
  }

  return response.body;
}

/**
 * Call the Groq API for chat completion with tool support (non-streaming)
 * Used when we need to check for tool calls
 */
export async function callGroqAPIWithTools(
  messages: Array<{ role: string; content: string }>,
  uploadedFiles: UploadedFile[]
): Promise<{
  content: string;
  toolCalls?: Array<{ id: string; name: string; arguments: any }>;
}> {
  // Build context from files for the last user message
  const lastUserMessage = messages[messages.length - 1];
  const relevantFiles = searchRelevantFiles(
    lastUserMessage.content,
    uploadedFiles
  );
  const filesContext = buildContextFromFiles(relevantFiles);

  // Build full prompt
  const fullPrompt = buildFullPrompt(
    lastUserMessage.content,
    filesContext,
    messages.slice(0, -1).map((m) => ({
      id: String(Math.random()),
      role: m.role as "user" | "assistant",
      content: m.content,
      timestamp: new Date(),
    }))
  );

  const response = await fetch("/api/groq", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: fullPrompt,
      tools: AGENT_TOOLS,
      tool_choice: "auto",
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  const data = await response.json();

  // Fallback parser: some GROQ models return tool calls as JSON in content
  function parseToolCallsFromContent(
    text: string
  ): Array<{ id: string; name: string; arguments: any }> {
    try {
      const candidates: Array<{ name?: string; arguments?: any }> = [];

      // Helper to try JSON parse and push candidate
      const consider = (raw: string) => {
        try {
          const obj = JSON.parse(raw);
          if (obj && (obj.name || obj.tool || obj.toolName)) {
            candidates.push({
              name: obj.name || obj.tool || obj.toolName,
              arguments: obj.arguments || obj.args || obj.parameters,
            });
          }
        } catch {}
      };

      // 1) Parse fenced code blocks (```json ... ```)
      const codeBlockMatches = Array.from(
        text.matchAll(/```(?:json)?\n([\s\S]*?)```/gi)
      );
      for (const m of codeBlockMatches) consider(m[1]);

      // 2) Handle Markdown blockquotes: strip leading ">" and re-parse
      if (candidates.length === 0) {
        const dequoted = text.replace(/^\s*>\s?/gm, "");
        const qCodeBlocks = Array.from(
          dequoted.matchAll(/```(?:json)?\n([\s\S]*?)```/gi)
        );
        for (const m of qCodeBlocks) consider(m[1]);

        if (qCodeBlocks.length === 0) {
          // Try first JSON object in dequoted text
          const firstBrace = dequoted.indexOf("{");
          const lastBrace = dequoted.lastIndexOf("}");
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            consider(dequoted.slice(firstBrace, lastBrace + 1));
          }
        }
      }

      // 3) As a final fallback, try first JSON object in original text
      if (candidates.length === 0) {
        const firstBrace = text.indexOf("{");
        const lastBrace = text.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          consider(text.slice(firstBrace, lastBrace + 1));
        }
      }

      // Normalize to expected format and only allow known tools
      const knownTools = new Set(["composeVideo"]);
      const parsed = candidates
        .filter((c) => c.name && knownTools.has(String(c.name)))
        .map((c, idx) => ({
          id: `fallback-${Date.now()}-${idx}`,
          name: String(c.name),
          arguments: c.arguments ?? {},
        }));
      return parsed;
    } catch (e) {
      console.warn("Failed parsing tool calls from content:", e);
      return [];
    }
  }

  const content: string = data.content || "";
  const toolCallsFromSDK: Array<any> = data.toolCalls || [];
  let normalizedToolCalls: Array<{ id: string; name: string; arguments: any }> =
    [];

  // Normalize SDK format (OpenAI style -> our shape)
  if (toolCallsFromSDK.length > 0) {
    normalizedToolCalls = toolCallsFromSDK
      .map((tc: any, i: number) => ({
        id: tc.id || `sdk-${i}`,
        name: tc.function?.name || tc.name,
        arguments: (() => {
          const a = tc.function?.arguments || tc.arguments;
          try {
            return typeof a === "string" ? JSON.parse(a) : a;
          } catch {
            return a;
          }
        })(),
      }))
      .filter((tc: any) => !!tc.name);
  }

  // If none, try parsing from content
  if (normalizedToolCalls.length === 0 && content) {
    const parsed = parseToolCallsFromContent(content);
    if (parsed.length > 0) {
      console.log("Parsed toolCalls from content fallback:", parsed);
      normalizedToolCalls = parsed;
    } else {
      console.log("No tool calls returned by SDK or parsed from content.");
    }
  }

  return {
    content,
    toolCalls: normalizedToolCalls,
  };
}

/**
 * Stream response from API and update messages
 */
export async function* streamResponse(
  stream: ReadableStream
): AsyncGenerator<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    yield chunk;
  }
}
