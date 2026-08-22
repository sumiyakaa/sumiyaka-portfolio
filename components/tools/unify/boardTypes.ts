/**
 * 列マッピング統合ツール（T-04） — マッピング盤の受け渡し契約
 *
 * `MappingBoard.tsx`（盤・主役の絵）と `TableUnifyTool.tsx`（状態・書き出し）を
 * 別々に実装するための境界。**この形を変えるときは両方を同時に直すこと。**
 *
 * ⚠ 盤は「見せる」と「選ばせる」だけを持つ。マッピング表そのものは親が持つ。
 *    盤の内部状態は「いまどの出力列を選んでいるか」だけにする。
 */

import type { Assignment, SourceFile, TargetSchema } from "@/lib/tools/unify/types";

export interface MappingBoardProps {
  /** 表示中のファイル（ファイルタブで切り替わる） */
  file: SourceFile;
  /** 出力したい管理表の形 */
  schema: TargetSchema;
  /**
   * 表示中のファイルぶんの割当。targetColumn.id → Assignment。
   * キーが無い＝未割当。
   */
  assignments: Record<string, Assignment>;
  /**
   * 同点の候補が2つ以上あって自動では割り当てなかった出力列。
   * targetColumn.id → 候補になった入力列の見出し（そのまま画面に出す）
   */
  ambiguous: Record<string, string[]>;

  /** 入力列を割り当てる（親が level: "manual" として積む） */
  onAssignColumn: (targetId: string, sourceIndex: number) => void;
  /** 割当を外す */
  onClear: (targetId: string) => void;
  /**
   * 固定値を入れる。
   * ⚠ 親が parse.ts の makeSourceCell() を通して date / num を埋めてから積む。
   *    盤は文字列を渡すところまで。
   */
  onAssignConst: (targetId: string, value: string) => void;
}
