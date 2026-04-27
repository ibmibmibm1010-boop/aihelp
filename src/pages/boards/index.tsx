import type { FormEvent, MouseEvent } from "react";
import { useCallback, useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import i18n from "i18next";

import {
  addBoardMemberByEmail,
  createBoard,
  deleteBoard,
  fetchBoardMembers,
  fetchBoards,
  removeBoardMember,
  type Board,
  type BoardMember,
} from "@shared/api";
import { formatDateRu, getApiErrorMessage, useAuth } from "@shared/lib";
import { pressableBase } from "@shared/ui";

import { DeleteBoardDialog } from "./DeleteBoardDialog";

const cardClass =
  "rounded-vibe border border-vibe-line bg-white/90 p-6 shadow-lg shadow-vibe-purple/10 backdrop-blur-sm sm:p-8";

const inputClass =
  "w-full rounded-vibe border border-vibe-line bg-white px-4 py-3 text-ink shadow-sm outline-none transition placeholder:text-slate-400 focus:border-vibe-purple focus:ring-2 focus:ring-vibe-purple/25";

const textareaClass = `${inputClass} min-h-[100px] resize-y`;

const primaryBtn = `${pressableBase} inline-flex items-center justify-center rounded-vibe bg-vibe-purple px-6 py-3 text-sm font-semibold text-white shadow-md shadow-vibe-purple/25 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60`;

const secondaryBtn = `${pressableBase} inline-flex items-center justify-center rounded-vibe border border-vibe-line bg-white/90 px-6 py-3 text-sm font-semibold text-ink shadow-sm backdrop-blur-sm hover:bg-white`;

const addBoardBtn = `${pressableBase} inline-flex items-center justify-center gap-2 rounded-vibe bg-vibe-purple px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-vibe-purple/25 transition hover:brightness-95`;

function boardsErrorMessage(err: unknown): string {
  const msg =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: unknown }).message)
      : getApiErrorMessage(err);
  if (/relation ["']boards["'] does not exist|Could not find the table.*boards/i.test(msg)) {
    return i18n.t("errors.boardsTable");
  }
  if (
    /relation ["']board_members["'] does not exist|Could not find the table.*board_members/i.test(
      msg,
    )
  ) {
    return i18n.t("errors.boardMembersTable");
  }
  if (
    err &&
    typeof err === "object" &&
    "code" in err &&
    String((err as { code: unknown }).code) === "PGRST205"
  ) {
    return i18n.t("errors.boardsApi");
  }
  return msg;
}

function supabaseDashboardSqlNewUrl(): string | undefined {
  const raw = import.meta.env.VITE_SUPABASE_URL;
  if (typeof raw !== "string" || !raw.trim()) {
    return undefined;
  }
  try {
    const host = new URL(raw.trim()).hostname;
    const ref = host.split(".")[0];
    if (!ref || !host.endsWith(".supabase.co")) {
      return undefined;
    }
    return `https://supabase.com/dashboard/project/${ref}/sql/new`;
  } catch {
    return undefined;
  }
}

function isMissingBoardsSetupMessage(message: string): boolean {
  return /public\.boards|create_boards|add_board_members|board_members|участник|not created|migration|PGRST205|boards.*API|SUPABASE_ACCESS_TOKEN|members table/i.test(
    message,
  );
}

