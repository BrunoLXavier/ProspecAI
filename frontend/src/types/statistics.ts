// Statistics Configuration Types
// Implements configurable statistics system for all modules

/**
 * Available modules that support statistics
 */
export type StatisticsModule = 
  | 'funding'
  | 'portfolio'
  | 'crm'
  | 'opportunities'
  | 'proposals'
  | 'ingestion'
  | 'pii-analysis'
  | 'reports'
  | 'translations';

/**
 * User roles for permission-based statistics visibility
 */
export type UserRole = 'admin' | 'manager' | 'analyst' | 'viewer';

/**
 * Statistic value type
 */
export type StatValueType = 'number' | 'currency' | 'percentage' | 'text' | 'date' | 'duration';

/**
 * Statistic color options
 */
export type StatColor = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

/**
 * Statistic category for grouping
 */
export type StatCategory = 
  | 'overview'      // General counts and totals
  | 'financial'     // Money-related metrics
  | 'performance'   // Rates, averages, efficiency
  | 'timeline'      // Date-related metrics
  | 'distribution'  // Breakdown by category
  | 'risk'          // Risk-related metrics
  | 'ai';           // AI/ML related metrics

/**
 * Definition of a single statistic configuration
 */
export interface StatisticDefinition {
  id: string;
  key: string;
  module: StatisticsModule;
  labelKey: string;           // i18n key for the label
  descriptionKey?: string;    // i18n key for tooltip description
  category: StatCategory;
  valueType: StatValueType;
  defaultColor: StatColor;
  icon: string;               // Heroicon name
  defaultVisible: boolean;
  sortOrder: number;
  // Calculation metadata
  aggregation?: 'sum' | 'count' | 'avg' | 'min' | 'max' | 'rate';
  sourceField?: string;       // Field to aggregate from
  filterField?: string;       // Field to filter by
  filterValue?: string;       // Value to filter
}

/**
 * User preferences for statistics visibility
 */
export interface UserStatisticsPreferences {
  userId: string | null;
  module: StatisticsModule;
  visibleStatIds: string[];
  orderOverride?: Record<string, number>;
  reorderEnabled?: boolean;
  updatedAt: string;
}

/**
 * Profile-level permissions for statistics (admin-configured)
 */
export interface ProfileStatisticsPermissions {
  profileId: string;
  role: UserRole;
  module: StatisticsModule;
  allowedStatIds: string[];   // Which stats this profile CAN see
  requiredStatIds: string[];  // Which stats MUST always be visible
  updatedAt: string;
  updatedBy: string;
}

/**
 * Runtime statistic item with computed value
 */
export interface StatisticItem {
  definition: StatisticDefinition;
  value: number | string;
  formattedValue: string;
  subValue?: string;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
  };
  isVisible: boolean;
  isAllowed: boolean;
}

/**
 * Statistics configuration response from API
 */
export interface StatisticsConfigResponse {
  module: StatisticsModule;
  definitions: StatisticDefinition[];
  userPreferences: UserStatisticsPreferences | null;
  profilePermissions: ProfileStatisticsPermissions | null;
}

// =============================================================================
// Statistic Definitions by Module
// =============================================================================

