import { NextRequest, NextResponse } from "next/server";
import { Groq } from "groq-sdk";
import { toFile } from "groq-sdk/uploads";

// Use Node.js runtime for file handling
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "Missing GROQ_API_KEY" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const language = formData.get("language") as string | null;
    const prompt = formData.get("prompt") as string | null;
    const responseFormat =
      (formData.get("response_format") as string) || "verbose_json";
    const temperature = parseFloat(formData.get("temperature") as string) || 0;
    const model = (formData.get("model") as string) || "whisper-large-v3-turbo";

    // Get timestamp granularities
    const timestampGranularitiesStr = formData.get(
      "timestamp_granularities"
    ) as string;
    const timestampGranularities = timestampGranularitiesStr
      ? JSON.parse(timestampGranularitiesStr)
      : ["word", "segment"];

    if (!file) {
      return NextResponse.json(
        { error: "Missing audio file" },
        { status: 400 }
      );
    }

    // Initialize Groq client
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Convert File to the format Groq SDK expects
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a file-like object that the SDK can use
    const audioFile = await toFile(buffer, file.name, { type: file.type });

    // Create transcription request parameters
    const transcriptionParams: any = {
      file: audioFile,
      model: model,
      response_format: responseFormat,
      temperature: temperature,
    };

    // Add optional parameters if provided
    if (language) {
      transcriptionParams.language = language;
    }

    if (prompt) {
      transcriptionParams.prompt = prompt;
    }

    // Only add timestamp_granularities if using verbose_json
    if (responseFormat === "verbose_json") {
      transcriptionParams.timestamp_granularities = timestampGranularities;
    }

    // Create transcription
    const transcription = await groq.audio.transcriptions.create(
      transcriptionParams
    );

    // Return the transcription with metadata
    return NextResponse.json({
      success: true,
      transcription: transcription,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        model: model,
        language: language || "auto-detected",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      {
        error: "Failed to transcribe audio",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
