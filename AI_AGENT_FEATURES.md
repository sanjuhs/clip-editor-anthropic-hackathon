# AI Agent Features Documentation

## Overview

The Movie Maker AI Agent is a retrieval-augmented generation (RAG) system that helps users transform long-form content into engaging short clips. It combines file indexing, keyword search, and AI chat capabilities.

## Key Features

### 1. **Retrieval-Augmented Generation (RAG)**

The agent uses a keyword-based retrieval system to search through your uploaded files:

- **Keyword Extraction**: Extracts meaningful keywords (>3 characters) from user queries
- **Relevance Scoring**: Scores files based on keyword frequency in their content
- **Top-K Retrieval**: Returns the top 5 most relevant files
- **Context Building**: Includes file metadata, summaries, and content previews

### 2. **Multi-Modal Content Processing**

Supports various file types:

- **Video**: Transcription + visual keyframe analysis
- **Audio**: Transcription with word-level timestamps
- **Documents**: Text extraction and analysis
- **Images**: Visual description and detailed analysis

### 3. **Intelligent Chat Interface**

- **Contextual Responses**: Uses conversation history (last 5 messages)
- **File-Aware**: References specific files and their content
- **Streaming Responses**: Real-time response generation
- **Error Handling**: Graceful error messages with helpful suggestions

### 4. **Video Clip Planning**

The AI agent can:

- Analyze video transcripts and identify key moments
- Suggest 2-3 attractive video clip options with exact timestamps
- Explain why each clip would work well for social media
- Provide clip titles and descriptions
- Wait for user approval before proceeding

## How It Works

### Search & Retrieval Flow

```
User Query
    ↓
Keyword Extraction (words > 3 chars)
    ↓
Search Through Indexed Files
    ↓
Score Files by Keyword Frequency
    ↓
Select Top 5 Relevant Files
    ↓
Build Context with File Content
    ↓
Send to AI Model with Conversation History
    ↓
Stream Response to User
```

### Context Building

For each relevant file, the agent includes:

1. **File Metadata**: Name, type, duration
2. **Summary**: Brief overview of content
3. **Content Preview**: First 1000 characters of text
4. **Transcript Info**: Number of segments (for audio/video)

### AI Model Configuration

- **Model**: Llama 3.1 70B Versatile (via Groq)
- **Temperature**: 0.7 (balanced creativity)
- **Max Tokens**: 8192
- **Streaming**: Enabled for real-time responses

## Usage Examples

### Example 1: Ask About Content

```
User: "What are the key topics discussed in my files?"

Agent will:
1. Search all indexed files
2. Extract key topics from transcripts/documents
3. Provide a summary with references to specific files
```

### Example 2: Request Video Clips

```
User: "Suggest 2-3 attractive video clip options with timestamps"

Agent will:
1. Find relevant video files
2. Analyze transcript segments
3. Suggest specific clips with:
   - Start/end timestamps
   - Clip description
   - Why it would work for social media
   - Suggested title
```

### Example 3: Query Specific Content

```
User: "Tell me about the part where they discuss AI"

Agent will:
1. Search for "AI" keyword in all files
2. Find matching segments in transcripts
3. Provide detailed answer with file references
```

## System Prompt

The agent is guided by a comprehensive system prompt that defines its role as:

- Expert video content analyzer
- Social media clip optimizer
- Content strategy advisor
- File-aware assistant

It's instructed to:

- Always reference specific files and timestamps
- Suggest 2-3 clip options when asked
- Wait for user approval before "generating"
- Be helpful and specific in responses

## API Endpoint

**Route**: `/api/groq`

**Method**: `POST`

**Request Body**:

```json
{
  "prompt": "Full prompt including system message, file context, and user query"
}
```

**Response**: Streaming text (SSE-style)

## Future Enhancements

Potential improvements:

1. **Vector Embeddings**: Use semantic search instead of keyword matching
2. **Multi-Turn Memory**: Persist conversation across sessions
3. **Video Generation**: Actually generate clips based on AI suggestions
4. **Advanced Filters**: Filter by file type, date, duration, etc.
5. **Highlight Detection**: AI-powered highlight detection in videos
6. **Custom Prompts**: Allow users to customize the AI's behavior

## Environment Variables

Required:

```env
GROQ_API_KEY=your_groq_api_key_here
```

## Technical Stack

- **Frontend**: Next.js 15, React, TypeScript
- **AI Model**: Groq (Llama 3.1 70B)
- **Storage**: IndexedDB (client-side)
- **Transcription**: Groq Whisper Large V3 Turbo
- **Vision**: Groq Llama Vision API
- **Streaming**: Edge Runtime with ReadableStream

## Performance Considerations

- **Context Window**: Limited to top 5 files to stay within token limits
- **Preview Length**: Content previews capped at 1000 characters
- **Conversation History**: Limited to last 5 messages
- **Streaming**: Reduces perceived latency for long responses

## Error Handling

The agent handles various error scenarios:

- Missing API keys
- API failures
- Empty responses
- Network issues
- Invalid file content

All errors are displayed to the user with actionable messages.