export const FUNDING_STATISTICS: StatisticDefinition[] = [
  // Overview
  { id: 'funding-total', key: 'total', module: 'funding', labelKey: 'stats.total', category: 'overview', valueType: 'number', defaultColor: 'primary', icon: 'FolderOpenIcon', defaultVisible: true, sortOrder: 1, aggregation: 'count' },
  { id: 'funding-open', key: 'open', module: 'funding', labelKey: 'stats.open', category: 'overview', valueType: 'number', defaultColor: 'success', icon: 'CheckBadgeIcon', defaultVisible: true, sortOrder: 2, aggregation: 'count', filterField: 'status', filterValue: 'open' },
  { id: 'funding-closed', key: 'closed', module: 'funding', labelKey: 'stats.closed', category: 'overview', valueType: 'number', defaultColor: 'default', icon: 'XMarkIcon', defaultVisible: false, sortOrder: 3, aggregation: 'count', filterField: 'status', filterValue: 'closed' },
  { id: 'funding-suspended', key: 'suspended', module: 'funding', labelKey: 'stats.suspended', category: 'overview', valueType: 'number', defaultColor: 'warning', icon: 'PauseIcon', defaultVisible: false, sortOrder: 4, aggregation: 'count', filterField: 'status', filterValue: 'suspended' },
  
  // Financial
  { id: 'funding-total-value', key: 'totalValue', module: 'funding', labelKey: 'stats.totalValue', category: 'financial', valueType: 'currency', defaultColor: 'info', icon: 'CurrencyDollarIcon', defaultVisible: true, sortOrder: 10, aggregation: 'sum', sourceField: 'totalAmount' },
  { id: 'funding-avg-value', key: 'avgValue', module: 'funding', labelKey: 'stats.avgValue', category: 'financial', valueType: 'currency', defaultColor: 'info', icon: 'CalculatorIcon', defaultVisible: false, sortOrder: 11, aggregation: 'avg', sourceField: 'totalAmount' },
  { id: 'funding-max-value', key: 'maxValue', module: 'funding', labelKey: 'stats.maxValue', category: 'financial', valueType: 'currency', defaultColor: 'success', icon: 'ArrowTrendingUpIcon', defaultVisible: false, sortOrder: 12, aggregation: 'max', sourceField: 'totalAmount' },
  { id: 'funding-min-value', key: 'minValue', module: 'funding', labelKey: 'stats.minValue', category: 'financial', valueType: 'currency', defaultColor: 'default', icon: 'ArrowTrendingDownIcon', defaultVisible: false, sortOrder: 13, aggregation: 'min', sourceField: 'totalAmount' },
  
  // Distribution by Type
  { id: 'funding-grants', key: 'grants', module: 'funding', labelKey: 'stats.grants', category: 'distribution', valueType: 'number', defaultColor: 'primary', icon: 'GiftIcon', defaultVisible: false, sortOrder: 20, aggregation: 'count', filterField: 'instrumentType', filterValue: 'grant' },
  { id: 'funding-subsidies', key: 'subsidies', module: 'funding', labelKey: 'stats.subsidies', category: 'distribution', valueType: 'number', defaultColor: 'info', icon: 'BanknotesIcon', defaultVisible: false, sortOrder: 21, aggregation: 'count', filterField: 'instrumentType', filterValue: 'subsidy' },
  { id: 'funding-credits', key: 'credits', module: 'funding', labelKey: 'stats.credits', category: 'distribution', valueType: 'number', defaultColor: 'warning', icon: 'CreditCardIcon', defaultVisible: false, sortOrder: 22, aggregation: 'count', filterField: 'instrumentType', filterValue: 'credit' },
  { id: 'funding-equity', key: 'equity', module: 'funding', labelKey: 'stats.equity', category: 'distribution', valueType: 'number', defaultColor: 'success', icon: 'BuildingOfficeIcon', defaultVisible: false, sortOrder: 23, aggregation: 'count', filterField: 'instrumentType', filterValue: 'equity' },
  
  // Timeline
  { id: 'funding-expiring-7d', key: 'expiring7d', module: 'funding', labelKey: 'stats.expiring7d', category: 'timeline', valueType: 'number', defaultColor: 'danger', icon: 'ClockIcon', defaultVisible: true, sortOrder: 30 },
  { id: 'funding-expiring-30d', key: 'expiring30d', module: 'funding', labelKey: 'stats.expiring30d', category: 'timeline', valueType: 'number', defaultColor: 'warning', icon: 'CalendarDaysIcon', defaultVisible: false, sortOrder: 31 },
  { id: 'funding-new-this-month', key: 'newThisMonth', module: 'funding', labelKey: 'stats.newThisMonth', category: 'timeline', valueType: 'number', defaultColor: 'success', icon: 'SparklesIcon', defaultVisible: false, sortOrder: 32 },
  
  // TRL Distribution
  { id: 'funding-trl-low', key: 'trlLow', module: 'funding', labelKey: 'stats.trlLow', descriptionKey: 'stats.trlLowDesc', category: 'distribution', valueType: 'number', defaultColor: 'info', icon: 'BeakerIcon', defaultVisible: false, sortOrder: 40 },
  { id: 'funding-trl-mid', key: 'trlMid', module: 'funding', labelKey: 'stats.trlMid', descriptionKey: 'stats.trlMidDesc', category: 'distribution', valueType: 'number', defaultColor: 'warning', icon: 'CpuChipIcon', defaultVisible: false, sortOrder: 41 },
  { id: 'funding-trl-high', key: 'trlHigh', module: 'funding', labelKey: 'stats.trlHigh', descriptionKey: 'stats.trlHighDesc', category: 'distribution', valueType: 'number', defaultColor: 'success', icon: 'RocketLaunchIcon', defaultVisible: false, sortOrder: 42 },
  
  // AI Metrics
  { id: 'funding-avg-confidence', key: 'avgConfidence', module: 'funding', labelKey: 'stats.avgConfidence', category: 'ai', valueType: 'percentage', defaultColor: 'primary', icon: 'SparklesIcon', defaultVisible: false, sortOrder: 50, aggregation: 'avg', sourceField: 'aiConfidenceScore' },
  { id: 'funding-high-confidence', key: 'highConfidence', module: 'funding', labelKey: 'stats.highConfidence', descriptionKey: 'stats.highConfidenceDesc', category: 'ai', valueType: 'number', defaultColor: 'success', icon: 'CheckCircleIcon', defaultVisible: false, sortOrder: 51 },
];

