import * as vscode from "vscode";
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
    console.log("Sending request to LLM:", JSON.stringify(body, null, 2));
    const res = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    });


    if (!res.ok || !res.body) {
      throw new Error(`HTTP ${res.status}`);
    }
    console.log("LLM Response:", JSON.stringify(body, null, 2));
    vscode.window.showInformationMessage("calling copilot for suggestions");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
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
          const jsonStr = trimmed.replace(/^data:\s*/, "");
          console.log("raw sse line: ", jsonStr);
          const json = JSON.parse(jsonStr);
          const token =
            json?.choices?.[0]?.delta?.content ??
            json?.choices?.[0]?.delta?.reasoning ?? 
            json?.choices?.[0]?.text ??
            "";

          vscode.window.showInformationMessage("suggestion returned from copilot" + token);
          if (token) onToken(token);
        } catch {
          console.warn("JSON parse failed on line:", line);
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
