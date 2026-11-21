import { SessionAccessGate } from "../lib/session-access";

export default function Home() {
  return <SessionAccessGate role="host" />;
}