export const PORTFOLIO_STATISTICS: StatisticDefinition[] = [
  // Overview
  { id: 'portfolio-total', key: 'total', module: 'portfolio', labelKey: 'stats.total', category: 'overview', valueType: 'number', defaultColor: 'primary', icon: 'FolderIcon', defaultVisible: true, sortOrder: 1, aggregation: 'count' },
  { id: 'portfolio-active', key: 'active', module: 'portfolio', labelKey: 'stats.active', category: 'overview', valueType: 'number', defaultColor: 'success', icon: 'PlayCircleIcon', defaultVisible: true, sortOrder: 2, aggregation: 'count', filterField: 'status', filterValue: 'active' },
  { id: 'portfolio-planning', key: 'planning', module: 'portfolio', labelKey: 'stats.planning', category: 'overview', valueType: 'number', defaultColor: 'info', icon: 'ClipboardDocumentListIcon', defaultVisible: false, sortOrder: 3, aggregation: 'count', filterField: 'status', filterValue: 'planning' },
  { id: 'portfolio-completed', key: 'completed', module: 'portfolio', labelKey: 'stats.completed', category: 'overview', valueType: 'number', defaultColor: 'default', icon: 'CheckCircleIcon', defaultVisible: true, sortOrder: 4, aggregation: 'count', filterField: 'status', filterValue: 'completed' },
  { id: 'portfolio-suspended', key: 'suspended', module: 'portfolio', labelKey: 'stats.suspended', category: 'overview', valueType: 'number', defaultColor: 'warning', icon: 'PauseCircleIcon', defaultVisible: false, sortOrder: 5, aggregation: 'count', filterField: 'status', filterValue: 'suspended' },
  
  // Financial
  { id: 'portfolio-total-budget', key: 'totalBudget', module: 'portfolio', labelKey: 'stats.totalBudget', category: 'financial', valueType: 'currency', defaultColor: 'warning', icon: 'CurrencyDollarIcon', defaultVisible: true, sortOrder: 10, aggregation: 'sum', sourceField: 'budget' },
  { id: 'portfolio-avg-budget', key: 'avgBudget', module: 'portfolio', labelKey: 'stats.avgBudget', category: 'financial', valueType: 'currency', defaultColor: 'info', icon: 'CalculatorIcon', defaultVisible: false, sortOrder: 11, aggregation: 'avg', sourceField: 'budget' },
  { id: 'portfolio-active-budget', key: 'activeBudget', module: 'portfolio', labelKey: 'stats.activeBudget', category: 'financial', valueType: 'currency', defaultColor: 'success', icon: 'BanknotesIcon', defaultVisible: false, sortOrder: 12 },
  
  // Performance
  { id: 'portfolio-avg-trl', key: 'avgTrl', module: 'portfolio', labelKey: 'stats.avgTrl', category: 'performance', valueType: 'number', defaultColor: 'default', icon: 'ChartBarIcon', defaultVisible: true, sortOrder: 20, aggregation: 'avg', sourceField: 'trl' },
  { id: 'portfolio-completion-rate', key: 'completionRate', module: 'portfolio', labelKey: 'stats.completionRate', category: 'performance', valueType: 'percentage', defaultColor: 'success', icon: 'CheckBadgeIcon', defaultVisible: false, sortOrder: 21 },
  { id: 'portfolio-on-track', key: 'onTrack', module: 'portfolio', labelKey: 'stats.onTrack', category: 'performance', valueType: 'number', defaultColor: 'success', icon: 'ArrowTrendingUpIcon', defaultVisible: false, sortOrder: 22 },
  { id: 'portfolio-at-risk', key: 'atRisk', module: 'portfolio', labelKey: 'stats.atRisk', category: 'risk', valueType: 'number', defaultColor: 'danger', icon: 'ExclamationTriangleIcon', defaultVisible: false, sortOrder: 23 },
  
  // Timeline
  { id: 'portfolio-avg-duration', key: 'avgDuration', module: 'portfolio', labelKey: 'stats.avgDuration', category: 'timeline', valueType: 'duration', defaultColor: 'info', icon: 'ClockIcon', defaultVisible: false, sortOrder: 30 },
  { id: 'portfolio-ending-soon', key: 'endingSoon', module: 'portfolio', labelKey: 'stats.endingSoon', category: 'timeline', valueType: 'number', defaultColor: 'warning', icon: 'CalendarDaysIcon', defaultVisible: false, sortOrder: 31 },
  { id: 'portfolio-starting-soon', key: 'startingSoon', module: 'portfolio', labelKey: 'stats.startingSoon', category: 'timeline', valueType: 'number', defaultColor: 'info', icon: 'CalendarIcon', defaultVisible: false, sortOrder: 32 },
  
  // Distribution by Area
  { id: 'portfolio-industry40', key: 'industry40', module: 'portfolio', labelKey: 'stats.industry40', category: 'distribution', valueType: 'number', defaultColor: 'primary', icon: 'CpuChipIcon', defaultVisible: false, sortOrder: 40 },
  { id: 'portfolio-sustainability', key: 'sustainability', module: 'portfolio', labelKey: 'stats.sustainability', category: 'distribution', valueType: 'number', defaultColor: 'success', icon: 'GlobeAmericasIcon', defaultVisible: false, sortOrder: 41 },
  { id: 'portfolio-health', key: 'health', module: 'portfolio', labelKey: 'stats.health', category: 'distribution', valueType: 'number', defaultColor: 'danger', icon: 'HeartIcon', defaultVisible: false, sortOrder: 42 },
  { id: 'portfolio-agribusiness', key: 'agribusiness', module: 'portfolio', labelKey: 'stats.agribusiness', category: 'distribution', valueType: 'number', defaultColor: 'warning', icon: 'SunIcon', defaultVisible: false, sortOrder: 43 },
  
  // TRL Distribution
  { id: 'portfolio-trl-research', key: 'trlResearch', module: 'portfolio', labelKey: 'stats.trlResearch', descriptionKey: 'stats.trl13Desc', category: 'distribution', valueType: 'number', defaultColor: 'info', icon: 'BeakerIcon', defaultVisible: false, sortOrder: 50 },
  { id: 'portfolio-trl-development', key: 'trlDevelopment', module: 'portfolio', labelKey: 'stats.trlDevelopment', descriptionKey: 'stats.trl46Desc', category: 'distribution', valueType: 'number', defaultColor: 'warning', icon: 'WrenchScrewdriverIcon', defaultVisible: false, sortOrder: 51 },
  { id: 'portfolio-trl-deployment', key: 'trlDeployment', module: 'portfolio', labelKey: 'stats.trlDeployment', descriptionKey: 'stats.trl79Desc', category: 'distribution', valueType: 'number', defaultColor: 'success', icon: 'RocketLaunchIcon', defaultVisible: false, sortOrder: 52 },
];

