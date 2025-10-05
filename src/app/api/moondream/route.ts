import { NextRequest, NextResponse } from "next/server";
import { vl } from "moondream";

// Force this route to use Node.js runtime (not Edge)
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const {
      image,
      question,
      action = "query",
      reasoning = false,
    } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    const apiKey = process.env.MOONDREAM_API_KEY;
    // console.log("apiKey", apiKey);
    if (!apiKey) {
      return NextResponse.json(
        { error: "MOONDREAM_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Initialize Moondream client
    const model = new vl({ apiKey });

    // Convert base64 data URL to buffer if needed
    let imageBuffer: Buffer;
    if (image.startsWith("data:")) {
      const base64Data = image.split(",")[1];
      imageBuffer = Buffer.from(base64Data, "base64");
    } else {
      imageBuffer = Buffer.from(image, "base64");
    }

    // Handle different actions
    if (action === "caption") {
      const result = await model.caption({
        image: imageBuffer,
        length: "normal",
        stream: false,
      });
      console.log("Caption result:", JSON.stringify(result, null, 2));
      return NextResponse.json({
        response: result.caption,
        reasoning: reasoning ? (result as any).reasoning : undefined,
        fullResult: reasoning ? result : undefined, // Include full result for debugging
      });
    } else if (action === "query") {
      if (!question) {
        return NextResponse.json(
          { error: "Question is required for query action" },
          { status: 400 }
        );
      }

      const result = await model.query({
        image: imageBuffer,
        question,
        stream: false,
      });
      console.log("result", result);
      console.log("Query result:", JSON.stringify(result, null, 2));
      return NextResponse.json({
        response: result.answer,
        reasoning: reasoning ? (result as any).reasoning : undefined,
        fullResult: reasoning ? result : undefined, // Include full result for debugging
      });
    } else if (action === "detect") {
      if (!question) {
        return NextResponse.json(
          { error: "Object name is required for detect action" },
          { status: 400 }
        );
      }

      const result = await model.detect({
        image: imageBuffer,
        object: question,
      });
      console.log("Detect result:", JSON.stringify(result, null, 2));
      return NextResponse.json({
        response: result.objects,
        reasoning: reasoning ? (result as any).reasoning : undefined,
        fullResult: reasoning ? result : undefined, // Include full result for debugging
      });
    } else if (action === "point") {
      if (!question) {
        return NextResponse.json(
          { error: "Object name is required for point action" },
          { status: 400 }
        );
      }

      const result = await model.point({
        image: imageBuffer,
        object: question,
      });
      console.log("Point result:", JSON.stringify(result, null, 2));
      return NextResponse.json({
        response: result.points,
        reasoning: reasoning ? (result as any).reasoning : undefined,
        fullResult: reasoning ? result : undefined, // Include full result for debugging
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Moondream API error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
