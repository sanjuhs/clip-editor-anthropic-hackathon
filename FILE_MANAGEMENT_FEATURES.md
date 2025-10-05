# File Management Features ✨

## Overview

Enhanced the file table with powerful editing and re-transcription capabilities. You can now view detailed summaries, edit content, and re-transcribe files with language hints.

## New Features

### 1. View & Edit Details 👁️

Click the **Eye icon** on any file to open a detailed view dialog.

#### What You Can See:

- **File Metadata**

  - Type (Audio/Video/Image/Document)
  - Size in MB
  - Duration (for audio/video)
  - Language detected
  - Number of segments and words

- **Editable Summary Tab**

  - Short description of the file
  - Can be manually edited
  - Saves to IndexedDB

- **Editable Raw Content Tab**
  - Full transcript or detailed content
  - Can be manually edited
  - Shows character count
  - Perfect for correcting transcription errors

#### How to Use:

1. Click the 👁️ **Eye icon** in the Actions column
2. Switch between **Summary** and **Raw Content** tabs
3. Edit the text directly in the text areas
4. Click **Save Changes** to persist
5. Changes are immediately saved to IndexedDB

### 2. Re-transcribe Audio 🔄

Click the **Refresh icon** on audio/video files to re-transcribe with different settings.

#### Options:

- **Language Selection**

  - Auto-detect (default)
  - English, Spanish, French, German, Italian, Portuguese
  - Russian, Japanese, Korean, Chinese, Arabic
  - Indian languages: Hindi, Kannada, Tamil, Telugu, Malayalam, Bengali, Marathi, Gujarati
  - And more!

- **Context Prompt**
  - Add context about the audio
  - Helps with domain-specific terminology
  - Max 224 characters
  - Example: "This is a medical consultation about diabetes treatment"

#### When to Re-transcribe:

- ❌ Wrong language detected
- ❌ Poor quality transcription
- ❌ Need better accuracy for specific language
- ❌ Want to add context for technical terms

#### How to Use:

1. Click the 🔄 **Refresh icon** in the Actions column
2. Select the correct language (or leave as Auto-detect)
3. Optionally add a context prompt
4. Click **Re-transcribe**
5. Watch real-time progress in chat
6. New transcript replaces the old one

### 3. Enhanced File Table

#### New Columns:

- **Actions** - View, Re-transcribe, Delete buttons with tooltips
- All existing columns remain (Name, Type, Size, Status, Summary)

#### Visual Improvements:

- Tooltips on hover for all action buttons
- Re-transcribe button only shows for audio/video files
- Better spacing and alignment
- Color-coded status indicators

## Use Cases

### Scenario 1: Wrong Language Detected

```
Problem: Uploaded a Kannada audio but transcribed as English
Solution:
1. Click 🔄 Re-transcribe
2. Select "Kannada" from language dropdown
3. Click Re-transcribe
4. Get accurate Kannada transcript
```

### Scenario 2: Editing Transcription Errors

```
Problem: Transcript has a few errors you want to fix manually
Solution:
1. Click 👁️ View Details
2. Go to "Raw Content" tab
3. Edit the text directly
4. Click Save Changes
5. Corrected transcript saved
```

### Scenario 3: Adding Context

```
Problem: Medical terms transcribed incorrectly
Solution:
1. Click 🔄 Re-transcribe
2. Add prompt: "Medical consultation discussing hypertension treatment"
3. Click Re-transcribe
4. Get better accuracy for medical terms
```

### Scenario 4: Updating Summary

```
Problem: Want to add custom notes to file summary
Solution:
1. Click 👁️ View Details
2. Go to "Summary" tab
3. Edit or add notes
4. Click Save Changes
5. Custom summary visible in table
```

## Component Architecture

### FileDetailDialog

- Shows comprehensive file metadata
- Tabbed interface (Summary / Raw Content)
- Editable text areas
- Real-time character count
- Save/Cancel buttons

### RetranscribeDialog

- Language selection dropdown (20+ languages)
- Context prompt input
- Warning about overwriting existing data
- Integration with transcription API

### Enhanced FileTable

- State management for dialog visibility
- Three action buttons per file
- Tooltip integration
- Conditional rendering (re-transcribe only for audio/video)

## API Integration

### Update File

```typescript
onUpdateFile(fileId: string, updates: Partial<UploadedFile>)
```

- Updates both state and IndexedDB
- Shows confirmation message in chat

### Re-transcribe

```typescript
onRetranscribe(fileId: string, language?: string, prompt?: string)
```

- Marks file as "pending"
- Calls Groq Whisper API with new parameters
- Updates with new transcript
- Shows progress and results in chat

## Persistence

All changes are saved to **IndexedDB**:

- ✅ Manual edits to summary
- ✅ Manual edits to raw content
- ✅ New transcriptions
- ✅ File metadata

Data survives:

- ✅ Page refreshes
- ✅ Browser restarts
- ✅ Tab closes

## Keyboard Shortcuts

In dialogs:

- `Esc` - Close dialog
- `Tab` - Navigate fields
- `Ctrl/Cmd + S` - Save (when implemented)

## Tips & Best Practices

### For Better Transcription:

1. **Specify language** if you know it
2. **Add context** for technical/medical content
3. **Use proper names** in prompt if mentioned
4. **Check quality** metrics after transcription

### For Editing:

1. **View details** before editing
2. **Keep summary concise** (1-2 sentences)
3. **Edit raw content** for corrections
4. **Save frequently** to avoid losing changes

### For Language Detection:

- Auto-detect works for most cases
- Specify language for:
  - Regional accents
  - Mixed language content
  - Technical jargon
  - Proper nouns

## Supported Languages (20+)

**European:**

- English, Spanish, French, German, Italian, Portuguese, Russian

**Asian:**

- Japanese, Korean, Chinese, Arabic

**Indian:**

- Hindi, Kannada, Tamil, Telugu, Malayalam, Bengali, Marathi, Gujarati

**And many more** supported by Groq Whisper!

## Future Enhancements

Potential additions:

- [ ] Bulk re-transcription
- [ ] Export to different formats
- [ ] Version history for edits
- [ ] Collaborative editing
- [ ] AI-powered summary generation
- [ ] Quality score indicators
- [ ] Segment-level editing

## Try It Now!

Go to http://localhost:3000/moviemaker-agent

1. Upload an audio file
2. Wait for transcription
3. Click **Files** in sidebar
4. Try the new features!

---

**Built with:** React, TypeScript, shadcn/ui, IndexedDB, Groq Whisper API
