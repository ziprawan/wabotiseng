import { useDatabaseAuthState } from "@/utils/session/manager";

export type DatabaseSession = Awaited<ReturnType<typeof useDatabaseAuthState>>;
