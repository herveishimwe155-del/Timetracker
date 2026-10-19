"use client";

import { createContext, useContext } from "react";

export type WorkspaceRole = "admin" | "member";
export type WorkspaceSummary = { id: string; name: string; role: WorkspaceRole };

export type WorkspaceState = {
  /** The signed-in user, or null for guests. */
  userId: string | null;
  /** The space everything is tracked in: a workspace id, or null for personal. */
  workspaceId: string | null;
  workspace: WorkspaceSummary | null;
  workspaces: WorkspaceSummary[];
};

const WorkspaceContext = createContext<WorkspaceState>({ userId: null, workspaceId: null, workspace: null, workspaces: [] });

/**
 * The current space (personal or a team workspace), chosen in the sidebar switcher.
 * The server reads it from a cookie (src/app/(app)/layout.tsx), so switching
 * re-renders the app with a fresh data cache.
 */
export function WorkspaceProvider({ value, children }: { value: WorkspaceState; children: React.ReactNode }) {
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceState {
  return useContext(WorkspaceContext);
}

type SpaceFilterable<T> = {
  eq(column: "workspace_id", value: string): T;
  is(column: "workspace_id", value: null): T;
};

/** Limits a query to the current space: one workspace, or personal rows (no workspace). */
export function inSpace<T extends SpaceFilterable<T>>(query: T, workspaceId: string | null): T {
  return workspaceId ? query.eq("workspace_id", workspaceId) : query.is("workspace_id", null);
}
