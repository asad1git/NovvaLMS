import api from "./axios";

export function getMessages(studentId) {
  return api.get(`/parent-links/${studentId}/chat/messages`).then((r) => r.data.data);
}

/**
 * Streaming counterpart to the old sendMessage — same NDJSON contract and
 * same reasoning as api/chat.js#sendMessageStream: reads the response body
 * incrementally so the UI can render the answer as it arrives instead of
 * waiting for the whole thing.
 */
export async function sendMessageStream(studentId, content, { onStart, onDelta, onDone, onError } = {}) {
  const token = localStorage.getItem("novva_token");
  const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const response = await fetch(`${baseURL}/parent-links/${studentId}/chat/messages`, {
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
        continue;
      }
      if (event.type === "start") onStart?.(event.userMessage);
      else if (event.type === "delta") onDelta?.(event.text);
      else if (event.type === "done") onDone?.(event.assistantMessage);
      else if (event.type === "error") onError?.(event.message);
    }
  }
}
