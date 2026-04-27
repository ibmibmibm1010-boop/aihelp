import type { FormEvent, MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  BOARD_COLUMN_SECTION_ORDER,
  createSubtasksForColumn,
  createTask,
  decomposeTask,
  getVeniceWorkerBaseUrl,
  updateTask,
  uploadTaskAttachment,
  type BoardColumnSection,
  type BoardParticipant,
  type SubtaskItem,
  type Task,
  type TaskStatus,
} from "@shared/api";

import { boardPageErrorMessage, normalizeHexColor } from "./board-detail-errors";
import { ghostBtn, inputClass, primaryBtn, secondaryBtn } from "./board-detail-styles";
import type { KanbanColumn } from "./types";

const TASK_STATUS_ORDER: TaskStatus[] = ["todo", "doing", "done"];

const MAX_TASK_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_TASK_IMAGES = 8;
const TASK_IMAGE_ACCEPT = "image/jpeg,image/png,image/gif,image/webp";

type PendingImage = { id: string; file: File; url: string };

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

type CreateTaskModalProps = {
  boardId: string;
  column: KanbanColumn | undefined;
  participants: BoardParticipant[];
  titleId: string;
  localOnly?: boolean;
  onClose: () => void;
  onCreated: () => void;
  onCreateLocal?: (payload: {
    title: string;
    description: string | null;
    assigneeUserId: string | null;
    cardColor: string | null;
    attachmentUrls: string[];
  }) => void;
};

