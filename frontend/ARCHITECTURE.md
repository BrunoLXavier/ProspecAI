# ProspecAI Frontend Architecture

> **Version:** 2.0 — Phase 8 Big-Bang Standardization  
> **Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Headless UI  
> **Last Updated:** 2026-02-11

---

## §1 — Directory Structure

```
frontend/src/
├── app/                          # Next.js App Router pages
│   ├── (entity)/page.tsx         # One page per entity (CRUD pattern)
│   ├── layout.tsx                # Root layout (providers, sidebar, top bar)
│   ├── layout-shell.tsx          # Authenticated shell layout
│   └── providers.tsx             # Provider chain
│
├── components/features/
│   ├── shared/ui/                # Shared UI components (single source of truth)
│   │   ├── BaseModal.tsx         # Low-level modal (Dialog + Transition)
│   │   ├── EntityModal.tsx       # CRUD modal (compose BaseModal + FormRenderer + useEntityForm)
│   │   ├── ConfirmModal.tsx      # Confirmation dialog (compose BaseModal)
│   │   ├── DeleteConfirmation.tsx# Inline delete confirmation
│   │   ├── FormRenderer.tsx      # → Re-export from form-registry
│   │   ├── PageHeader.tsx        # Page title + subtitle + view toggle + action
│   │   ├── FilterPanel.tsx       # Configurable filter bar
│   │   ├── Pagination.tsx        # Pagination + usePagination hook
│   │   ├── ConfigurableStatisticsBar.tsx  # Module-based statistics
│   │   ├── TableView.tsx         # Generic sortable/paginated table
│   │   ├── TimelineView.tsx      # Vertical timeline
│   │   ├── ViewToggle.tsx        # List/Board/Timeline/Table switcher
│   │   └── SafeRender.tsx        # Error boundary wrapper
│   │
│   └── (entity)/components/      # Entity-specific board/views only
│       └── FundingBoard.tsx      # Example: kanban board for funding
│
├── contexts/
│   ├── AuthContext.tsx            # Auth state + selectedInstitutes
│   ├── ACLContext.tsx             # Permission enforcement
│   ├── ToastContext.tsx           # Centralized toast notifications
│   └── PreferencesContext.tsx     # User preferences (page sizes, layout)
│
├── hooks/
│   ├── use-crud-page.ts          # Orchestrator: view, filters, pagination, modal, data
│   ├── use-entity-form.ts        # Form state: useForm + zodResolver + mutations + toast
│   └── use-debounce.ts           # Debounce utility
│
├── lib/
│   ├── api-client.ts             # Axios instance + camel↔snake interceptors
│   ├── case-transform.ts         # camelCase ↔ snake_case utilities
│   └── form-registry/            # Entity definitions (single source of truth)
│       ├── types.ts              # EntityFormDefinition, FieldDefinition, etc.
│       ├── build-zod-schema.ts   # Dynamic Zod schema builder from definition + t()
│       ├── FormRenderer.tsx      # Auto-renders form from definition
│       ├── definitions/          # One .definition.ts per entity
│       │   ├── client.definition.ts
│       │   ├── funding.definition.ts
│       │   ├── opportunity.definition.ts
│       │   ├── proposal.definition.ts
│       │   ├── portfolio-project.definition.ts
│       │   ├── team.definition.ts
│       │   ├── infrastructure.definition.ts
│       │   ├── institute.definition.ts
│       │   ├── report.definition.ts
│       │   ├── user.definition.ts
│       │   ├── communication.definition.ts
│       │   ├── feedback.definition.ts
│       │   ├── ingestion.definition.ts
│       │   └── index.ts          # Barrel: auto-registers all definitions
│       └── index.ts              # Barrel: exports types + registry + FormRenderer
│
├── locales/                      # i18n JSON files
│   ├── pt-BR.json                # Primary locale (source of truth)
│   ├── en-US.json                # English
│   └── es-ES.json                # Spanish
│
└── scripts/
    └── validate-i18n.js          # Auto-sync locale keys across all 3 files
```

---

## §2 — Core Patterns

### §2.1 — Entity Definition (Form Registry)

Every CRUD entity **must** have a `*.definition.ts` file in `lib/form-registry/definitions/`.
This is the **single source of truth** for:

- Field names, types, labels (i18n keys), validation rules
- Tab layout and grid configuration
- Filter definitions
- Default values
- API endpoint and ACL resource mapping

```typescript
// Example: client.definition.ts
export const clientDefinition = registerEntity<ClientFormData>({
  entityKey: 'crm',
  i18nNamespace: 'crm',
  resource: 'crm',
  apiEndpoint: '/api/v1/crm/clients',
  statisticsModule: 'crm',
  gridCols: 2,
  defaultValues: { ... },
  tabs: [ ... ],
  fields: [ ... ],
  filters: [ ... ],
});
```

### §2.2 — CRUD Page Pattern

All standard CRUD pages follow this pattern:

