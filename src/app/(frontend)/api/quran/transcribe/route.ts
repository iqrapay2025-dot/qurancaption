import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Cloud Quran Whisper Speech Transcription Endpoint
 * Connects to the Tarteel Quran Whisper model (tarteel-ai/whisper-base-ar-quran)
 * via Hugging Face Serverless Inference, or OpenAI Whisper fallback.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("audio") as Blob | null;

    if (!file) {
      return NextResponse.json(
        { error: "NO_AUDIO", message: "No audio file provided in request." },
        { status: 400 }
      );
    }

    const hfToken = process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    // 1. Primary: Tarteel's Hugging Face Whisper Model
    if (hfToken) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const hfResponse = await fetch(
          "https://router.huggingface.co/hf-inference/models/tarteel-ai/whisper-base-ar-quran",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${hfToken}`,
              "Content-Type": file.type || "audio/webm",
            },
            body: buffer,
            signal: controller.signal,
          }
        );
        clearTimeout(timeoutId);

        if (hfResponse.ok) {
          const data = await hfResponse.json();
          if (data.text) {
            return NextResponse.json({
              provider: "tarteel-whisper",
              text: data.text || "",
            });
          }
        } else {
          const errorText = await hfResponse.text();
          console.warn("Hugging Face Tarteel inference status:", hfResponse.status, errorText);
        }
      } catch (networkErr: any) {
        console.warn("Hugging Face network timeout or error:", networkErr?.message || networkErr);
      }

      // If Hugging Face serverless provider does not host this model, check OpenAI or return fallback
      if (openaiKey) {
        try {
          const openAiFormData = new FormData();
          openAiFormData.append("file", file, "recitation.webm");
          openAiFormData.append("model", "whisper-1");
          openAiFormData.append("language", "ar");

          const openAiResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openaiKey}`,
            },
            body: openAiFormData,
          });

          if (openAiResponse.ok) {
            const data = await openAiResponse.json();
            return NextResponse.json({
              provider: "openai-whisper",
              text: data.text || "",
            });
          }
        } catch (openAiErr: any) {
          console.warn("OpenAI fallback error:", openAiErr?.message);
        }
      }

      // Return graceful fallback without throwing 500 or 400 to the browser
      return NextResponse.json({
        provider: "browser-engine",
        text: "",
        fallback: true,
        message: "Cloud Tarteel model requires a dedicated endpoint. Using client speech engine.",
      });
    }

    // 2. Secondary: OpenAI Whisper Fallback
    if (openaiKey) {
      const openAiFormData = new FormData();
      openAiFormData.append("file", file, "recitation.webm");
      openAiFormData.append("model", "whisper-1");
      openAiFormData.append("language", "ar");

      const openAiResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
        },
        body: openAiFormData,
      });

      if (openAiResponse.ok) {
        const data = await openAiResponse.json();
        return NextResponse.json({
          provider: "openai-whisper",
          text: data.text || "",
        });
      }
    }

    // 3. Neither key is configured
    return NextResponse.json(
      {
        error: "MISSING_API_KEY",
        message:
          "To use the Cloud Tarteel Whisper model, please configure the HF_TOKEN environment variable with your free Hugging Face API token.",
      },
      { status: 503 }
    );
  } catch (err: any) {
    console.error("Transcribe API error:", err);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
