"use client"

import { MapPin, Wine } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { EntityCardLink } from "./EntityCardLink"
import { StatusBadge } from "./StatusBadge"
import { beverageStatusAppearance } from "./statusAppearance"

export interface BeverageCardData {
    id: string
    name: string
    status?: string | null
    /** Beverage type code resolved from `attributes` (e.g. "RED"), used when `typeId` maps to nothing. */
    type?: string | null
    typeId?: string | null
    originParts?: string[] | null
}

interface BeverageCardProps {
    beverage: BeverageCardData
    /** Maps a beverage typeId to its code, so the card can translate the type label. */
    typeMap?: Record<string, string>
    /** Mirrors the competition cards: "compact" on global lists, "comfortable" on personal lists, "dashboard" on the home bento. */
    density?: "compact" | "comfortable" | "dashboard"
}

const TILE_CLASSES: Record<NonNullable<BeverageCardProps["density"]>, string> = {
    compact: "h-14 w-14",
    comfortable: "h-14 w-14",
    dashboard: "h-10 w-10",
}

const ICON_CLASSES: Record<NonNullable<BeverageCardProps["density"]>, string> = {
    compact: "h-7 w-7",
    comfortable: "h-7 w-7",
    dashboard: "h-5 w-5",
}

const TITLE_CLASSES: Record<NonNullable<BeverageCardProps["density"]>, string> = {
    compact: "text-lg",
    comfortable: "text-xl",
    dashboard: "text-sm",
}

/**
 * The single beverage card used by /beverages, /myBeverages and the home
 * dashboard. Built to the same skeleton as the competition cards: icon tile,
 * kicker label, title, then a status badge pinned to the bottom.
 */
export function BeverageCard({ beverage, typeMap, density = "comfortable" }: BeverageCardProps) {
    const { formatStatus, formatBeverageType } = useTranslation()

    const typeCode = (typeMap && beverage.typeId && typeMap[beverage.typeId]) || beverage.type
    const displayType = typeCode ? formatBeverageType(typeCode) : null

    const origin = beverage.originParts?.filter(Boolean).join(", ")
    const status = beverage.status ?? undefined
    const { colorScheme, icon } = beverageStatusAppearance(status ?? "")

    return (
        <EntityCardLink href={`/beverage/${beverage.id}`} padding={density}>
            <div className="flex items-center gap-4">
                <div
                    className={`flex ${TILE_CLASSES[density]} shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300`}
                >
                    <Wine className={ICON_CLASSES[density]} />
                </div>
                <div className="flex-1 min-w-0">
                    {displayType && (
                        <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 truncate block">
                            {displayType}
                        </span>
                    )}
                    <h3
                        className={`${TITLE_CLASSES[density]} font-bold text-slate-800 truncate mt-0.5 group-hover:text-indigo-600 transition-colors`}
                    >
                        {beverage.name}
                    </h3>
                </div>
            </div>

            {status && (
                <div className="flex items-center justify-between mt-auto pt-4">
                    <StatusBadge
                        colorScheme={colorScheme}
                        icon={icon}
                        label={formatStatus(status)}
                        trailing={origin || undefined}
                        trailingIcon={MapPin}
                    />
                </div>
            )}
        </EntityCardLink>
    )
}
