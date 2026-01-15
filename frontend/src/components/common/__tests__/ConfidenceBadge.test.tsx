/**
 * Component Tests
 * Tests for ConfidenceBadge component
 */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ConfidenceBadge from '@/components/common/ConfidenceBadge';

describe('ConfidenceBadge', () => {
  it('renders with green badge for high confidence (≥80%)', () => {
    render(<ConfidenceBadge score={0.85} />);
    
    const badge = screen.getByTitle('AI Confidence: 85%');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('badge-green');
    expect(badge).toHaveTextContent('85%');
  });

  it('renders with yellow badge for medium confidence (60-79%)', () => {
    render(<ConfidenceBadge score={0.65} />);
    
    const badge = screen.getByTitle('AI Confidence: 65%');
    expect(badge).toHaveClass('badge-yellow');
    expect(badge).toHaveTextContent('65%');
  });

  it('renders with red badge for low confidence (<60%)', () => {
    render(<ConfidenceBadge score={0.45} />);
    
    const badge = screen.getByTitle('AI Confidence: 45%');
    expect(badge).toHaveClass('badge-red');
    expect(badge).toHaveTextContent('45%');
  });

  it('hides label when showLabel is false', () => {
    render(<ConfidenceBadge score={0.80} showLabel={false} />);
    
    const badge = screen.getByTitle('AI Confidence: 80%');
    expect(badge).not.toHaveTextContent('80%');
  });

  it('shows check icon for high confidence', () => {
    const { container } = render(<ConfidenceBadge score={0.90} />);
    
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });
});
