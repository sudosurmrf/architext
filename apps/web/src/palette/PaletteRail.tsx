/**
 * @module @architext/web/palette/PaletteRail
 * Concepts: [[PaletteRail]], [[IconRail]], [[CategoryToggle]]
 * Spec: §4.2 Palette — vertical icon rail on the left; click opens/closes expanded panel
 * Depends on: [[ui-store]] (paletteCategory, togglePalette), [[palette-items]] (getPaletteCategories, PaletteCategoryDef)
 * Consumed by: [[App]] (left sidebar region)
 */

import {
  LayoutGrid,
  Code,
  Boxes,
  BookOpen,
  Wrench,
  HardDrive,
  CloudCog,
  Cloud,
  Shield,
  Play,
  type LucideIcon,
} from "lucide-react";
import { useUIStore } from "../store/ui-store";
import { getPaletteCategories } from "./palette-items";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutGrid,
  Code,
  Boxes,
  BookOpen,
  Wrench,
  HardDrive,
  CloudCog,
  Cloud,
  Shield,
  Play,
};

const categories = getPaletteCategories();

export function PaletteRail() {
  const paletteCategory = useUIStore((s) => s.paletteCategory);
  const togglePalette = useUIStore((s) => s.togglePalette);

  return (
    <div className="flex w-14 flex-col items-center gap-1 border-r border-gray-200 bg-white py-3">
      {categories.map((cat) => {
        const Icon = ICON_MAP[cat.icon];
        const isActive = paletteCategory === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => togglePalette(cat.id)}
            className={
              "flex h-10 w-10 items-center justify-center rounded-lg transition-colors " +
              (isActive
                ? "bg-blue-100 text-blue-600"
                : "text-gray-500 hover:bg-gray-100")
            }
            title={cat.label}
          >
            {Icon ? <Icon className="h-5 w-5" /> : null}
          </button>
        );
      })}
    </div>
  );
}
