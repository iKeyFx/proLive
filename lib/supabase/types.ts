/**
 * Hand-authored database types mirroring supabase/migrations/0001_init.sql.
 * Kept in sync by hand (small surface). All money is bigint kobo, qty is bigint
 * micro-units — represented as `number` here (values stay well within 2^53).
 */

export interface AccountRow {
  user_id: string;
  cash_kobo: number;
  created_at: string;
  updated_at: string;
}

export interface HoldingRow {
  id: string;
  user_id: string;
  symbol: string;
  qty_micro: number;
  cost_basis_kobo: number;
  updated_at: string;
}

export interface OrderRow {
  id: string;
  user_id: string;
  symbol: string;
  side: "buy" | "sell";
  qty_micro: number;
  price_kobo: number;
  total_kobo: number;
  idempotency_key: string;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: AccountRow;
        Insert: Partial<AccountRow> & { user_id: string };
        Update: Partial<AccountRow>;
        Relationships: [];
      };
      holdings: {
        Row: HoldingRow;
        Insert: Omit<HoldingRow, "id" | "updated_at"> & { id?: string; updated_at?: string };
        Update: Partial<HoldingRow>;
        Relationships: [];
      };
      orders: {
        Row: OrderRow;
        Insert: Omit<OrderRow, "id" | "created_at"> & { id?: string; created_at?: string };
        // RLS forbids client UPDATE on the ledger; the type must still be a
        // record (not `never`) or supabase-js's GenericSchema check fails and
        // collapses inference for the whole database to never/undefined.
        Update: Partial<OrderRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      apply_trade: {
        Args: {
          p_symbol: string;
          p_side: "buy" | "sell";
          p_qty_micro: number;
          p_price_kobo: number;
          p_total_kobo: number;
          p_idempotency_key: string;
          p_expected_cash: number;
          p_new_cash: number;
          p_expected_qty: number;
          p_expected_basis: number;
          p_new_qty: number;
          p_new_basis: number;
        };
        Returns: { order_id: string; status: string }[];
      };
      reset_account: { Args: Record<string, never>; Returns: undefined };
      delete_account_data: { Args: Record<string, never>; Returns: undefined };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
