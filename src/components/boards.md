# Доски и канбан — кратко об изменениях

Документ суммирует доработки UI и логики страницы доски (`/boards/:boardId`) и связанного API. Подробная структура каталогов — в корневом [`boards.md`](../../boards.md).

## Внешний вид канбана

- Колонки и карточки приведены к **светлой теме проекта** (`vibe-canvas`, `vibe-line`, белые карточки, акцент фиолетовый), см. `detail/board-detail-styles.ts`.
- Холст секций и полоса колонок — светлые; заголовки секций в тон.

## Высота колонок

- Минимальная высота колонки и превью колонки при перетаскивании: **`min-h-[min(520px,60vh)]`** (`detail/kanban-ui.tsx`, `BoardDetailPage.tsx` в `DragOverlay`).

## Перетаскивание колонок

- Слот колонки при drag **не заменяется** пунктирным блоком: контент скрывается (`opacity: 0`), видимая копия в `DragOverlay` **без уменьшения масштаба**.
- Стратегия сортировки колонок в секции: **`rectSortingStrategy`** (удобнее при `flex-wrap`).
- Фиксированная ширина колонки (`flex-none`, `w-72`), плавный `transition` в `useSortable`.
- После **перестановки колонок** порядок сохраняется в API, локальное состояние обновляется через **`setColumns`** без полного **`load()`** (при ошибке — повторная загрузка).
- Завершение drag при «пустом» `over`: учитывается снимок порядка и **`lastOverIdRef`**, чтобы не терять позицию.

## Задачи: вложения (изображения)

- В БД: **`tasks.attachment_urls`** (`text[]`), миграция **`supabase/add_task_attachments.sql`**; применение: **`npm run db:apply-task-attachments`** (нужен `SUPABASE_ACCESS_TOKEN`).
- **Supabase Storage**: bucket **`task-attachments`**, публичные URL для превью; путь **`{board_id}/{task_id}/{uuid}.{ext}`**; RLS по **`user_can_access_board`** для первого сегмента пути.
- Клиент: **`uploadTaskAttachment`** (`shared/api/task-attachments.ts`), тип **`Task.attachment_urls`**, `createTask` / `updateTask` с откатом, если колонки ещё нет (как у `card_color`).
- **CreateTaskModal / EditTaskModal**: выбор изображений, превью, лимиты (тип, 5 МБ, до 8 файлов); в **`LOCAL_TASKS_ONLY`** новые файлы — **data URL** в памяти.
- На карточке и в overlay перетаскивания — миниатюры (**до 3 + «+N»**), ссылка открывается в новой вкладке.

## Локализация

- Строки для вложений и ошибок миграции — **`ru.json` / `en.json`** (`boards.detail.modals.*`, `errors.attachmentUrlsColumn`).

## Где смотреть код

| Область | Файлы |
|--------|--------|
| Колонки, карточки, DnD UI | `pages/boards/detail/kanban-ui.tsx` |
| Стили канбана | `pages/boards/detail/board-detail-styles.ts` |
| Состояние доски, DnD, модалки | `pages/boards/BoardDetailPage.tsx` |
| Модалки задач/колонок | `pages/boards/detail/board-detail-modals.tsx` |
| Порядок задач/колонок | `pages/boards/detail/kanban-logic.ts` |
| API задач и вложений | `shared/api/tasks.ts`, `shared/api/task-attachments.ts` |
