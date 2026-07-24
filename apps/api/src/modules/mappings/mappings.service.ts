import { DEFAULT_REASON_MAPPINGS, type ReturnMappingDto } from "@returnsense/shared";
import { mappingsRepository } from "./mappings.repository.js";

export const mappingsService = {
  async list(organizationId: string): Promise<ReturnMappingDto[]> {
    const rows = await mappingsRepository.list(organizationId);
    return rows.map(toDto);
  },

  async create(
    organizationId: string,
    input: { sourceReason: string; marketingCategory: string },
  ): Promise<ReturnMappingDto> {
    const row = await mappingsRepository.create({
      organizationId,
      sourceReason: input.sourceReason.trim().toUpperCase(),
      marketingCategory: input.marketingCategory.trim().toUpperCase(),
    });
    return toDto(row);
  },

  async update(
    organizationId: string,
    id: string,
    input: { marketingCategory?: string; isActive?: boolean },
  ): Promise<void> {
    await mappingsRepository.update(id, organizationId, {
      ...(input.marketingCategory
        ? { marketingCategory: input.marketingCategory.trim().toUpperCase() }
        : {}),
      ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
    });
  },

  /** Resolves a raw Shopify reason to a marketing category, defaulting to OTHER. */
  async mapReason(organizationId: string, sourceReason: string): Promise<string> {
    const normalized = (sourceReason || "OTHER").trim().toUpperCase();
    const mapping = await mappingsRepository.findActive(organizationId, normalized);
    if (mapping && mapping.isActive) return mapping.marketingCategory;
    return DEFAULT_REASON_MAPPINGS[normalized] ?? "OTHER";
  },

  async seedDefaults(organizationId: string): Promise<void> {
    for (const [sourceReason, marketingCategory] of Object.entries(
      DEFAULT_REASON_MAPPINGS,
    )) {
      await mappingsRepository.upsertDefault({
        organizationId,
        sourceReason,
        marketingCategory,
      });
    }
  },
};

function toDto(row: {
  id: string;
  sourceReason: string;
  marketingCategory: string;
  isActive: boolean;
}): ReturnMappingDto {
  return {
    id: row.id,
    sourceReason: row.sourceReason,
    marketingCategory: row.marketingCategory,
    isActive: row.isActive,
  };
}
