import { NextRequest, NextResponse } from "next/server";
import { Groq } from "groq-sdk";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const { messages, stream: shouldStream = true } = await request.json();

  if (!process.env.GROQ_API_KEY) {
    return new Response("Missing GROQ_API_KEY", { status: 500 });
  }

  if (!messages || !Array.isArray(messages)) {
    return new Response("Missing messages array", { status: 400 });
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  // Non-streaming mode for frame captioning
  if (!shouldStream) {
    try {
      const completion = await groq.chat.completions.create({
        messages: messages,
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0.7,
        max_completion_tokens: 512,
        top_p: 1,
        stream: false,
        stop: null,
      });

      const content = completion.choices?.[0]?.message?.content || "";
      return NextResponse.json({ response: content });
    } catch (error) {
      console.error("Groq Llama Vision error:", error);
      return NextResponse.json(
        { error: "Failed to process request" },
        { status: 500 }
      );
    }
  }

  // Streaming mode for chat
  const stream = await groq.chat.completions.create({
    messages: messages,
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    temperature: 1,
    max_completion_tokens: 1024,
    top_p: 1,
    stream: true,
    stop: null,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices?.[0]?.delta?.content || "";
          if (text) controller.enqueue(encoder.encode(text));
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
