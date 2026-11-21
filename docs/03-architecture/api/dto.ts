/**
 * Canonical multi-node contract DTO for Frontend Portal & Node-to-Node JSON communication.
 * To adhere to Article V Zero-Float Invariant and JSON-serializable wire contracts without loss:
 * amount_minor is represented as a decimal integer string (or exact minor unit integer) on the wire,
 * avoiding IEEE-754 float precision loss and native BigInt serialization failure in JSON.stringify.
 */
export interface SodaMultiNodeContract {
  id: string;
  tenant_id: string;
  base_currency: string;
  amount_minor: string; // Exact minor unit integer string on wire ("1050" satang/cents) to prevent float drift & JSON BigInt throw
  scale: number;
  status: 'draft' | 'pending' | 'active' | 'completed' | 'failed';
}

export interface InvalidParam {
  name: string;
  reason: string;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  invalid_params: InvalidParam[];
}
