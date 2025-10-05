import { NextRequest } from "next/server";
import { Groq } from "groq-sdk";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const {
    prompt,
    tools,
    tool_choice,
    stream: enableStream = true,
  } = await request.json();

  if (!process.env.GROQ_API_KEY) {
    return new Response("Missing GROQ_API_KEY", { status: 500 });
  }

  if (!prompt || typeof prompt !== "string") {
    return new Response("Missing prompt", { status: 400 });
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const requestOptions: any = {
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    model: "openai/gpt-oss-20b",
    temperature: 1,
    top_p: 1,
    stream: enableStream,
    reasoning_effort: "high",
    stop: null,
  };

  // Add tools if provided
  if (tools && tools.length > 0) {
    requestOptions.tools = tools;
    requestOptions.tool_choice = tool_choice || "auto";
  }

  try {
    console.log("/api/groq: request options", {
      model: requestOptions.model,
      stream: requestOptions.stream,
      hasTools: !!requestOptions.tools,
      toolChoice: requestOptions.tool_choice,
      promptLength: prompt?.length,
    });
  } catch {}

  const completion = await groq.chat.completions.create(requestOptions);

  // Handle non-streaming response (needed for tool calls)
  if (!enableStream) {
    const response = completion as any;
    const message = response.choices[0]?.message;
    try {
      console.log(
        "/api/groq: non-streaming content length:",
        message?.content?.length || 0
      );
      console.log(
        "/api/groq: tool_calls count:",
        message?.tool_calls?.length || 0
      );
    } catch {}
    return new Response(
      JSON.stringify({
        content: message?.content || "",
        toolCalls: message?.tool_calls || [],
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      }
    );
  }

  // Handle streaming response
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of completion as any) {
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
