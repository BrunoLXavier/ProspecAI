// Confidence Badge Component
// Displays AI confidence score with color coding (RNF-04)
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';

interface ConfidenceBadgeProps {
  score: number;
  showLabel?: boolean;
  size?: 'xs' | 'sm' | 'md';
}

export default function ConfidenceBadge({ 
  score, 
  showLabel = true,
  size = 'md',
}: ConfidenceBadgeProps) {
  const getColor = () => {
    if (score >= 0.8) return 'badge-green';
    if (score >= 0.6) return 'badge-yellow';
    return 'badge-red';
  };

  const getIcon = () => {
    if (score >= 0.8) return CheckCircleIcon;
    return ExclamationCircleIcon;
  };

  const Icon = getIcon();
  const percentage = Math.round(score * 100);

  const sizeClass = size === 'xs' ? 'text-[10px] px-2 py-0.5' : size === 'sm' ? 'text-xs px-2.5 py-0.5' : 'text-sm px-3 py-0.5';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${getColor()}`}
      title={`AI Confidence: ${percentage}%`}
    >
      <Icon className="w-4 h-4 mr-1" />
      {showLabel && `${percentage}%`}
    </span>
  );
}
