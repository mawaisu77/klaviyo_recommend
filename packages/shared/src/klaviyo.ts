export interface KlaviyoProfileIdentifier {
  email: string | null;
  external_id: string | null;
}

export interface KlaviyoEventProperties {
  return_id: string;
  order_id: string;
  order_number: string;
  product_id: string | null;
  variant_id: string | null;
  product_title: string;
  variant_title: string | null;
  sku: string | null;
  quantity: number;
  return_reason: string;
  return_category: string;
  returned_value: number;
  currency: string;
}

export interface KlaviyoEventPayload {
  metric: { name: string };
  profile: KlaviyoProfileIdentifier;
  properties: KlaviyoEventProperties;
  unique_id: string;
}

export interface KlaviyoProfileProperties {
  returnsense_total_returns: number;
  returnsense_total_returned_items: number;
  returnsense_total_returned_value: number;
  returnsense_last_return_date: string | null;
  returnsense_last_return_reason: string | null;
  returnsense_last_return_category: string | null;
  returnsense_last_returned_product: string | null;
  returnsense_exchange_count: number;
  returnsense_return_rate: number | null;
  returnsense_customer_status: string;
}
