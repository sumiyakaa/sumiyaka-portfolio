import type { Tool } from "@/types/tool";
import { tools as toolsData } from "@/data/tools";

/**
 * ツールカタログの参照口。
 * 件数はここから毎回集計する（ハードコード禁止＝ツール追加で自動追従）。
 *
 * ⚠ ファイル名を lib/tools.ts にしないこと。lib/tools/ ディレクトリ（ツールの実装）と
 *    紛らわしくなるため、カタログ側は toolCatalog に寄せている。
 */
export function getAllTools(): Tool[] {
  return [...toolsData].sort((a, b) => a.order - b.order);
}

export function getPickUpTools(): Tool[] {
  return getAllTools().filter((tool) => tool.isPickUp);
}

export function getToolBySlug(slug: string): Tool | undefined {
  return toolsData.find((tool) => tool.slug === slug);
}
