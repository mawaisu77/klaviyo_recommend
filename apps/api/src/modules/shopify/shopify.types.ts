export interface ShopifyMoney {
  amount: string;
  currencyCode: string;
}

export interface ShopifyReturnGraph {
  id: string;
  status: string;
  order: {
    id: string;
    name: string;
    currencyCode: string;
    createdAt?: string;
    customer: {
      id: string | null;
      email: string | null;
      phone: string | null;
    } | null;
  };
  returnLineItems: {
    edges: Array<{
      node: {
        id: string;
        quantity: number;
        returnReason: string | null;
        returnReasonNote: string | null;
        fulfillmentLineItem: {
          lineItem: {
            id: string;
            sku: string | null;
            title: string;
            variantTitle: string | null;
            product: { id: string } | null;
            variant: { id: string } | null;
            originalUnitPriceSet: { shopMoney: ShopifyMoney } | null;
          };
        } | null;
      };
    }>;
  };
}