```typescript
export default function EntityPage() {
  const t = useTranslations('entity');
  const state = useCrudPage<Entity, Filters>({
    queryKey: 'entity',
    definition: entityDefinition,
    initialFilters,
    fetchFn: async ({ filters }) => { ... },
  });

  return (
    <div className="space-y-6">
      <PageHeader ... />
      <EntityModal<FormData> definition={def} entity={state.selectedItem} ... />
      <ConfigurableStatisticsBar module="entity" data={state.allData} />
      <FilterPanel ... />
      {/* 4 view modes: list, board, timeline, table */}
    </div>
  );
}
```

### §2.3 — EntityModal

Composes `BaseModal` + `FormRenderer` + `useEntityForm`. Supports:

- **create / edit / view** modes
- Tabs from definition
- Slots: `beforeFields`, `afterFields`, `customTabs`, `headerExtra`, `footerExtra`
- Delete confirmation built-in
- Server error banner
- ACL checks per action (create/update/delete)

### §2.4 — Toast Notifications

All user-facing feedback uses `useToast()` from `ToastContext`:

```typescript
const { success, error } = useToast();
success(t('toast.createSuccess'));
```

Never use `alert()`, `window.confirm()`, or ad-hoc toast implementations.

### §2.5 — ACL (Access Control)

```typescript
const { hasPermission } = usePermission();
if (hasPermission('funding', 'create')) { ... }

// Or declarative:
<CanAccess resource="funding" action="update">
  <EditButton />
</CanAccess>
```

---

## §3 — Prohibited Patterns

| ❌ Prohibited | ✅ Required |
|---|---|
| Direct `Dialog`/`Transition` import from `@headlessui/react` | Use `BaseModal` / `EntityModal` / `ConfirmModal` |
| Hardcoded UI strings | Use `t()` from `next-intl` |
| Manual `useState` for form fields | Use `useEntityForm` with definition |
| Manual modal state (isOpen, item, mode) | Use `useCrudPage` which manages modal state |
| `alert()` / `window.confirm()` | Use `useToast()` / `ConfirmModal` |
| Inline Pydantic schemas in routers | Extract to `domain/schemas/` |
| Physical `DELETE` in database | Soft delete via `deleted_at` flag |
| `isLoading` from React Query v5 | Use `isPending` (TanStack v5 API) |

---

## §4 — Adding a New Entity (Checklist)

1. **Backend**: Create entity in `domain/entities/`, schema in `domain/schemas/`, repository in `adapters/repositories/`, use case in `use_cases/`, router in `routers/`
2. **Definition**: Create `lib/form-registry/definitions/entity.definition.ts` — fields, tabs, filters, validation
3. **i18n**: Add entity namespace to `pt-BR.json`, run `validate-i18n.js` to sync en-US/es-ES
4. **Page**: Create `app/entity/page.tsx` using `useCrudPage` + `EntityModal` pattern
5. **Board** (optional): Create `components/features/entity/components/EntityBoard.tsx`
6. **Register**: Export definition from `definitions/index.ts`

---

## §5 — Provider Chain

```
<NextIntlProvider>
  <QueryClientProvider>
    <AuthProvider>
      <ACLProvider>
        <PreferencesProvider>
          <ToastProvider>
            <LayoutShell>
              {children}
            </LayoutShell>
          </ToastProvider>
        </PreferencesProvider>
      </ACLProvider>
    </AuthProvider>
  </QueryClientProvider>
</NextIntlProvider>
```

---

## §6 — Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 14.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 3.x |
| Components | Headless UI | 2.x |
| Forms | react-hook-form + Zod | 7.x + 3.x |
| Data Fetching | TanStack React Query | 5.x |
| i18n | next-intl | 3.x |
| Icons | Heroicons | 2.x |
| Charts | Chart.js + react-chartjs-2 | 4.x |

---

## §7 — Requirement Traceability

| RF | Module | Description |
|---|---|---|
| RF-01 | Ingestion, PII Analysis | Data ingestion + LGPD NER agent |
| RF-02 | Funding | Funding source/edital management (TRL 1-9) |
| RF-03 | Portfolio, Infrastructure, Teams | Institutional portfolio + lessons learned |
| RF-04 | CRM | Intelligent CRM (CNPJ auto-fill) |
| RF-05 | Opportunities | Pipeline (Intelligence → Post-sale Kanban) |
| RF-06 | Matching | Matching algorithms + adherence analysis |
| RF-07 | Dashboard, Analytics | Dashboards + explainable chatbot |
| RF-08 | Proposals | Proposal repository + real-time collaboration |
| RF-09 | Reports | Custom reports + export (MinIO presigned URLs) |

---

## §8 — Exception Pages

Some pages have specialized workflows that don't fit the standard CRUD pattern:

| Page | Reason |
|---|---|
| Communications | Thread-based messaging with WebSocket, media recording |
| Ingestion | File upload, drag-and-drop, WebSocket live progress |
| PII Analysis | LGPD review workflow with bulk actions |
| Feedback | Annotation canvas, screenshot capture |
| Notifications | Read/dismiss pattern (not CRUD) |
| Translations | Admin i18n management with import/export |
| Dashboard | Analytics widgets, no CRUD |
| Matching | Algorithm execution, not standard CRUD |

These pages maintain their custom implementations but still use shared UI components (`PageHeader`, `FilterPanel`, `Pagination`, `TableView`, `TimelineView`).
