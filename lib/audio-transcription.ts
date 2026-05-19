import "server-only";

const OPENAI_TRANSCRIPTION_URL = "https://api.openai.com/v1/audio/transcriptions";
const DEFAULT_TRANSCRIPTION_MODEL = process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe";
const MAX_AUDIO_UPLOAD_BYTES = 25 * 1024 * 1024;

export type AudioTranscriptionResult =
  | {
      ok: true;
      text: string;
      model: string;
    }
  | {
      ok: false;
      reason: string;
      model?: string;
    };

function normalizeTranscriptionText(text: string | null | undefined) {
  const normalized = `${text ?? ""}`.replace(/\s+/g, " ").trim();
  return normalized || null;
}

function summarizeFailureMessage(message: string) {
  const normalized = message.replace(/\s+/g, " ").trim();
  return normalized.length > 240 ? `${normalized.slice(0, 237)}...` : normalized;
}

export function isAutomaticTranscriptionConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function transcribeAudioFile(
  file: File | null | undefined,
  options: {
    prompt?: string;
    language?: string;
  } = {}
): Promise<AudioTranscriptionResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      ok: false,
      reason: "Automatic transcription is not configured on this server."
    };
  }

  if (!(file instanceof File) || file.size === 0) {
    return {
      ok: false,
      reason: "No audio file was provided for transcription."
    };
  }

  if (file.size > MAX_AUDIO_UPLOAD_BYTES) {
    return {
      ok: false,
      reason: "Audio transcription is limited to files up to 25 MB."
    };
  }

  const formData = new FormData();
  formData.append("file", file, file.name);
  formData.append("model", DEFAULT_TRANSCRIPTION_MODEL);
  formData.append("response_format", "json");

  if (options.language) {
    formData.append("language", options.language);
  }

  if (options.prompt) {
    formData.append("prompt", options.prompt);
  }

  const response = await fetch(OPENAI_TRANSCRIPTION_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: formData
  });

  if (!response.ok) {
    const errorText = summarizeFailureMessage(await response.text());
    return {
      ok: false,
      model: DEFAULT_TRANSCRIPTION_MODEL,
      reason: `OpenAI transcription failed (${response.status}): ${errorText}`
    };
  }

  const payload = (await response.json()) as { text?: string };
  const transcriptText = normalizeTranscriptionText(payload.text);

  if (!transcriptText) {
    return {
      ok: false,
      model: DEFAULT_TRANSCRIPTION_MODEL,
      reason: "OpenAI returned an empty transcript."
    };
  }

  return {
    ok: true,
    text: transcriptText,
    model: DEFAULT_TRANSCRIPTION_MODEL
  };
}
