import { getSupabase } from "@shared/lib/supabase-client";

const BUCKET = "task-attachments";

function safeFileExt(original: string): string {
  const base = original.split(/[/\\]/).pop() ?? "file";
  const i = base.lastIndexOf(".");
  const ext = i >= 0 ? base.slice(i + 1) : "";
  const cleaned = ext.replace(/[^a-z0-9]/gi, "").slice(0, 8);
  return cleaned || "bin";
}

/**
 * Загружает изображение в `{boardId}/{taskId}/{uuid}.{ext}`, возвращает публичный URL.
 */
export async function uploadTaskAttachment(
  boardId: string,
  taskId: string,
  file: File,
): Promise<string> {
  const supabase = getSupabase();
  const ext = safeFileExt(file.name);
  const path = `${boardId}/${taskId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
