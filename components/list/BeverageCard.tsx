"use client"

import { MapPin, User, Wine } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { EntityCard, type EntityCardDensity, type EntityCardMeta } from "./EntityCard"
import { beverageStatusAppearance } from "./statusAppearance"

export interface BeverageCardData {
    id: string
    name: string
    status?: string | null
    /** Type code parsed out of `attributes` (e.g. "RED"), used when `typeId` maps to nothing. */
    type?: string | null
    typeId?: string | null
    producers?: { auid?: number[] | null; producerId?: string | null }[] | null
    /** Reverse-geocoded origin, resolved server side where the page fetches it. */
    originParts?: string[] | null
}

interface BeverageCardProps {
    beverage: BeverageCardData
    /** Maps a beverage typeId to its code, so the card can translate the type label. */
    typeMap?: Record<string, string>
    /** Producer auid -> username, from useUsernames on the list page. */
    usernames?: Record<string, string>
    density?: EntityCardDensity
}

export function BeverageCard({ beverage, typeMap, usernames, density = "comfortable" }: BeverageCardProps) {
    const { t, formatStatus, formatBeverageType } = useTranslation()

    const typeCode = (typeMap && beverage.typeId && typeMap[beverage.typeId]) || beverage.type
    const status = beverage.status ?? undefined
    const { colorScheme, icon } = beverageStatusAppearance(status ?? "")

    const producerLabels: string[] = []
    ;(beverage.producers ?? []).forEach((producer) => {
        if (producer.auid && producer.auid.length > 0) {
            producer.auid.forEach((auid) => {
                producerLabels.push(usernames?.[auid] || `@${auid}`)
            })
        } else if (producer.producerId) {
            producerLabels.push(`Producer ${String(producer.producerId).slice(0, 8)}`)
        }
    })
    const uniqueProducerLabels = Array.from(new Set(producerLabels))
    const origin = beverage.originParts?.filter(Boolean).join(", ")

    const meta: EntityCardMeta[] = []
    if (origin) {
        meta.push({ icon: MapPin, label: t("beverages.origin"), value: origin })
    }
    if (uniqueProducerLabels.length > 0) {
        meta.push({
            icon: User,
            label: t("beverages.producer"),
            value: uniqueProducerLabels.join(", "),
        })
    }

    return (
        <EntityCard
            href={`/beverage/${beverage.id}`}
            icon={Wine}
            kicker={typeCode ? formatBeverageType(typeCode) : null}
            title={beverage.name}
            meta={meta}
            status={status ? { label: formatStatus(status), colorScheme, icon } : undefined}
            density={density}
        />
    )
}