export const CRM_STATISTICS: StatisticDefinition[] = [
  // Overview
  { id: 'crm-total', key: 'total', module: 'crm', labelKey: 'stats.total', category: 'overview', valueType: 'number', defaultColor: 'primary', icon: 'UsersIcon', defaultVisible: true, sortOrder: 1, aggregation: 'count' },
  { id: 'crm-ai-enriched', key: 'aiEnriched', module: 'crm', labelKey: 'stats.aiEnriched', category: 'ai', valueType: 'number', defaultColor: 'success', icon: 'SparklesIcon', defaultVisible: true, sortOrder: 2 },
  { id: 'crm-new-this-month', key: 'newThisMonth', module: 'crm', labelKey: 'stats.newThisMonth', category: 'timeline', valueType: 'number', defaultColor: 'info', icon: 'UserPlusIcon', defaultVisible: false, sortOrder: 3 },
  
  // Financial
  { id: 'crm-total-revenue', key: 'totalRevenue', module: 'crm', labelKey: 'stats.totalRevenue', category: 'financial', valueType: 'currency', defaultColor: 'info', icon: 'CurrencyDollarIcon', defaultVisible: true, sortOrder: 10, aggregation: 'sum', sourceField: 'annualRevenue' },
  { id: 'crm-avg-revenue', key: 'avgRevenue', module: 'crm', labelKey: 'stats.avgRevenue', category: 'financial', valueType: 'currency', defaultColor: 'default', icon: 'CalculatorIcon', defaultVisible: false, sortOrder: 11, aggregation: 'avg', sourceField: 'annualRevenue' },
  { id: 'crm-potential-value', key: 'potentialValue', module: 'crm', labelKey: 'stats.potentialValue', category: 'financial', valueType: 'currency', defaultColor: 'success', icon: 'ArrowTrendingUpIcon', defaultVisible: false, sortOrder: 12 },
  
  // Distribution by Maturity
  { id: 'crm-startups', key: 'startups', module: 'crm', labelKey: 'stats.startups', category: 'distribution', valueType: 'number', defaultColor: 'info', icon: 'RocketLaunchIcon', defaultVisible: false, sortOrder: 20, aggregation: 'count', filterField: 'maturityLevel', filterValue: 'startup' },
  { id: 'crm-growth', key: 'growth', module: 'crm', labelKey: 'stats.growth', category: 'distribution', valueType: 'number', defaultColor: 'success', icon: 'ArrowTrendingUpIcon', defaultVisible: false, sortOrder: 21, aggregation: 'count', filterField: 'maturityLevel', filterValue: 'growth' },
  { id: 'crm-mature', key: 'mature', module: 'crm', labelKey: 'stats.mature', category: 'distribution', valueType: 'number', defaultColor: 'primary', icon: 'BuildingOffice2Icon', defaultVisible: false, sortOrder: 22, aggregation: 'count', filterField: 'maturityLevel', filterValue: 'mature' },
  
  // Distribution by Segment
  { id: 'crm-technology', key: 'technology', module: 'crm', labelKey: 'stats.technology', category: 'distribution', valueType: 'number', defaultColor: 'primary', icon: 'CpuChipIcon', defaultVisible: false, sortOrder: 30 },
  { id: 'crm-manufacturing', key: 'manufacturing', module: 'crm', labelKey: 'stats.manufacturing', category: 'distribution', valueType: 'number', defaultColor: 'warning', icon: 'WrenchScrewdriverIcon', defaultVisible: false, sortOrder: 31 },
  { id: 'crm-services', key: 'services', module: 'crm', labelKey: 'stats.services', category: 'distribution', valueType: 'number', defaultColor: 'info', icon: 'BriefcaseIcon', defaultVisible: false, sortOrder: 32 },
  { id: 'crm-agribusiness', key: 'agribusiness', module: 'crm', labelKey: 'stats.agribusiness', category: 'distribution', valueType: 'number', defaultColor: 'success', icon: 'SunIcon', defaultVisible: false, sortOrder: 33 },
  
  // Performance
  { id: 'crm-conversion-rate', key: 'conversionRate', module: 'crm', labelKey: 'stats.conversionRate', category: 'performance', valueType: 'percentage', defaultColor: 'success', icon: 'ChartBarIcon', defaultVisible: false, sortOrder: 40 },
  { id: 'crm-avg-deal-size', key: 'avgDealSize', module: 'crm', labelKey: 'stats.avgDealSize', category: 'performance', valueType: 'currency', defaultColor: 'info', icon: 'BanknotesIcon', defaultVisible: false, sortOrder: 41 },
  { id: 'crm-active-opportunities', key: 'activeOpportunities', module: 'crm', labelKey: 'stats.activeOpportunities', category: 'performance', valueType: 'number', defaultColor: 'warning', icon: 'LightBulbIcon', defaultVisible: false, sortOrder: 42 },
  
  // AI Metrics
  { id: 'crm-avg-confidence', key: 'avgConfidence', module: 'crm', labelKey: 'stats.avgConfidence', category: 'ai', valueType: 'percentage', defaultColor: 'primary', icon: 'SparklesIcon', defaultVisible: false, sortOrder: 50, aggregation: 'avg', sourceField: 'aiConfidenceScore' },
  { id: 'crm-pending-enrichment', key: 'pendingEnrichment', module: 'crm', labelKey: 'stats.pendingEnrichment', category: 'ai', valueType: 'number', defaultColor: 'warning', icon: 'ClockIcon', defaultVisible: false, sortOrder: 51 },
];

