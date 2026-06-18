import { Component, type ReactNode } from "react";

import { MapPreviewFallback } from "./MapPreviewFallback";

type MapPreviewErrorBoundaryProps = {
  children: ReactNode;
  resetKey: string;
};

type MapPreviewErrorBoundaryState = {
  hasError: boolean;
};

export class MapPreviewErrorBoundary extends Component<MapPreviewErrorBoundaryProps, MapPreviewErrorBoundaryState> {
  state: MapPreviewErrorBoundaryState = {
    hasError: false
  };

  static getDerivedStateFromError(): MapPreviewErrorBoundaryState {
    return { hasError: true };
  }

  componentDidUpdate(previousProps: MapPreviewErrorBoundaryProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return <MapPreviewFallback />;
    }

    return this.props.children;
  }
}
