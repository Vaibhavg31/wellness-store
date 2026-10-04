import { Component } from 'react';

/**
 * Contains render/chunk-load failures of a non-essential subtree (e.g. decorative 3D) so they
 * can never take the whole page down. Renders `fallback` (default: nothing) instead.
 */
export default class ErrorBoundary extends Component {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    render() {
        return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
    }
}