export const OPPORTUNITIES_STATISTICS: StatisticDefinition[] = [
  // Overview
  { id: 'opp-total', key: 'total', module: 'opportunities', labelKey: 'stats.total', category: 'overview', valueType: 'number', defaultColor: 'primary', icon: 'ChartBarIcon', defaultVisible: true, sortOrder: 1, aggregation: 'count' },
  { id: 'opp-active', key: 'active', module: 'opportunities', labelKey: 'stats.active', category: 'overview', valueType: 'number', defaultColor: 'success', icon: 'PlayIcon', defaultVisible: false, sortOrder: 2, aggregation: 'count', filterField: 'status', filterValue: 'active' },
  { id: 'opp-won', key: 'won', module: 'opportunities', labelKey: 'stats.won', category: 'overview', valueType: 'number', defaultColor: 'success', icon: 'TrophyIcon', defaultVisible: false, sortOrder: 3, aggregation: 'count', filterField: 'stage', filterValue: 'won' },
  { id: 'opp-lost', key: 'lost', module: 'opportunities', labelKey: 'stats.lost', category: 'overview', valueType: 'number', defaultColor: 'danger', icon: 'XCircleIcon', defaultVisible: false, sortOrder: 4, aggregation: 'count', filterField: 'stage', filterValue: 'lost' },
  
  // Financial
  { id: 'opp-total-value', key: 'totalValue', module: 'opportunities', labelKey: 'stats.totalValue', category: 'financial', valueType: 'currency', defaultColor: 'success', icon: 'CurrencyDollarIcon', defaultVisible: true, sortOrder: 10, aggregation: 'sum', sourceField: 'estimated_value' },
  { id: 'opp-weighted-value', key: 'weightedValue', module: 'opportunities', labelKey: 'stats.weightedValue', descriptionKey: 'stats.weightedValueDesc', category: 'financial', valueType: 'currency', defaultColor: 'info', icon: 'ScaleIcon', defaultVisible: false, sortOrder: 11 },
  { id: 'opp-avg-deal', key: 'avgDeal', module: 'opportunities', labelKey: 'stats.avgDeal', category: 'financial', valueType: 'currency', defaultColor: 'default', icon: 'CalculatorIcon', defaultVisible: false, sortOrder: 12, aggregation: 'avg', sourceField: 'estimated_value' },
  { id: 'opp-won-value', key: 'wonValue', module: 'opportunities', labelKey: 'stats.wonValue', category: 'financial', valueType: 'currency', defaultColor: 'success', icon: 'BanknotesIcon', defaultVisible: false, sortOrder: 13 },
  
  // Performance
  { id: 'opp-conversion-rate', key: 'conversionRate', module: 'opportunities', labelKey: 'stats.conversionRate', category: 'performance', valueType: 'percentage', defaultColor: 'info', icon: 'TrophyIcon', defaultVisible: true, sortOrder: 20 },
  { id: 'opp-avg-probability', key: 'avgProbability', module: 'opportunities', labelKey: 'stats.avgProbability', category: 'performance', valueType: 'percentage', defaultColor: 'warning', icon: 'ChartPieIcon', defaultVisible: false, sortOrder: 21, aggregation: 'avg', sourceField: 'probability' },
  { id: 'opp-win-rate', key: 'winRate', module: 'opportunities', labelKey: 'stats.winRate', category: 'performance', valueType: 'percentage', defaultColor: 'success', icon: 'ArrowTrendingUpIcon', defaultVisible: false, sortOrder: 22 },
  { id: 'opp-avg-cycle', key: 'avgCycle', module: 'opportunities', labelKey: 'stats.avgCycle', descriptionKey: 'stats.avgCycleDesc', category: 'performance', valueType: 'duration', defaultColor: 'info', icon: 'ClockIcon', defaultVisible: false, sortOrder: 23 },
  
  // Pipeline Stages
  { id: 'opp-intelligence', key: 'intelligence', module: 'opportunities', labelKey: 'stats.intelligence', category: 'distribution', valueType: 'number', defaultColor: 'info', icon: 'LightBulbIcon', defaultVisible: false, sortOrder: 30, aggregation: 'count', filterField: 'stage', filterValue: 'intelligence' },
  { id: 'opp-approach', key: 'approach', module: 'opportunities', labelKey: 'stats.approach', category: 'distribution', valueType: 'number', defaultColor: 'primary', icon: 'PhoneIcon', defaultVisible: false, sortOrder: 31, aggregation: 'count', filterField: 'stage', filterValue: 'approach' },
  { id: 'opp-proposal', key: 'proposal', module: 'opportunities', labelKey: 'stats.proposal', category: 'distribution', valueType: 'number', defaultColor: 'warning', icon: 'DocumentTextIcon', defaultVisible: false, sortOrder: 32, aggregation: 'count', filterField: 'stage', filterValue: 'proposal' },
  { id: 'opp-negotiation', key: 'negotiation', module: 'opportunities', labelKey: 'stats.negotiation', category: 'distribution', valueType: 'number', defaultColor: 'primary', icon: 'ChatBubbleLeftRightIcon', defaultVisible: false, sortOrder: 33, aggregation: 'count', filterField: 'stage', filterValue: 'negotiation' },
  
  // Timeline
  { id: 'opp-closing-this-month', key: 'closingThisMonth', module: 'opportunities', labelKey: 'stats.closingThisMonth', category: 'timeline', valueType: 'number', defaultColor: 'warning', icon: 'CalendarDaysIcon', defaultVisible: false, sortOrder: 40 },
  { id: 'opp-overdue', key: 'overdue', module: 'opportunities', labelKey: 'stats.overdue', category: 'timeline', valueType: 'number', defaultColor: 'danger', icon: 'ExclamationCircleIcon', defaultVisible: false, sortOrder: 41 },
  { id: 'opp-created-this-month', key: 'createdThisMonth', module: 'opportunities', labelKey: 'stats.createdThisMonth', category: 'timeline', valueType: 'number', defaultColor: 'info', icon: 'PlusCircleIcon', defaultVisible: false, sortOrder: 42 },
];

