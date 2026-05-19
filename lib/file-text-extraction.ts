import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

function normalizeExtractedText(text: string | null | undefined) {
  const normalized = `${text ?? ""}`
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t\f\v]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return normalized || null;
}

export async function extractTextFromUploadedFile(file: File | null | undefined) {
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();

  if (
    type.startsWith("text/") ||
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    name.endsWith(".csv") ||
    name.endsWith(".json")
  ) {
    return normalizeExtractedText(await file.text());
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (name.endsWith(".docx") || type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const result = await mammoth.extractRawText({ buffer });
    return normalizeExtractedText(result.value);
  }

  if (name.endsWith(".pdf") || type === "application/pdf") {
    const parser = new PDFParse({ data: buffer });

    try {
      const result = await parser.getText();
      return normalizeExtractedText(result.text);
    } finally {
      await parser.destroy();
    }
  }

  return null;
}
