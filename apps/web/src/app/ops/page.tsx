import { SessionAccessGate } from "../../lib/session-access";

export default function OpsPage() {
  return <SessionAccessGate role="ops" />;
}