export const PROPOSALS_STATISTICS: StatisticDefinition[] = [
  // Overview
  { id: 'prop-total', key: 'total', module: 'proposals', labelKey: 'stats.total', category: 'overview', valueType: 'number', defaultColor: 'primary', icon: 'DocumentTextIcon', defaultVisible: true, sortOrder: 1, aggregation: 'count' },
  { id: 'prop-draft', key: 'draft', module: 'proposals', labelKey: 'stats.draft', category: 'overview', valueType: 'number', defaultColor: 'default', icon: 'PencilIcon', defaultVisible: false, sortOrder: 2, aggregation: 'count', filterField: 'status', filterValue: 'draft' },
  { id: 'prop-in-review', key: 'inReview', module: 'proposals', labelKey: 'stats.inReview', category: 'overview', valueType: 'number', defaultColor: 'warning', icon: 'EyeIcon', defaultVisible: false, sortOrder: 3, aggregation: 'count', filterField: 'status', filterValue: 'in_review' },
  { id: 'prop-submitted', key: 'submitted', module: 'proposals', labelKey: 'stats.submitted', category: 'overview', valueType: 'number', defaultColor: 'info', icon: 'PaperAirplaneIcon', defaultVisible: false, sortOrder: 4, aggregation: 'count', filterField: 'status', filterValue: 'submitted' },
  { id: 'prop-approved', key: 'approved', module: 'proposals', labelKey: 'stats.approved', category: 'overview', valueType: 'number', defaultColor: 'success', icon: 'CheckCircleIcon', defaultVisible: true, sortOrder: 5, aggregation: 'count', filterField: 'status', filterValue: 'approved' },
  { id: 'prop-rejected', key: 'rejected', module: 'proposals', labelKey: 'stats.rejected', category: 'overview', valueType: 'number', defaultColor: 'danger', icon: 'XCircleIcon', defaultVisible: false, sortOrder: 6, aggregation: 'count', filterField: 'status', filterValue: 'rejected' },
  
  // Financial
  { id: 'prop-total-value', key: 'totalValue', module: 'proposals', labelKey: 'stats.totalValue', category: 'financial', valueType: 'currency', defaultColor: 'info', icon: 'CurrencyDollarIcon', defaultVisible: true, sortOrder: 10, aggregation: 'sum', sourceField: 'total_value' },
  { id: 'prop-approved-value', key: 'approvedValue', module: 'proposals', labelKey: 'stats.approvedValue', category: 'financial', valueType: 'currency', defaultColor: 'success', icon: 'BanknotesIcon', defaultVisible: false, sortOrder: 11 },
  { id: 'prop-pending-value', key: 'pendingValue', module: 'proposals', labelKey: 'stats.pendingValue', category: 'financial', valueType: 'currency', defaultColor: 'warning', icon: 'ClockIcon', defaultVisible: false, sortOrder: 12 },
  { id: 'prop-avg-value', key: 'avgValue', module: 'proposals', labelKey: 'stats.avgValue', category: 'financial', valueType: 'currency', defaultColor: 'default', icon: 'CalculatorIcon', defaultVisible: false, sortOrder: 13, aggregation: 'avg', sourceField: 'total_value' },
  
  // Performance
  { id: 'prop-approval-rate', key: 'approvalRate', module: 'proposals', labelKey: 'stats.approvalRate', category: 'performance', valueType: 'percentage', defaultColor: 'success', icon: 'ChartBarIcon', defaultVisible: false, sortOrder: 20 },
  { id: 'prop-avg-review-time', key: 'avgReviewTime', module: 'proposals', labelKey: 'stats.avgReviewTime', category: 'performance', valueType: 'duration', defaultColor: 'info', icon: 'ClockIcon', defaultVisible: false, sortOrder: 21 },
  { id: 'prop-avg-versions', key: 'avgVersions', module: 'proposals', labelKey: 'stats.avgVersions', category: 'performance', valueType: 'number', defaultColor: 'default', icon: 'DocumentDuplicateIcon', defaultVisible: false, sortOrder: 22, aggregation: 'avg', sourceField: 'version' },
  
  // Distribution by Funding Source
  { id: 'prop-by-finep', key: 'byFinep', module: 'proposals', labelKey: 'stats.byFinep', category: 'distribution', valueType: 'number', defaultColor: 'primary', icon: 'BuildingLibraryIcon', defaultVisible: false, sortOrder: 30 },
  { id: 'prop-by-fapesp', key: 'byFapesp', module: 'proposals', labelKey: 'stats.byFapesp', category: 'distribution', valueType: 'number', defaultColor: 'info', icon: 'AcademicCapIcon', defaultVisible: false, sortOrder: 31 },
  { id: 'prop-by-cnpq', key: 'byCnpq', module: 'proposals', labelKey: 'stats.byCnpq', category: 'distribution', valueType: 'number', defaultColor: 'warning', icon: 'BeakerIcon', defaultVisible: false, sortOrder: 32 },
  { id: 'prop-by-bndes', key: 'byBndes', module: 'proposals', labelKey: 'stats.byBndes', category: 'distribution', valueType: 'number', defaultColor: 'success', icon: 'BanknotesIcon', defaultVisible: false, sortOrder: 33 },
  
  // AI Metrics
  { id: 'prop-avg-confidence', key: 'avgConfidence', module: 'proposals', labelKey: 'stats.avgConfidence', category: 'ai', valueType: 'percentage', defaultColor: 'primary', icon: 'SparklesIcon', defaultVisible: false, sortOrder: 40, aggregation: 'avg', sourceField: 'ai_confidence' },
  { id: 'prop-high-confidence', key: 'highConfidence', module: 'proposals', labelKey: 'stats.highConfidence', descriptionKey: 'stats.highConfidenceDesc', category: 'ai', valueType: 'number', defaultColor: 'success', icon: 'CheckBadgeIcon', defaultVisible: false, sortOrder: 41 },
];