const BoardsPage = () => {
  const { t } = useTranslation();
  const [createOpen, setCreateOpen] = useState(false);
  const [boards, setBoards] = useState<Board[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const titleId = useId();
  const sqlEditorUrl = supabaseDashboardSqlNewUrl();

  const loadBoards = useCallback(async () => {
    setListError(null);
    setListLoading(true);
    try {
      const rows = await fetchBoards();
      setBoards(rows);
    } catch (e) {
      setListError(boardsErrorMessage(e));
      setBoards([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBoards();
  }, [loadBoards]);

  useEffect(() => {
    if (!createOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCreateOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [createOpen]);

  return (
    <main>
      <p className="inline-flex items-center rounded-full bg-vibe-purple px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-sm">
        {t("common.logo")}
      </p>
      <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-ink drop-shadow-sm sm:text-5xl lg:text-6xl">
        {t("boards.list.title")}
      </h1>
      <p className="mt-4 max-w-2xl text-lg font-medium text-ink/90">{t("boards.list.subtitle")}</p>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-vibe-muted">{t("boards.list.inviteHint")}</p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <button type="button" className={addBoardBtn} onClick={() => setCreateOpen(true)}>
          <span aria-hidden className="text-lg font-light leading-none">
            +
          </span>
          {t("boards.list.addBoard")}
        </button>
        <LinkToAccountHint />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className={cardClass} aria-labelledby="boards-list-heading">
          <h2 id="boards-list-heading" className="text-lg font-bold tracking-tight text-ink">
            {t("boards.list.myBoards")}
          </h2>
          {listError ? (
            <div className="mt-4 rounded-vibe border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <p className="font-medium">{listError}</p>
              {isMissingBoardsSetupMessage(listError) ? (
                <div className="mt-3 space-y-2 border-t border-amber-200/80 pt-3 text-amber-950/95">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/80">
                    {t("boards.list.whatToDo")}
                  </p>
                  <ol className="list-decimal space-y-1.5 pl-4 text-sm leading-relaxed">
                    <li>
                      {t("boards.list.setupStep1a")}{" "}
                      {sqlEditorUrl ? (
                        <a
                          href={sqlEditorUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={`${pressableBase} font-semibold text-vibe-purple underline-offset-2 hover:underline`}
                        >
                          {t("boards.list.setupSqlEditorLink")}
                        </a>
                      ) : (
                        t("boards.list.setupSqlEditorFallback")
                      )}{" "}
                      {t("boards.list.setupStep1b")}
                    </li>
                    <li>{t("boards.list.setupStep2")}</li>
                    <li>{t("boards.list.setupStep3")}</li>
                  </ol>
                  <p className="text-xs text-amber-900/75">{t("boards.list.setupCli")}</p>
                </div>
              ) : null}
            </div>
          ) : null}
          {listLoading ? (
            <p className="mt-4 text-sm text-vibe-muted">{t("common.loading")}</p>
          ) : boards.length === 0 && !listError ? (
            <p className="mt-4 text-sm leading-relaxed text-vibe-muted">{t("boards.list.empty")}</p>
          ) : !listError ? (
            <ul className="mt-4 space-y-3" aria-label={t("boards.list.listAria")}>
              {boards.map((b) => (
                <BoardCard
                  key={b.id}
                  board={b}
                  onReload={() => void loadBoards()}
                />
              ))}
            </ul>
          ) : null}
        </section>

        <section className={cardClass} aria-labelledby="boards-hint-heading">
          <h2 id="boards-hint-heading" className="text-lg font-bold tracking-tight text-ink">
            {t("boards.list.hintsTitle")}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-vibe-muted">{t("boards.list.hintsBody")}</p>
        </section>
      </div>

      {createOpen ? (
        <CreateBoardDialog
          titleId={titleId}
          onClose={() => setCreateOpen(false)}
          onCreated={() => void loadBoards()}
        />
      ) : null}
    </main>
  );
};

type BoardCardProps = {
  board: Board;
  onReload: () => void;
};

function BoardCard({ board, onReload }: BoardCardProps) {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const currentUserId = currentUser?.id ?? "";
  const isOwner = Boolean(currentUserId && board.user_id === currentUserId);
  const deleteTitleId = useId();
  const [expanded, setExpanded] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const rows = await fetchBoardMembers(board.id);
      setMembers(rows);
    } catch {
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }, [board.id]);

  useEffect(() => {
    if (expanded) {
      void loadMembers();
    }
  }, [expanded, loadMembers]);

  useEffect(() => {
    if (!deleteOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleteBusy) setDeleteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteOpen, deleteBusy]);

  const handleDeleteConfirm = async () => {
    setDeleteError(null);
    setDeleteBusy(true);
    try {
      await deleteBoard(board.id);
      setDeleteOpen(false);
      onReload();
    } catch (err) {
      setDeleteError(boardsErrorMessage(err));
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteBusy(true);
    try {
      await addBoardMemberByEmail(board.id, inviteEmail);
      setInviteEmail("");
      void loadMembers();
      onReload();
    } catch (err) {
      setInviteError(boardsErrorMessage(err));
    } finally {
      setInviteBusy(false);
    }
  };

  const handleRemove = async (memberUserId: string) => {
    setRemovingId(memberUserId);
    try {
      await removeBoardMember(board.id, memberUserId);
      void loadMembers();
      onReload();
    } finally {
      setRemovingId(null);
    }
  };

  const tinyBtn = `${pressableBase} rounded-vibe border border-vibe-line bg-white/90 px-2.5 py-1 text-xs font-semibold text-ink shadow-sm hover:bg-white`;

  const deleteBoardListBtn = `${pressableBase} inline-flex w-full items-center justify-center rounded-vibe border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-800 shadow-sm transition hover:bg-red-100 sm:w-auto`;

  return (
    <li className="rounded-vibe border border-vibe-line bg-white/80 px-4 py-3 shadow-sm backdrop-blur-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            to={`/boards/${board.id}`}
            className={`${pressableBase} block font-semibold text-ink hover:text-vibe-purple`}
          >
            {board.name}
          </Link>
          {board.description ? (
            <p className="mt-1 text-sm leading-relaxed text-vibe-muted">{board.description}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-vibe-muted">
              {t("boards.list.createdPrefix")} {formatDateRu(board.created_at)}
            </span>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                isOwner
                  ? "bg-vibe-purple/15 text-vibe-purple"
                  : "bg-slate-200/80 text-vibe-muted"
              }`}
            >
              {isOwner ? t("boards.list.owner") : t("boards.list.member")}
            </span>
          </div>
        </div>
        <button
          type="button"
          className={tinyBtn}
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? t("boards.list.membersToggleHide") : t("boards.list.membersToggleShow")}
        </button>
      </div>

      {isOwner ? (
        <div className="mt-3 flex flex-col gap-2 border-t border-dashed border-vibe-line pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-vibe-muted">
            {t("boards.list.ownerActionsLabel")}
          </p>
          <button
            type="button"
            className={deleteBoardListBtn}
            onClick={() => {
              setDeleteError(null);
              setDeleteOpen(true);
            }}
          >
            {t("boards.list.deleteBoard")}
          </button>
        </div>
      ) : null}

      {expanded ? (
        <div className="mt-4 border-t border-vibe-line pt-4">
          {loadingMembers ? (
            <p className="text-sm text-vibe-muted">{t("common.loading")}</p>
          ) : (
            <ul className="space-y-2" aria-label={t("boards.list.membersAria")}>
              {members.map((m) => {
                const canRemove =
                  isOwner || (m.user_id === currentUserId && !isOwner);
                return (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-vibe bg-vibe-canvas/60 px-3 py-2 text-sm"
                  >
                    <span className="text-ink">{m.member_email}</span>
                    {canRemove ? (
                      <button
                        type="button"
                        className={`${tinyBtn} text-red-700 border-red-200`}
                        disabled={removingId === m.user_id}
                        onClick={() => void handleRemove(m.user_id)}
                      >
                        {removingId === m.user_id
                          ? "…"
                          : isOwner && m.user_id !== currentUserId
                            ? t("boards.list.removeMember")
                            : t("boards.list.leaveBoard")}
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}

          {isOwner ? (
            <form className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end" onSubmit={(e) => void handleInvite(e)}>
              {inviteError ? (
                <p className="w-full text-sm text-red-700" role="alert">
                  {inviteError}
                </p>
              ) : null}
              <div className="min-w-[200px] flex-1">
                <label htmlFor={`invite-${board.id}`} className="sr-only">
                  {t("boards.list.inviteEmailLabel")}
                </label>
                <input
                  id={`invite-${board.id}`}
                  type="email"
                  autoComplete="email"
                  placeholder={t("boards.list.inviteEmailPh")}
                  className={inputClass}
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={inviteBusy}
                />
              </div>
              <button type="submit" className={primaryBtn} disabled={inviteBusy}>
                {inviteBusy ? t("boards.list.inviteSubmitting") : t("boards.list.inviteSubmit")}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      {deleteOpen ? (
        <DeleteBoardDialog
          titleId={deleteTitleId}
          boardName={board.name}
          onClose={() => !deleteBusy && setDeleteOpen(false)}
          onConfirm={() => void handleDeleteConfirm()}
          busy={deleteBusy}
          error={deleteError}
        />
      ) : null}
    </li>
  );
}

type CreateBoardDialogProps = {
  titleId: string;
  onClose: () => void;
  onCreated: () => void;
};

function CreateBoardDialog({ titleId, onClose, onCreated }: CreateBoardDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      await createBoard({ name, description });
      setName("");
      setDescription("");
      onCreated();
      onClose();
    } catch (err) {
      setSubmitError(boardsErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/40 p-4 sm:items-center"
      role="presentation"
      onMouseDown={handleBackdropClick}
    >
      <div
        className="max-h-[min(90vh,640px)] w-full max-w-md overflow-y-auto rounded-vibe border border-vibe-line bg-white/95 p-6 shadow-2xl shadow-vibe-purple/20 backdrop-blur-md sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-xl font-bold tracking-tight text-ink">
          {t("boards.list.createTitle")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-vibe-muted">{t("boards.list.createLead")}</p>

        <form className="mt-6 flex flex-col gap-5" onSubmit={(e) => void handleSubmit(e)}>
          {submitError ? (
            <p
              className="rounded-vibe border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              role="alert"
            >
              {submitError}
            </p>
          ) : null}

          <div>
            <label htmlFor="board-name" className="mb-1.5 block text-sm font-medium text-ink">
              {t("boards.list.createName")}
            </label>
            <input
              id="board-name"
              name="name"
              type="text"
              required
              autoComplete="off"
              placeholder={t("boards.list.createNamePh")}
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              disabled={submitting}
            />
          </div>

          <div>
            <label htmlFor="board-description" className="mb-1.5 block text-sm font-medium text-ink">
              {t("boards.list.createDesc")}{" "}
              <span className="font-normal text-vibe-muted">{t("boards.list.createDescOptional")}</span>
            </label>
            <textarea
              id="board-description"
              name="description"
              placeholder={t("boards.list.createDescPh")}
              className={textareaClass}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={4}
              disabled={submitting}
            />
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" className={secondaryBtn} onClick={onClose} disabled={submitting}>
              {t("common.cancel")}
            </button>
            <button type="submit" className={primaryBtn} disabled={submitting}>
              {submitting ? t("boards.list.createSaving") : t("boards.list.createSubmit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LinkToAccountHint() {
  const { t } = useTranslation();
  return (
    <p className="text-sm text-vibe-muted">
      {t("boards.list.accountHint")}{" "}
      <Link
        to="/account"
        className={`${pressableBase} font-semibold text-vibe-purple underline-offset-2 hover:underline`}
      >
        {t("boards.list.accountLink")}
      </Link>
      .
    </p>
  );
}

export default BoardsPage;
