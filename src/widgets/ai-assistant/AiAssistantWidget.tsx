import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

import { decomposeTask, getVeniceWorkerBaseUrl, sendAssistantMessage } from "@shared/api";
import type { AssistantMessage, SubtaskItem } from "@shared/api";
import { useAssistant } from "@shared/lib";
import { pressableBase } from "@shared/ui";

type TabId = "chat" | "plan";

/** Светлая панель и в light, и в dark — иначе `text-ink` на тёмном фоне нечитаем. */
const panelClass =
  "flex max-h-[min(32rem,70vh)] w-[min(100vw-2rem,22rem)] flex-col overflow-hidden rounded-vibe border border-slate-200 bg-white text-ink shadow-2xl shadow-slate-900/20 backdrop-blur-md dark:border-slate-300 dark:bg-white dark:text-ink";

const tabBtn = (active: boolean) =>
  `${pressableBase} flex-1 rounded-vibe px-2 py-2 text-center text-xs font-semibold sm:text-sm ${
    active
      ? "bg-vibe-purple/20 text-vibe-purple dark:bg-vibe-purple/25 dark:text-vibe-purple"
      : "text-slate-600 hover:bg-slate-100 dark:text-slate-600 dark:hover:bg-slate-100"
  }`;

export function AiAssistantWidget() {
  const { t } = useTranslation();
  const location = useLocation();
  const isBoardWorkspace = /^\/boards\/[^/]+$/.test(location.pathname);
  /** На доске зум закреплён внизу справа — поднимаем якорь панели, чтобы не перекрывать `− 100% +`. */
  const anchorClass = isBoardWorkspace
    ? "bottom-24 right-4 sm:bottom-28 sm:right-6"
    : "bottom-4 right-4 sm:bottom-6 sm:right-6";
  const { open, setAssistantOpen, fabHidden } = useAssistant();
  const panelTitleId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<TabId>("chat");
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [taskText, setTaskText] = useState("");
  const [subtasks, setSubtasks] = useState<SubtaskItem[] | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const workerConfigured = getVeniceWorkerBaseUrl() !== "";

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [open, messages, chatLoading]);

  const handleSendChat = async () => {
    const text = input.trim();
    if (!text || chatLoading || !workerConfigured) return;
    const previous = messages;
    const next: AssistantMessage[] = [...previous, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setChatError(null);
    setChatLoading(true);
    try {
      const reply = await sendAssistantMessage(next);
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("assistant.error");
      setChatError(msg);
      setMessages(previous);
    } finally {
      setChatLoading(false);
    }
  };

  const handleDecompose = async () => {
    const task = taskText.trim();
    if (!task || planLoading || !workerConfigured) return;
    setPlanError(null);
    setSubtasks(null);
    setPlanLoading(true);
    try {
      const list = await decomposeTask(task);
      setSubtasks(list);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("assistant.error");
      setPlanError(msg);
    } finally {
      setPlanLoading(false);
    }
  };

  return (
    <div className={`pointer-events-none fixed z-[60] flex flex-col items-end gap-2 ${anchorClass}`}>
      {open ? (
        <section
          className={`${panelClass} pointer-events-auto`}
          role="dialog"
          aria-labelledby={panelTitleId}
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-200">
            <h2 id={panelTitleId} className="text-sm font-bold text-slate-900">
              {t("assistant.title")}
            </h2>
            <button
              type="button"
              className={`${pressableBase} rounded-vibe px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900`}
              onClick={() => setAssistantOpen(false)}
            >
              {t("assistant.close")}
            </button>
          </div>
          {!workerConfigured ? (
            <p className="px-3 py-4 text-xs leading-relaxed text-slate-600">{t("assistant.configHint")}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-0 border-b border-slate-200 p-1 dark:border-slate-200">
                <button type="button" className={tabBtn(tab === "chat")} onClick={() => setTab("chat")}>
                  {t("assistant.tabChat")}
                </button>
                <button type="button" className={tabBtn(tab === "plan")} onClick={() => setTab("plan")}>
                  {t("assistant.tabPlan")}
                </button>
              </div>
              {tab === "chat" ? (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div
                    ref={scrollRef}
                    className="min-h-[10rem] flex-1 space-y-3 overflow-y-auto px-3 py-3 text-sm"
                  >
                    {messages.length === 0 && !chatLoading ? (
                      <p className="text-slate-600">{t("assistant.emptyChat")}</p>
                    ) : null}
                    {messages.map((m, i) => (
                      <div
                        key={`${i}-${m.role}-${m.content.slice(0, 12)}`}
                        className={`rounded-vibe px-2.5 py-2 ${
                          m.role === "user"
                            ? "ml-4 bg-vibe-purple/15 text-slate-900"
                            : "mr-4 border border-slate-200 bg-slate-50 text-slate-900"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      </div>
                    ))}
                    {chatLoading ? (
                      <p className="text-xs text-slate-600">{t("assistant.sending")}</p>
                    ) : null}
                  </div>
                  {chatError ? <p className="px-3 text-xs font-medium text-red-700">{chatError}</p> : null}
                  <div className="flex gap-2 border-t border-slate-200 p-2 dark:border-slate-200">
                    <textarea
                      className="min-h-[2.5rem] flex-1 resize-none rounded-vibe border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-vibe-purple focus:outline-none focus:ring-2 focus:ring-vibe-purple/30"
                      placeholder={t("assistant.placeholder")}
                      rows={2}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void handleSendChat();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className={`${pressableBase} shrink-0 self-end rounded-vibe bg-vibe-purple px-3 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-50`}
                      disabled={chatLoading || !input.trim()}
                      onClick={() => void handleSendChat()}
                    >
                      {t("assistant.send")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-3 text-sm">
                  <label className="block text-xs font-semibold text-slate-700" htmlFor="assistant-task">
                    {t("assistant.taskLabel")}
                  </label>
                  <textarea
                    id="assistant-task"
                    className="min-h-[5rem] w-full resize-y rounded-vibe border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-vibe-purple focus:outline-none focus:ring-2 focus:ring-vibe-purple/30"
                    placeholder={t("assistant.taskPlaceholder")}
                    value={taskText}
                    onChange={(e) => setTaskText(e.target.value)}
                  />
                  <button
                    type="button"
                    className={`${pressableBase} rounded-vibe bg-vibe-purple px-3 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-50`}
                    disabled={planLoading || !taskText.trim()}
                    onClick={() => void handleDecompose()}
                  >
                    {planLoading ? t("assistant.decomposing") : t("assistant.decompose")}
                  </button>
                  {planError ? <p className="text-xs font-medium text-red-700">{planError}</p> : null}
                  {subtasks && subtasks.length > 0 ? (
                    <div>
                      <p className="mb-2 text-xs font-semibold text-slate-700">{t("assistant.subtasks")}</p>
                      <ul className="space-y-2">
                        {subtasks.map((s, idx) => (
                          <li
                            key={`${idx}-${s.title}`}
                            className="rounded-vibe border border-slate-200 bg-slate-50 px-2 py-1.5"
                          >
                            <p className="font-semibold text-slate-900">{s.title}</p>
                            <p className="text-xs text-slate-600">{s.task}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}
            </>
          )}
        </section>
      ) : null}
      {fabHidden ? null : (
        <button
          type="button"
          className={`${pressableBase} pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full border border-vibe-line bg-vibe-purple text-lg font-bold text-white shadow-lg shadow-vibe-purple/35 hover:opacity-95 focus-visible:ring-offset-vibe-canvas`}
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setAssistantOpen((o) => !o)}
          title={t("assistant.open")}
        >
          <span className="sr-only">{t("assistant.open")}</span>
          AI
        </button>
      )}
    </div>
  );
}
