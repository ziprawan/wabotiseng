import { useDatabaseAuthState } from "#bot/utils/session/manager";

export type DatabaseSession = Awaited<ReturnType<typeof useDatabaseAuthState>>;