export const INGESTION_STATISTICS: StatisticDefinition[] = [
  // Overview
  { id: 'ing-total', key: 'total', module: 'ingestion', labelKey: 'stats.total', category: 'overview', valueType: 'number', defaultColor: 'primary', icon: 'DocumentTextIcon', defaultVisible: true, sortOrder: 1, aggregation: 'count' },
  { id: 'ing-completed', key: 'completed', module: 'ingestion', labelKey: 'stats.completed', category: 'overview', valueType: 'number', defaultColor: 'success', icon: 'CheckCircleIcon', defaultVisible: true, sortOrder: 2, aggregation: 'count', filterField: 'status', filterValue: 'completed' },
  { id: 'ing-processing', key: 'processing', module: 'ingestion', labelKey: 'stats.processing', category: 'overview', valueType: 'number', defaultColor: 'info', icon: 'ArrowPathIcon', defaultVisible: true, sortOrder: 3 },
  { id: 'ing-pending', key: 'pending', module: 'ingestion', labelKey: 'stats.pending', category: 'overview', valueType: 'number', defaultColor: 'warning', icon: 'ClockIcon', defaultVisible: false, sortOrder: 4, aggregation: 'count', filterField: 'status', filterValue: 'pending' },
  { id: 'ing-failed', key: 'failed', module: 'ingestion', labelKey: 'stats.failed', category: 'overview', valueType: 'number', defaultColor: 'danger', icon: 'XCircleIcon', defaultVisible: true, sortOrder: 5, aggregation: 'count', filterField: 'status', filterValue: 'failed' },
  
  // Records
  { id: 'ing-total-records', key: 'totalRecords', module: 'ingestion', labelKey: 'stats.totalRecords', category: 'overview', valueType: 'number', defaultColor: 'default', icon: 'TableCellsIcon', defaultVisible: true, sortOrder: 10, aggregation: 'sum', sourceField: 'total_records' },
  { id: 'ing-processed-records', key: 'processedRecords', module: 'ingestion', labelKey: 'stats.processedRecords', category: 'overview', valueType: 'number', defaultColor: 'success', icon: 'CheckIcon', defaultVisible: false, sortOrder: 11, aggregation: 'sum', sourceField: 'processed_records' },
  { id: 'ing-failed-records', key: 'failedRecords', module: 'ingestion', labelKey: 'stats.failedRecords', category: 'overview', valueType: 'number', defaultColor: 'danger', icon: 'XMarkIcon', defaultVisible: false, sortOrder: 12, aggregation: 'sum', sourceField: 'failed_records' },
  
  // PII
  { id: 'ing-pii-detected', key: 'piiDetected', module: 'ingestion', labelKey: 'stats.piiDetected', category: 'risk', valueType: 'number', defaultColor: 'warning', icon: 'ShieldExclamationIcon', defaultVisible: true, sortOrder: 20, aggregation: 'sum', sourceField: 'pii_detected_count' },
  { id: 'ing-pii-anonymized', key: 'piiAnonymized', module: 'ingestion', labelKey: 'stats.piiAnonymized', category: 'risk', valueType: 'number', defaultColor: 'success', icon: 'ShieldCheckIcon', defaultVisible: false, sortOrder: 21, aggregation: 'sum', sourceField: 'pii_anonymized_count' },
  { id: 'ing-pii-pending', key: 'piiPending', module: 'ingestion', labelKey: 'stats.piiPending', category: 'risk', valueType: 'number', defaultColor: 'warning', icon: 'ClockIcon', defaultVisible: false, sortOrder: 22 },
  
  // Performance
  { id: 'ing-success-rate', key: 'successRate', module: 'ingestion', labelKey: 'stats.successRate', category: 'performance', valueType: 'percentage', defaultColor: 'success', icon: 'ChartBarIcon', defaultVisible: false, sortOrder: 30 },
  { id: 'ing-avg-processing-time', key: 'avgProcessingTime', module: 'ingestion', labelKey: 'stats.avgProcessingTime', category: 'performance', valueType: 'duration', defaultColor: 'info', icon: 'ClockIcon', defaultVisible: false, sortOrder: 31 },
  { id: 'ing-throughput', key: 'throughput', module: 'ingestion', labelKey: 'stats.throughput', descriptionKey: 'stats.throughputDesc', category: 'performance', valueType: 'number', defaultColor: 'primary', icon: 'BoltIcon', defaultVisible: false, sortOrder: 32 },
  
  // Distribution by Source Type
  { id: 'ing-csv', key: 'csv', module: 'ingestion', labelKey: 'stats.csv', category: 'distribution', valueType: 'number', defaultColor: 'primary', icon: 'TableCellsIcon', defaultVisible: false, sortOrder: 40, aggregation: 'count', filterField: 'source_type', filterValue: 'csv' },
  { id: 'ing-xlsx', key: 'xlsx', module: 'ingestion', labelKey: 'stats.xlsx', category: 'distribution', valueType: 'number', defaultColor: 'success', icon: 'DocumentChartBarIcon', defaultVisible: false, sortOrder: 41, aggregation: 'count', filterField: 'source_type', filterValue: 'xlsx' },
  { id: 'ing-json', key: 'json', module: 'ingestion', labelKey: 'stats.json', category: 'distribution', valueType: 'number', defaultColor: 'warning', icon: 'CodeBracketIcon', defaultVisible: false, sortOrder: 42, aggregation: 'count', filterField: 'source_type', filterValue: 'json' },
  { id: 'ing-xml', key: 'xml', module: 'ingestion', labelKey: 'stats.xml', category: 'distribution', valueType: 'number', defaultColor: 'info', icon: 'CodeBracketSquareIcon', defaultVisible: false, sortOrder: 43, aggregation: 'count', filterField: 'source_type', filterValue: 'xml' },
];

