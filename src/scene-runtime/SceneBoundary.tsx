import { Component } from 'react';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  failed: (message: string) => void;
}
export class SceneBoundary extends Component<Props, { failed: boolean }> {
  constructor(props: Props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error): void {
    const { failed } = this.props;
    failed(error.message);
  }

  render(): ReactNode {
    const { failed } = this.state;
    const { children } = this.props;
    return failed ? (
      <p role="alert">The scene could not render. Undo the last change or correct its source.</p>
    ) : (
      children
    );
  }
}
