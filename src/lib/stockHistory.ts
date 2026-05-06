import { supabase } from '@/integrations/supabase/client';

export type StockChangeType =
  | 'added'
  | 'reduced'
  | 'sample_given'
  | 'order'
  | 'adjustment'
  | 'created'
  | 'deleted';

interface LogStockChangeParams {
  product_id: string;
  product_name: string;
  product_type: string;
  change_type: StockChangeType;
  quantity_change: number;
  previous_stock: number;
  new_stock: number;
  reason?: string;
}

/**
 * Append-only audit log for product stock changes.
 * Failures are swallowed (logged) so they don't block the parent transaction.
 */
export async function logStockChange(params: LogStockChangeParams) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    let userName: string | null = null;
    if (user) {
      const { data: u } = await supabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .maybeSingle();
      userName = u?.name ?? user.email ?? null;
    }

    await supabase.from('product_stock_history').insert({
      ...params,
      changed_by: user?.id ?? null,
      changed_by_name: userName,
    });
  } catch (e) {
    console.error('Failed to log stock change', e);
  }
}
