/** Общие классы для интерактивных кнопок и ссылок (hover / active / focus-visible). */

export const pressableMotion =
  "transition duration-200 ease-out motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100";

export const pressableLift =
  "hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]";

export const pressableShadow = "hover:shadow-md";

export const pressableFocusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vibe-purple/40 focus-visible:ring-offset-2 focus-visible:ring-offset-vibe-canvas";

export const pressableBase = `${pressableMotion} ${pressableLift} ${pressableShadow} ${pressableFocusRing}`;

/** Нефокусируемые карточки: заметный подъём и свечение при наведении. */
export const hoverLiftCard =
  "transition duration-300 ease-out motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-lg hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-vibe-purple/25 hover:border-vibe-purple/35 hover:bg-white/95 active:duration-150 active:translate-y-0 active:scale-[0.995]";