export const PII_ANALYSIS_STATISTICS: StatisticDefinition[] = [
  // Overview
  { id: 'pii-total', key: 'total', module: 'pii-analysis', labelKey: 'stats.total', category: 'overview', valueType: 'number', defaultColor: 'default', icon: 'DocumentMagnifyingGlassIcon', defaultVisible: true, sortOrder: 1, aggregation: 'count' },
  { id: 'pii-pending', key: 'pending', module: 'pii-analysis', labelKey: 'stats.pending', category: 'overview', valueType: 'number', defaultColor: 'warning', icon: 'ClockIcon', defaultVisible: true, sortOrder: 2 },
  { id: 'pii-approved', key: 'approved', module: 'pii-analysis', labelKey: 'stats.approved', category: 'overview', valueType: 'number', defaultColor: 'info', icon: 'CheckCircleIcon', defaultVisible: true, sortOrder: 3 },
  { id: 'pii-rejected', key: 'rejected', module: 'pii-analysis', labelKey: 'stats.rejected', category: 'overview', valueType: 'number', defaultColor: 'danger', icon: 'XCircleIcon', defaultVisible: false, sortOrder: 4 },
  { id: 'pii-anonymized', key: 'anonymized', module: 'pii-analysis', labelKey: 'stats.anonymized', category: 'overview', valueType: 'number', defaultColor: 'success', icon: 'ShieldCheckIcon', defaultVisible: true, sortOrder: 5 },
  
  // Risk Levels
  { id: 'pii-critical', key: 'critical', module: 'pii-analysis', labelKey: 'stats.critical', category: 'risk', valueType: 'number', defaultColor: 'danger', icon: 'ExclamationTriangleIcon', defaultVisible: true, sortOrder: 10 },
  { id: 'pii-high', key: 'high', module: 'pii-analysis', labelKey: 'stats.high', category: 'risk', valueType: 'number', defaultColor: 'danger', icon: 'ExclamationCircleIcon', defaultVisible: false, sortOrder: 11 },
  { id: 'pii-medium', key: 'medium', module: 'pii-analysis', labelKey: 'stats.medium', category: 'risk', valueType: 'number', defaultColor: 'warning', icon: 'ExclamationTriangleIcon', defaultVisible: false, sortOrder: 12 },
  { id: 'pii-low', key: 'low', module: 'pii-analysis', labelKey: 'stats.low', category: 'risk', valueType: 'number', defaultColor: 'info', icon: 'InformationCircleIcon', defaultVisible: false, sortOrder: 13 },
  
  // Entity Types
  { id: 'pii-cpf', key: 'cpf', module: 'pii-analysis', labelKey: 'stats.cpf', category: 'distribution', valueType: 'number', defaultColor: 'primary', icon: 'IdentificationIcon', defaultVisible: true, sortOrder: 20 },
  { id: 'pii-cnpj', key: 'cnpj', module: 'pii-analysis', labelKey: 'stats.cnpj', category: 'distribution', valueType: 'number', defaultColor: 'primary', icon: 'BuildingOfficeIcon', defaultVisible: false, sortOrder: 21 },
  { id: 'pii-email', key: 'email', module: 'pii-analysis', labelKey: 'stats.email', category: 'distribution', valueType: 'number', defaultColor: 'info', icon: 'EnvelopeIcon', defaultVisible: true, sortOrder: 22 },
  { id: 'pii-phone', key: 'phone', module: 'pii-analysis', labelKey: 'stats.phone', category: 'distribution', valueType: 'number', defaultColor: 'info', icon: 'PhoneIcon', defaultVisible: true, sortOrder: 23 },
  { id: 'pii-name', key: 'name', module: 'pii-analysis', labelKey: 'stats.name', category: 'distribution', valueType: 'number', defaultColor: 'default', icon: 'UserIcon', defaultVisible: false, sortOrder: 24 },
  { id: 'pii-address', key: 'address', module: 'pii-analysis', labelKey: 'stats.address', category: 'distribution', valueType: 'number', defaultColor: 'default', icon: 'MapPinIcon', defaultVisible: false, sortOrder: 25 },
  { id: 'pii-rg', key: 'rg', module: 'pii-analysis', labelKey: 'stats.rg', category: 'distribution', valueType: 'number', defaultColor: 'warning', icon: 'IdentificationIcon', defaultVisible: false, sortOrder: 26 },
  { id: 'pii-credit-card', key: 'creditCard', module: 'pii-analysis', labelKey: 'stats.creditCard', category: 'distribution', valueType: 'number', defaultColor: 'danger', icon: 'CreditCardIcon', defaultVisible: false, sortOrder: 27 },
  
  // Performance
  { id: 'pii-approval-rate', key: 'approvalRate', module: 'pii-analysis', labelKey: 'stats.approvalRate', category: 'performance', valueType: 'percentage', defaultColor: 'success', icon: 'ChartBarIcon', defaultVisible: false, sortOrder: 30 },
  { id: 'pii-anonymization-rate', key: 'anonymizationRate', module: 'pii-analysis', labelKey: 'stats.anonymizationRate', category: 'performance', valueType: 'percentage', defaultColor: 'success', icon: 'ShieldCheckIcon', defaultVisible: false, sortOrder: 31 },
  { id: 'pii-false-positive-rate', key: 'falsePositiveRate', module: 'pii-analysis', labelKey: 'stats.falsePositiveRate', category: 'performance', valueType: 'percentage', defaultColor: 'warning', icon: 'ExclamationCircleIcon', defaultVisible: false, sortOrder: 32 },
  
  // AI Metrics
  { id: 'pii-avg-confidence', key: 'avgConfidence', module: 'pii-analysis', labelKey: 'stats.avgConfidence', category: 'ai', valueType: 'percentage', defaultColor: 'primary', icon: 'SparklesIcon', defaultVisible: false, sortOrder: 40 },
  { id: 'pii-high-confidence', key: 'highConfidence', module: 'pii-analysis', labelKey: 'stats.highConfidence', descriptionKey: 'stats.highConfidenceDesc', category: 'ai', valueType: 'number', defaultColor: 'success', icon: 'CheckBadgeIcon', defaultVisible: false, sortOrder: 41 },
  { id: 'pii-needs-review', key: 'needsReview', module: 'pii-analysis', labelKey: 'stats.needsReview', descriptionKey: 'stats.needsReviewDesc', category: 'ai', valueType: 'number', defaultColor: 'warning', icon: 'EyeIcon', defaultVisible: false, sortOrder: 42 },
];

/**
 * Get all statistics definitions for a module
 */
export function getModuleStatistics(module: StatisticsModule): StatisticDefinition[] {
  switch (module) {
    case 'funding': return FUNDING_STATISTICS;
    case 'portfolio': return PORTFOLIO_STATISTICS;
    case 'crm': return CRM_STATISTICS;
    case 'opportunities': return OPPORTUNITIES_STATISTICS;
    case 'proposals': return PROPOSALS_STATISTICS;
    case 'ingestion': return INGESTION_STATISTICS;
    case 'pii-analysis': return PII_ANALYSIS_STATISTICS;
    default: return [];
  }
}

/**
 * Get all available modules
 */
export const ALL_MODULES: StatisticsModule[] = [
  'funding',
  'portfolio',
  'crm',
  'opportunities',
  'proposals',
  'ingestion',
  'pii-analysis',
  'reports',
  'translations',
];

/**
 * Get category display info
 */
export const STAT_CATEGORIES: Record<StatCategory, { labelKey: string; icon: string; color: string }> = {
  overview: { labelKey: 'stats.categories.overview', icon: 'ChartBarIcon', color: 'primary' },
  financial: { labelKey: 'stats.categories.financial', icon: 'CurrencyDollarIcon', color: 'success' },
  performance: { labelKey: 'stats.categories.performance', icon: 'ArrowTrendingUpIcon', color: 'info' },
  timeline: { labelKey: 'stats.categories.timeline', icon: 'CalendarIcon', color: 'warning' },
  distribution: { labelKey: 'stats.categories.distribution', icon: 'ChartPieIcon', color: 'default' },
  risk: { labelKey: 'stats.categories.risk', icon: 'ShieldExclamationIcon', color: 'danger' },
  ai: { labelKey: 'stats.categories.ai', icon: 'SparklesIcon', color: 'primary' },
};
