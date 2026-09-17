import api from "./axios";

export function getMessages(courseId) {
  return api.get(`/courses/${courseId}/chat/messages`).then((r) => r.data.data);
}

/**
 * Streams the assistant's reply instead of waiting for the whole thing —
 * reads the response body incrementally and invokes onStart/onDelta/onDone/
 * onError as NDJSON lines arrive from chatController.sendMessage. Uses raw
 * `fetch`, not the shared axios instance, since axios doesn't expose an
 * incremental ReadableStream reader for browser requests the way fetch does.
 */
export async function sendMessageStream(courseId, content, { onStart, onDelta, onDone, onError } = {}) {
  const token = localStorage.getItem("novva_token");
  const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const response = await fetch(`${baseURL}/courses/${courseId}/chat/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok || !response.body) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Request failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.trim()) continue;
      let event;
      try {
        event = JSON.parse(line);
      } catch {
        continue; // an incomplete/malformed NDJSON line — skip rather than crash the reader
      }
      if (event.type === "start") onStart?.(event.userMessage);
      else if (event.type === "delta") onDelta?.(event.text);
      else if (event.type === "done") onDone?.(event.assistantMessage);
      else if (event.type === "error") onError?.(event.message);
    }
  }
}
