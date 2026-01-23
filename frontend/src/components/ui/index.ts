// UI Components Export
// ProspecAI Design System

export { Button, buttonVariants, type ButtonProps } from './Button';
export { 
  Card, 
  CardHeader, 
  CardContent, 
  CardFooter, 
  StatCard, 
  cardVariants,
  type CardProps 
} from './Card';
export { 
  Badge, 
  ConfidenceBadge, 
  StatusBadge, 
  NotificationBadge, 
  badgeVariants,
  type BadgeProps 
} from './Badge';
export { Input, SearchInput, inputVariants, type InputProps } from './Input';
export { default as ViewToggle, type ViewMode } from './ViewToggle';
export { default as PageHeader } from './PageHeader';
export { default as FilterPanel, type FilterField } from './FilterPanel';

// Modal Components
export { default as BaseModal, ModalFooter } from './BaseModal';
export type { ModalSize } from './BaseModal';
export { default as ModalTabs, TabPanelContent, TabHint } from './ModalTabs';
export type { TabItem } from './ModalTabs';
export { default as ConfirmModal } from './ConfirmModal';
export { default as DeleteConfirmation } from './DeleteConfirmation';

// New Standardized Components (FASE 1-3)
// Pagination with dark mode, URL persistence, React Query integration
export { default as Pagination, usePagination } from './Pagination';
export type { PaginationProps } from './Pagination';

// TimelineView with vertical connections
export { default as TimelineView } from './TimelineView';
export type { TimelineViewProps, TimelineItem } from './TimelineView';

// TableView with sorting, filtering, pagination
export { default as TableView } from './TableView';
export type { TableViewProps, TableColumn, SortDirection } from './TableView';

// ComboBox with Headless UI
export { default as ComboBox } from './ComboBox';
export type { ComboBoxProps, ComboBoxOption } from './ComboBox';

// ScrollArea with custom scrollbars
export { default as ScrollArea } from './ScrollArea';
export type { ScrollAreaProps } from './ScrollArea';

// Tooltip with positioning and dark mode
export { default as Tooltip } from './Tooltip';
export type { TooltipProps, TooltipPosition } from './Tooltip';

// DropdownMenu with Headless UI
export { default as DropdownMenu } from './DropdownMenu';
export type { DropdownMenuProps, DropdownMenuItem, DropdownMenuGroup } from './DropdownMenu';

// Icon wrapper with dark/light theme support
export { default as Icon, IconBadge } from './Icon';
export type { IconProps, IconBadgeProps } from './Icon';

// Existing View Components
export { default as KanbanBoard } from './KanbanBoard';
