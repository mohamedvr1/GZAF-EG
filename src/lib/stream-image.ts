import { createParser } from "eventsource-parser";
import { flushSync } from "react-dom";
import { supabase } from "@/integrations/supabase/client";

type ImageEventPayload =
  | { type: "image_generation.partial_image"; b64_json: string; partial_image_index: number }
  | { type: "image_generation.completed"; b64_json: string }
  | { type: "error"; error: { message: string } };

export async function streamImage(
  endpoint: string,
  body: Record<string, unknown>,
  onFrame: (dataUrl: string, isFinal: boolean) => void,
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    throw new Error(`Image generation failed: ${res.status} ${await res.text().catch(() => "")}`);
  }

  let sawCompleted = false;
  let finalDataUrl = "";
  let streamError: string | undefined;
  const parser = createParser({
    onEvent(event) {
      let payload: ImageEventPayload | undefined;
      try { payload = JSON.parse(event.data) as ImageEventPayload; } catch { /* noop */ }
      if (event.event === "error" || payload?.type === "error") {
        streamError = (payload as { error?: { message?: string } })?.error?.message ?? "Image generation failed";
        return;
      }
      if (
        event.event !== "image_generation.partial_image" &&
        event.event !== "image_generation.completed"
      ) return;
      if (!payload || !("b64_json" in payload)) return;
      const isFinal = event.event === "image_generation.completed";
      const dataUrl = `data:image/png;base64,${payload.b64_json}`;
      flushSync(() => onFrame(dataUrl, isFinal));
      if (isFinal) {
        sawCompleted = true;
        finalDataUrl = dataUrl;
      }
    },
  });

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      parser.feed(value);
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  if (streamError) throw new Error(streamError);
  if (!sawCompleted) throw new Error("Image stream ended without completion");
  return finalDataUrl;
}
