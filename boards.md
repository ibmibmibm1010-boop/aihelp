# Доски (frontend): структура после рефакторинга

Код страницы одной доски с канбаном вынесен из монолитного `BoardDetailPage.tsx` в каталог **`src/pages/boards/detail/`**. Список досок по-прежнему в `src/pages/boards/index.tsx`.

## Файлы

| Файл | Назначение |
|------|------------|
| `BoardDetailPage.tsx` | Маршрут `/boards/:boardId`: состояние, загрузка данных, DnD колонок/карточек, модалки |
| `detail/types.ts` | Тип `KanbanColumn` (UI-модель колонки) |
| `detail/constants.ts` | Префиксы DnD, `LOCAL_TASKS_ONLY`, подписи секций, опции статусов для форм |
| `detail/kanban-logic.ts` | Чистые функции: порядок задач/колонок, маппинг из API, локальная задача |
| `detail/board-detail-styles.ts` | Общие классы Tailwind для форм и кнопок на странице доски |
| `detail/board-detail-errors.ts` | `boardPageErrorMessage`, `normalizeHexColor` |
| `detail/kanban-ui.tsx` | Колонка, карточка задачи, зоны дропа, `SortableKanbanColumn`, overlay scale |
| `detail/board-detail-modals.tsx` | `CreateTaskModal`, `EditTaskModal`, `ColumnFormModal` |

## Зависимости

- API: `@shared/api` (`tasks`, `boards`, колонки, участники). Вложения к задачам: колонка `attachment_urls` и bucket `task-attachments` — см. `supabase/add_task_attachments.sql`, применение `npm run db:apply-task-attachments`.
- DnD: `@dnd-kit/core`, `@dnd-kit/sortable`.

При добавлении нового поведения канбана по возможности расширяйте `kanban-logic.ts` или `kanban-ui.tsx`, а не раздувайте `BoardDetailPage.tsx`.

## Локализация (ru / en)

- Конфигурация: `src/shared/i18n/config.ts` (по умолчанию **ru**, ключ в `localStorage`: `app-lang`).
- Файлы переводов: `src/shared/i18n/locales/ru.json`, `en.json`.
- Переключатель: компонент `LanguageSwitcher` в шапке приложения (мобильный header и панель над контентом на `lg+`), на лендинге — в header рядом с входом.
- Подключение: `import "@shared/i18n/config"` в `src/main.tsx` до рендера приложения.
