import { DEMO_USER_ID } from "../lib/constants";

export function useIsDemoMode(session) {
  return session?.user?.id === DEMO_USER_ID;
}
