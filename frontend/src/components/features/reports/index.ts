// Reports Features Export
// Dynamic report generation and template management

export { default as ReportDetailModal } from './components/ReportDetailModal';
export { default as ReportFormModal } from './components/ReportFormModal';
export { default as ReportModal } from './components/ReportModal';
export { default as ReportsBoard } from './components/ReportsBoard';
export { default as ReportsList } from './components/ReportsList';
export { default as ReportsPage } from './components/ReportsPage';

// Report Builder Components are now in a separate feature
// Import from '@/components/features/report-builder' instead
export {
  TableSelector,
  FieldSelector,
  FilterBuilder,
  JoinBuilder,
  OrderByBuilder,
  QueryPreview,
  ReportBuilderPage,
} from '../report-builder';
