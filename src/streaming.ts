
import { TextDecoder } from "util";

export interface StreamOptions {
    apiUrl: string;
    body: any;
    headers: Record<string, string>;
    signal: AbortSignal;
    onToken: (token: string) => void;
    onError: (err: any) => void;
    onDone: () => void;
  }
  
  export default async function streamCompletions({
    apiUrl,
    body,
    headers,
    signal,
    onToken,
    onError,
    onDone,
  }: StreamOptions) {
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal,
      });
  
      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }
  
      const reader = res.body.getReader();
      const decoder = new TextDecoder(); // ✅ Node 18+ global
      let buffer = "";
  
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
  
        buffer += decoder.decode(value, { stream: true });
        let lines = buffer.split("\n");
  
        buffer = lines.pop() || "";
  
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") continue;
  
          try {
            const json = JSON.parse(trimmed.replace(/^data:\s*/, ""));
            const token = json?.choices?.[0]?.delta?.content ?? "";
            if (token) onToken(token);
          } catch {
            // ignore partial/invalid JSON
          }
        }
      }
  
      onDone();
    } catch (e: any) {
      if (e.name !== "AbortError") {
        onError(e);
      }
    }
  }
  