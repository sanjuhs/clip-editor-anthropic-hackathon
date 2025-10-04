# Clip Editor - AI-Powered Video Clipping

Transform long-form videos into viral short clips—entirely in your browser. Serverless, local, and powered by AI.

## 🎯 Overview

Clip Editor is an experimental video editing platform that converts 15-120 minute videos into optimized 30-50 second clips perfect for TikTok, Instagram Reels, and YouTube Shorts. Everything runs client-side—no uploads, no servers, complete privacy.

## ✨ Features

- **🎥 Multi-Format Support**: Import images, audio, and video files seamlessly
- **✂️ Intelligent Clipping**: AI-powered analysis to identify key moments and viral-worthy segments
- **⚡ 100% Local & Serverless**: All processing happens in your browser using WebAssembly
- **🤖 Movie Maker Agent**: Chat-based interface for intuitive video editing
- **🎨 Beautiful UI**: Sleek black and white design using shadcn/ui

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 🏗️ Project Structure

```
clip-editor-anthropic-hackathon/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Main landing page
│   │   ├── moviemaker-agent/
│   │   │   └── page.tsx               # AI chat interface
│   │   ├── layout.tsx                 # Root layout
│   │   └── globals.css                # Global styles
│   ├── components/
│   │   └── ui/                        # shadcn/ui components
│   ├── hooks/                         # Custom React hooks
│   └── lib/
│       └── utils.ts                   # Utility functions
└── public/                            # Static assets
```

## 🎨 Tech Stack

- **Framework**: Next.js 15.5.4 (App Router)
- **UI Library**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS 4.0
- **Icons**: Lucide React
- **Fonts**: Geist Sans & Geist Mono
- **Type Safety**: TypeScript

## 🧪 Experiments

### Movie Maker Agent

An AI-powered video editing assistant that provides a Claude-like chat interface for:

- Uploading and analyzing video content
- Identifying key moments and highlights
- Generating optimized clips for different platforms
- Adding captions and effects (coming soon)

Access it at `/moviemaker-agent`

## 🎯 Roadmap

- [ ] Video upload and indexing
- [ ] AI-powered scene detection
- [ ] Automatic clip generation
- [ ] Caption generation
- [ ] Multi-platform export
- [ ] Timeline editor
- [ ] Audio analysis and music sync
- [ ] Template library

## 🤝 Contributing

This is an experimental project. Contributions, issues, and feature requests are welcome!

## 📝 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Built with [shadcn/ui](https://ui.shadcn.com/)
- Inspired by Opus Clips
- UI/UX inspired by Claude AI

---

**Note**: This project is in active development. Features are being added continuously as part of the Anthropic Hackathon.
