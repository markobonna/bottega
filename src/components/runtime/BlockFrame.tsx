"use client";

import { Component, type ReactNode } from "react";
import { card } from "../ui";

export default class BlockFrame extends Component<
  { title: string; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(error);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className={`${card} p-4`}>
          <p className="text-muted">Something went wrong in this block</p>
        </div>
      );
    }
    return (
      <div className={`${card} p-4`}>
        <h3 className="font-display text-lg">{this.props.title}</h3>
        <div className="mt-3">{this.props.children}</div>
      </div>
    );
  }
}
