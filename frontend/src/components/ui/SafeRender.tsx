import React from 'react';

interface Props {
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export class SafeRender extends React.Component<Props, { hasError: boolean }> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    // Log to console for debugging; in future send to telemetry
    // eslint-disable-next-line no-console
    console.error('SafeRender caught error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}

export default SafeRender;