export function CreateTaskModal({
  boardId,
  column,
  participants,
  titleId,
  localOnly = false,
  onClose,
  onCreated,
  onCreateLocal,
}: CreateTaskModalProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeUserId, setAssigneeUserId] = useState<string>("");
  const [cardAccent, setCardAccent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [llmSubtasks, setLlmSubtasks] = useState<SubtaskItem[] | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmError, setLlmError] = useState<string | null>(null);
  const [llmAddBusy, setLlmAddBusy] = useState(false);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const pendingImagesRef = useRef<PendingImage[]>([]);
  pendingImagesRef.current = pendingImages;

  const workerConfigured = getVeniceWorkerBaseUrl() !== "";

  const taskTextForLlm = () => {
    const a = title.trim();
    const b = description.trim();
    return [a, b].filter(Boolean).join("\n\n");
  };

  const handleLlmDecompose = async () => {
    if (!column || llmLoading || !workerConfigured) return;
    const text = taskTextForLlm();
    if (!text) {
      setLlmError(t("boards.detail.modals.aiNeedText"));
      return;
    }
    setLlmError(null);
    setLlmSubtasks(null);
    setLlmLoading(true);
    try {
      const list = await decomposeTask(text);
      setLlmSubtasks(list);
    } catch (e) {
      setLlmError(boardPageErrorMessage(e));
    } finally {
      setLlmLoading(false);
    }
  };

  const handleAddLlmSubtasks = async () => {
    if (!column || !llmSubtasks?.length || llmAddBusy) return;
    setFormError(null);
    setLlmError(null);
    const descNorm = (s: string) => (s.trim() === "" ? null : s.trim());
    const assigneeNorm = assigneeUserId === "" ? null : assigneeUserId;
    const cardNorm = cardAccent ? normalizeHexColor(cardAccent) : null;
    if (cardAccent && !cardNorm) {
      setFormError(t("boards.detail.modals.badCardColor"));
      return;
    }
    setLlmAddBusy(true);
    setBusy(true);
    try {
      if (localOnly && onCreateLocal) {
        for (const s of llmSubtasks) {
          onCreateLocal({
            title: s.title.trim() || t("boards.detail.modals.untitled"),
            description: descNorm(s.task),
            assigneeUserId: assigneeNorm,
            cardColor: cardNorm,
            attachmentUrls: [],
          });
        }
        onClose();
        return;
      }
      const items = llmSubtasks
        .map((s) => ({
          title: s.title.trim() || t("boards.detail.modals.untitled"),
          description: descNorm(s.task),
        }))
        .filter((x) => x.title.length > 0);
      if (items.length === 0) {
        setLlmError(t("boards.detail.modals.aiEmptySubtasks"));
        return;
      }
      await createSubtasksForColumn({
        boardId,
        columnId: column.id,
        status: column.linkedStatus,
        items,
      });
      onCreated();
    } catch (e) {
      setFormError(boardPageErrorMessage(e));
    } finally {
      setLlmAddBusy(false);
      setBusy(false);
    }
  };

  useEffect(() => {
    return () => {
      pendingImagesRef.current.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, []);

  const removePendingAt = (id: string) => {
    setPendingImages((prev) => {
      const p = prev.find((x) => x.id === id);
      if (p) URL.revokeObjectURL(p.url);
      return prev.filter((x) => x.id !== id);
    });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!column) {
      setFormError(t("boards.detail.modals.columnNotFound"));
      return;
    }
    setFormError(null);
    const titleTrim = title.trim();
    if (!titleTrim) {
      setFormError(t("boards.detail.modals.taskTitleRequired"));
      return;
    }
    const descNorm = description.trim() === "" ? null : description.trim();
    const assigneeNorm = assigneeUserId === "" ? null : assigneeUserId;
    const cardNorm = cardAccent ? normalizeHexColor(cardAccent) : null;
    if (cardAccent && !cardNorm) {
      setFormError(t("boards.detail.modals.badCardColor"));
      return;
    }
    if (localOnly && onCreateLocal) {
      let attachmentUrls: string[] = [];
      try {
        for (const p of pendingImages) {
          if (p.file.size > MAX_TASK_IMAGE_BYTES) {
            setFormError(t("boards.detail.modals.attachmentTooLarge"));
            return;
          }
          attachmentUrls.push(await readFileAsDataUrl(p.file));
        }
      } catch {
        setFormError(t("boards.detail.modals.attachmentReadFailed"));
        return;
      }
      onCreateLocal({
        title: titleTrim,
        description: descNorm,
        assigneeUserId: assigneeNorm,
        cardColor: cardNorm,
        attachmentUrls,
      });
      onClose();
      return;
    }
    setBusy(true);
    try {
      const created = await createTask({
        boardId,
        title: titleTrim,
        description: descNorm ?? undefined,
        status: column.linkedStatus,
        columnId: column.id,
        assigneeUserId: assigneeNorm ?? undefined,
        cardColor: cardNorm ?? undefined,
      });
      const uploaded: string[] = [];
      for (const p of pendingImages) {
        uploaded.push(await uploadTaskAttachment(boardId, created.id, p.file));
      }
      if (uploaded.length > 0) {
        await updateTask(created.id, { attachmentUrls: uploaded });
      }
      onCreated();
    } catch (err) {
      setFormError(boardPageErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const backdrop = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!column) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/40 p-4 motion-safe:animate-modal-backdrop-in motion-reduce:animate-none sm:items-center"
      role="presentation"
      onMouseDown={backdrop}
    >
      <div
        className="w-full max-w-md rounded-vibe border border-vibe-line bg-white/95 p-6 shadow-2xl backdrop-blur-md motion-safe:animate-modal-dialog-in motion-reduce:animate-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-bold text-ink">
          {t("boards.detail.modals.newTask")}
        </h2>
        <p className="mt-1 text-sm text-vibe-muted">
          {t("boards.detail.modals.columnLabel", { title: column.title })}
        </p>
        <form className="mt-4 flex flex-col gap-3" onSubmit={(e) => void submit(e)}>
          {formError ? (
            <p className="text-sm text-red-700" role="alert">
              {formError}
            </p>
          ) : null}
          <input
            className={inputClass}
            placeholder={t("boards.detail.modals.titlePh")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={busy}
          />
          <textarea
            className={`${inputClass} min-h-[80px] resize-y`}
            placeholder={t("boards.detail.modals.descPh")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={busy}
            rows={3}
          />
          <div className="rounded-vibe border border-vibe-line bg-vibe-canvas/50 p-3">
            <p className="text-xs font-semibold text-ink">{t("boards.detail.modals.aiBlockTitle")}</p>
            {!workerConfigured ? (
              <p className="mt-1 text-xs text-vibe-muted">{t("boards.detail.modals.aiWorkerOff")}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={secondaryBtn}
                disabled={busy || llmLoading || !workerConfigured || !taskTextForLlm()}
                onClick={() => void handleLlmDecompose()}
              >
                {llmLoading ? t("boards.detail.modals.aiDecomposing") : t("boards.detail.modals.aiDecompose")}
              </button>
            </div>
            {llmError ? (
              <p className="mt-2 text-xs font-medium text-red-700" role="alert">
                {llmError}
              </p>
            ) : null}
            {llmSubtasks && llmSubtasks.length > 0 ? (
              <div className="mt-3">
                <p className="mb-2 text-xs font-semibold text-vibe-muted">
                  {t("boards.detail.modals.aiPreview")}
                </p>
                <ul className="max-h-40 space-y-2 overflow-y-auto pr-1">
                  {llmSubtasks.map((s, idx) => (
                    <li
                      key={`${idx}-${s.title}`}
                      className="rounded-vibe border border-vibe-line bg-white/90 px-2 py-1.5 text-xs"
                    >
                      <p className="font-semibold text-ink">{s.title}</p>
                      <p className="text-vibe-muted">{s.task}</p>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={`${primaryBtn} mt-3 w-full sm:w-auto`}
                  disabled={busy || llmAddBusy}
                  onClick={() => void handleAddLlmSubtasks()}
                >
                  {llmAddBusy
                    ? "…"
                    : t("boards.detail.modals.aiAddCards", { count: llmSubtasks.length })}
                </button>
              </div>
            ) : null}
          </div>
          <div>
            <label
              className="mb-1 block text-xs font-semibold text-vibe-muted"
              htmlFor={`${titleId}-assignee`}
            >
              {t("boards.detail.modals.assignee")}
            </label>
            <select
              id={`${titleId}-assignee`}
              className={inputClass}
              value={assigneeUserId}
              onChange={(e) => setAssigneeUserId(e.target.value)}
              disabled={busy}
            >
              <option value="">{t("boards.detail.modals.assigneeNone")}</option>
              {participants.map((p) => (
                <option key={p.userId} value={p.userId}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="mb-1 block text-xs font-semibold text-vibe-muted">
              {t("boards.detail.modals.cardColor")}
            </span>
            <div className="flex flex-wrap items-center gap-3">
              {cardAccent === null ? (
                <button
                  type="button"
                  className={secondaryBtn}
                  onClick={() => setCardAccent("#94a3b8")}
                  disabled={busy}
                >
                  {t("boards.detail.modals.pickColor")}
                </button>
              ) : (
                <>
                  <input
                    type="color"
                    className="h-10 w-14 cursor-pointer rounded border border-vibe-line bg-white p-0"
                    value={cardAccent}
                    onChange={(e) => setCardAccent(e.target.value)}
                    disabled={busy}
                    aria-label={t("boards.detail.modals.colorAria")}
                  />
                  <button
                    type="button"
                    className={secondaryBtn}
                    onClick={() => setCardAccent(null)}
                    disabled={busy}
                  >
                    {t("boards.detail.modals.clearColor")}
                  </button>
                </>
              )}
            </div>
          </div>
          <div>
            <label
              className="mb-1 block text-xs font-semibold text-vibe-muted"
              htmlFor={`${titleId}-files`}
            >
              {t("boards.detail.modals.attachments")}
            </label>
            <input
              id={`${titleId}-files`}
              type="file"
              accept={TASK_IMAGE_ACCEPT}
              multiple
              className="block w-full text-sm text-vibe-muted file:mr-2 file:rounded-vibe file:border file:border-vibe-line file:bg-white file:px-2 file:py-1 file:text-xs file:font-semibold file:text-ink"
              disabled={busy}
              onChange={(e) => {
                const list = e.target.files;
                e.target.value = "";
                if (!list?.length) return;
                setFormError(null);
                const add: PendingImage[] = [];
                for (let i = 0; i < list.length; i++) {
                  const file = list[i];
                  if (!file.type.startsWith("image/")) {
                    setFormError(t("boards.detail.modals.attachmentNotImage"));
                    return;
                  }
                  if (file.size > MAX_TASK_IMAGE_BYTES) {
                    setFormError(t("boards.detail.modals.attachmentTooLarge"));
                    return;
                  }
                  if (pendingImages.length + add.length >= MAX_TASK_IMAGES) {
                    setFormError(t("boards.detail.modals.attachmentMaxCount", { max: MAX_TASK_IMAGES }));
                    break;
                  }
                  add.push({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) });
                }
                if (add.length) setPendingImages((prev) => [...prev, ...add]);
              }}
            />
            {pendingImages.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-2" aria-label={t("boards.detail.modals.attachmentsPreviewAria")}>
                {pendingImages.map((p) => (
                  <li key={p.id} className="relative">
                    <img
                      src={p.url}
                      alt=""
                      className="h-14 w-14 rounded border border-vibe-line object-cover"
                    />
                    <button
                      type="button"
                      className={`${ghostBtn} absolute -right-1 -top-1 rounded bg-white px-1 text-xs shadow`}
                      onClick={() => removePendingAt(p.id)}
                      disabled={busy}
                      aria-label={t("boards.detail.modals.removeAttachment")}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className={secondaryBtn} onClick={onClose} disabled={busy}>
              {t("common.cancel")}
            </button>
            <button type="submit" className={primaryBtn} disabled={busy}>
              {busy ? "…" : t("boards.detail.modals.create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type EditTaskModalProps = {
  boardId: string;
  task: Task;
  columns: KanbanColumn[];
  participants: BoardParticipant[];
  resolveColumnId: (task: Task) => string;
  titleId: string;
  localOnly?: boolean;
  onClose: () => void;
  onSave: (patch: {
    title: string;
    description: string | null;
    columnId: string;
    assigneeUserId: string | null;
    cardColor: string | null;
    attachmentUrls: string[];
  }) => void | Promise<void>;
};

export function EditTaskModal({
  boardId,
  task,
  columns,
  participants,
  resolveColumnId,
  titleId,
  localOnly = false,
  onClose,
  onSave,
}: EditTaskModalProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [columnId, setColumnId] = useState(() => resolveColumnId(task));
  const [assigneeUserId, setAssigneeUserId] = useState(() => task.assignee_user_id ?? "");
  const [cardAccent, setCardAccent] = useState<string | null>(() =>
    task.card_color && normalizeHexColor(task.card_color) ? task.card_color : null,
  );
  const [keptAttachmentUrls, setKeptAttachmentUrls] = useState<string[]>(
    () => task.attachment_urls ?? [],
  );
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const pendingImagesRef = useRef<PendingImage[]>([]);
  pendingImagesRef.current = pendingImages;
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      pendingImagesRef.current.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, []);

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setColumnId(resolveColumnId(task));
    setAssigneeUserId(task.assignee_user_id ?? "");
    setCardAccent(
      task.card_color && normalizeHexColor(task.card_color) ? task.card_color : null,
    );
    setKeptAttachmentUrls(task.attachment_urls ?? []);
    setPendingImages((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
  }, [task, resolveColumnId]);

  const removePendingAt = (id: string) => {
    setPendingImages((prev) => {
      const p = prev.find((x) => x.id === id);
      if (p) URL.revokeObjectURL(p.url);
      return prev.filter((x) => x.id !== id);
    });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const tTrim = title.trim();
    if (!tTrim) {
      setFormError(t("boards.detail.modals.taskTitleRequired"));
      return;
    }
    const cardNorm = cardAccent ? normalizeHexColor(cardAccent) : null;
    if (cardAccent && !cardNorm) {
      setFormError(t("boards.detail.modals.badCardColor"));
      return;
    }
    setFormError(null);
    let attachmentUrls = [...keptAttachmentUrls];
    try {
      if (localOnly) {
        for (const p of pendingImages) {
          if (p.file.size > MAX_TASK_IMAGE_BYTES) {
            setFormError(t("boards.detail.modals.attachmentTooLarge"));
            return;
          }
          attachmentUrls.push(await readFileAsDataUrl(p.file));
        }
      } else {
        for (const p of pendingImages) {
          attachmentUrls.push(await uploadTaskAttachment(boardId, task.id, p.file));
        }
      }
    } catch (err) {
      setFormError(boardPageErrorMessage(err));
      return;
    }
    await onSave({
      title: tTrim,
      description: description.trim() === "" ? null : description.trim(),
      columnId,
      assigneeUserId: assigneeUserId === "" ? null : assigneeUserId,
      cardColor: cardNorm,
      attachmentUrls,
    });
  };

  const backdrop = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/40 p-4 motion-safe:animate-modal-backdrop-in motion-reduce:animate-none sm:items-center"
      role="presentation"
      onMouseDown={backdrop}
    >
      <div
        className="w-full max-w-md rounded-vibe border border-vibe-line bg-white/95 p-6 shadow-2xl backdrop-blur-md motion-safe:animate-modal-dialog-in motion-reduce:animate-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-bold text-ink">
          {t("boards.detail.modals.editTask")}
        </h2>
        <form className="mt-4 flex flex-col gap-3" onSubmit={(e) => void submit(e)}>
          {formError ? (
            <p className="text-sm text-red-700" role="alert">
              {formError}
            </p>
          ) : null}
          <input
            className={inputClass}
            placeholder={t("boards.detail.modals.titlePh")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <textarea
            className={`${inputClass} min-h-[80px] resize-y`}
            placeholder={t("boards.detail.modals.descPh")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <div>
            <label className="mb-1 block text-xs font-semibold text-vibe-muted" htmlFor={`${titleId}-col`}>
              {t("boards.detail.modals.columnField")}
            </label>
            <select
              id={`${titleId}-col`}
              className={inputClass}
              value={columnId}
              onChange={(e) => setColumnId(e.target.value)}
            >
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              className="mb-1 block text-xs font-semibold text-vibe-muted"
              htmlFor={`${titleId}-assignee`}
            >
              {t("boards.detail.modals.assignee")}
            </label>
            <select
              id={`${titleId}-assignee`}
              className={inputClass}
              value={assigneeUserId}
              onChange={(e) => setAssigneeUserId(e.target.value)}
            >
              <option value="">{t("boards.detail.modals.assigneeNone")}</option>
              {participants.map((p) => (
                <option key={p.userId} value={p.userId}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="mb-1 block text-xs font-semibold text-vibe-muted">
              {t("boards.detail.modals.cardColor")}
            </span>
            <div className="flex flex-wrap items-center gap-3">
              {cardAccent === null ? (
                <button type="button" className={secondaryBtn} onClick={() => setCardAccent("#94a3b8")}>
                  {t("boards.detail.modals.pickColor")}
                </button>
              ) : (
                <>
                  <input
                    type="color"
                    className="h-10 w-14 cursor-pointer rounded border border-vibe-line bg-white p-0"
                    value={cardAccent}
                    onChange={(e) => setCardAccent(e.target.value)}
                    aria-label={t("boards.detail.modals.colorAria")}
                  />
                  <button type="button" className={secondaryBtn} onClick={() => setCardAccent(null)}>
                    {t("boards.detail.modals.clearColor")}
                  </button>
                </>
              )}
            </div>
          </div>
          <div>
            <span className="mb-1 block text-xs font-semibold text-vibe-muted">
              {t("boards.detail.modals.attachments")}
            </span>
            {keptAttachmentUrls.length > 0 ? (
              <ul className="mb-2 flex flex-wrap gap-2">
                {keptAttachmentUrls.map((url) => (
                  <li key={url} className="relative">
                    <a href={url} target="_blank" rel="noreferrer" className="block">
                      <img
                        src={url}
                        alt=""
                        className="h-14 w-14 rounded border border-vibe-line object-cover"
                      />
                    </a>
                    <button
                      type="button"
                      className={`${ghostBtn} absolute -right-1 -top-1 rounded bg-white px-1 text-xs shadow`}
                      onClick={() => setKeptAttachmentUrls((prev) => prev.filter((u) => u !== url))}
                      aria-label={t("boards.detail.modals.removeAttachment")}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <input
              id={`${titleId}-files`}
              type="file"
              accept={TASK_IMAGE_ACCEPT}
              multiple
              className="block w-full text-sm text-vibe-muted file:mr-2 file:rounded-vibe file:border file:border-vibe-line file:bg-white file:px-2 file:py-1 file:text-xs file:font-semibold file:text-ink"
              onChange={(e) => {
                const list = e.target.files;
                e.target.value = "";
                if (!list?.length) return;
                setFormError(null);
                const add: PendingImage[] = [];
                const totalCount =
                  keptAttachmentUrls.length + pendingImages.length;
                for (let i = 0; i < list.length; i++) {
                  const file = list[i];
                  if (!file.type.startsWith("image/")) {
                    setFormError(t("boards.detail.modals.attachmentNotImage"));
                    return;
                  }
                  if (file.size > MAX_TASK_IMAGE_BYTES) {
                    setFormError(t("boards.detail.modals.attachmentTooLarge"));
                    return;
                  }
                  if (totalCount + add.length >= MAX_TASK_IMAGES) {
                    setFormError(t("boards.detail.modals.attachmentMaxCount", { max: MAX_TASK_IMAGES }));
                    break;
                  }
                  add.push({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) });
                }
                if (add.length) setPendingImages((prev) => [...prev, ...add]);
              }}
            />
            {pendingImages.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-2" aria-label={t("boards.detail.modals.attachmentsNewAria")}>
                {pendingImages.map((p) => (
                  <li key={p.id} className="relative">
                    <img
                      src={p.url}
                      alt=""
                      className="h-14 w-14 rounded border border-vibe-line object-cover"
                    />
                    <button
                      type="button"
                      className={`${ghostBtn} absolute -right-1 -top-1 rounded bg-white px-1 text-xs shadow`}
                      onClick={() => removePendingAt(p.id)}
                      aria-label={t("boards.detail.modals.removeAttachment")}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className={secondaryBtn} onClick={onClose}>
              {t("common.cancel")}
            </button>
            <button type="submit" className={primaryBtn}>
              {t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type ColumnFormModalProps = {
  mode: "add" | "edit";
  defaultSection: BoardColumnSection;
  initialColumn: KanbanColumn | undefined;
  titleId: string;
  onClose: () => void;
  onSave: (col: KanbanColumn) => void | Promise<void>;
};

export function ColumnFormModal({
  mode,
  defaultSection,
  initialColumn,
  titleId,
  onClose,
  onSave,
}: ColumnFormModalProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(initialColumn?.title ?? "");
  const [color, setColor] = useState(initialColumn?.color ?? "#6366f1");
  const [colorText, setColorText] = useState(initialColumn?.color ?? "#6366f1");
  const [linkedStatus, setLinkedStatus] = useState<TaskStatus>(
    initialColumn?.linkedStatus ?? "todo",
  );
  const [section, setSection] = useState<BoardColumnSection>(
    initialColumn?.section ?? defaultSection,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const syncColorFromPicker = (hex: string) => {
    setColor(hex);
    setColorText(hex);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const normalized = normalizeHexColor(colorText) ?? normalizeHexColor(color);
    if (!normalized) {
      setFormError(t("boards.detail.modals.invalidHex"));
      return;
    }
    const titleTrim = title.trim();
    if (!titleTrim) {
      setFormError(t("boards.detail.modals.columnNameRequired"));
      return;
    }
    setBusy(true);
    try {
      const col: KanbanColumn =
        mode === "edit" && initialColumn
          ? { ...initialColumn, title: titleTrim, color: normalized, linkedStatus, section }
          : {
              id: "",
              title: titleTrim,
              color: normalized,
              linkedStatus,
              section,
              sortOrder: 0,
            };
      await Promise.resolve(onSave(col));
    } finally {
      setBusy(false);
    }
  };

  const backdrop = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (mode === "edit" && !initialColumn) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/40 p-4 motion-safe:animate-modal-backdrop-in motion-reduce:animate-none sm:items-center"
      role="presentation"
      onMouseDown={backdrop}
    >
      <div
        className="w-full max-w-md rounded-vibe border border-vibe-line bg-white/95 p-6 shadow-2xl backdrop-blur-md motion-safe:animate-modal-dialog-in motion-reduce:animate-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-bold text-ink">
          {mode === "add" ? t("boards.detail.modals.newColumn") : t("boards.detail.modals.editColumnTitle")}
        </h2>
        <p className="mt-1 text-sm text-vibe-muted">{t("boards.detail.columnApiHint")}</p>
        <form className="mt-4 flex flex-col gap-3" onSubmit={(e) => void submit(e)}>
          {formError ? (
            <p className="text-sm text-red-700" role="alert">
              {formError}
            </p>
          ) : null}
          <div>
            <label className="mb-1 block text-xs font-semibold text-vibe-muted" htmlFor={`${titleId}-name`}>
              {t("boards.detail.modals.columnName")}
            </label>
            <input
              id={`${titleId}-name`}
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={busy}
            />
          </div>
          <div>
            <span className="mb-1 block text-xs font-semibold text-vibe-muted">
              {t("boards.detail.modals.columnColor")}
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="color"
                className="h-10 w-14 cursor-pointer rounded border border-vibe-line bg-white p-0"
                value={color}
                onChange={(e) => syncColorFromPicker(e.target.value)}
                disabled={busy}
                aria-label={t("boards.detail.modals.colorPickerAria")}
              />
              <input
                className={`${inputClass} max-w-[9rem]`}
                value={colorText}
                onChange={(e) => setColorText(e.target.value)}
                placeholder="#6366f1"
                disabled={busy}
                aria-label={t("boards.detail.modals.hexAria")}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-vibe-muted" htmlFor={`${titleId}-sec`}>
              {t("boards.detail.modals.sectionField")}
            </label>
            <select
              id={`${titleId}-sec`}
              className={inputClass}
              value={section}
              onChange={(e) => setSection(e.target.value as BoardColumnSection)}
              disabled={busy}
            >
              {BOARD_COLUMN_SECTION_ORDER.map((sec) => (
                <option key={sec} value={sec}>
                  {t(`boards.detail.sections.${sec}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-vibe-muted" htmlFor={`${titleId}-status`}>
              {t("boards.detail.modals.statusField")}
            </label>
            <select
              id={`${titleId}-status`}
              className={inputClass}
              value={linkedStatus}
              onChange={(e) => setLinkedStatus(e.target.value as TaskStatus)}
              disabled={busy}
            >
              {TASK_STATUS_ORDER.map((st) => (
                <option key={st} value={st}>
                  {t(`boards.detail.status.${st}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className={secondaryBtn} onClick={onClose} disabled={busy}>
              {t("common.cancel")}
            </button>
            <button type="submit" className={primaryBtn} disabled={busy}>
              {busy ? "…" : mode === "add" ? t("common.add") : t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
