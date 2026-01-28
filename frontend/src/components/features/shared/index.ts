// Shared Components Export
// ProspecAI Design System and Reusable Components

// UI Components
export {
  Button,
  buttonVariants,
  type ButtonProps,
  Badge,
  ConfidenceBadge,
  StatusBadge,
  NotificationBadge,
  badgeVariants,
  type BadgeProps,
  Input,
  SearchInput,
  inputVariants,
  type InputProps,
  ViewToggle,
  type ViewMode,
  PageHeader,
  FilterPanel,
  type FilterField,
  BaseModal,
  ModalFooter,
  type ModalSize,
  ModalTabs,
  TabPanelContent,
  TabHint,
  type TabItem,
  ConfirmModal,
  DeleteConfirmation,
  Pagination,
  usePagination,
  type PaginationProps,
  TimelineView,
  type TimelineViewProps,
  type TimelineItem,
  TableView,
  type TableViewProps,
  type TableColumn,
  type SortDirection,
  ComboBox,
  type ComboBoxProps,
  type ComboBoxOption,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  StatCard,
  cardVariants,
  type CardProps,
  BoardView,
  KanbanBoard,
  DropdownMenu,
  EntitySearchInput,
  ErrorBoundary,
  Icon,
  LanguageToggle,
  SafeRender,
  ScrollArea,
  Tooltip,
} from './ui';

// Form Components
export {
  FormInput,
  FormSelect,
  FormTextarea,
  FormDatePicker,
  FormCurrencyInput,
  FormTagInput,
  FormSlider,
} from './forms';

// Layout Components
export {
  Sidebar,
  SidebarProvider,
  SidebarToggle,
  useSidebar,
  Header,
  ThemeProvider,
  useTheme,
  ThemeScript,
  InstituteSelectorDropdown,
  Navigation,
} from './layout';

// Analytics Components
export {
  AnalyticsKPIs,
  AnalyticsPipeline,
  AnalyticsTRL,
  AnalyticsTrends,
  AnalyticsPeriodSelector,
  AnalyticsExport,
  type AnalyticsPeriod,
} from './analytics';

// File Management
export { FileUpload } from './files';

// Messaging Components
export { ChatWidget, CollaboratorPresence } from './messaging';
