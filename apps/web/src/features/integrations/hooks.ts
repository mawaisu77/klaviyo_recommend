import { useQuery } from "@tanstack/react-query";
import { endpoints } from "../../api/endpoints";

export function useShopifyStatus() {
  return useQuery({ queryKey: ["shopify-status"], queryFn: endpoints.shopifyStatus });
}

export function useKlaviyoStatus() {
  return useQuery({ queryKey: ["klaviyo-status"], queryFn: endpoints.klaviyoStatus });
}
