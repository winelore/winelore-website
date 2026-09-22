"use client"

import { Calendar, ScrollText, User } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { EntityCard, type EntityCardDensity, type EntityCardMeta } from "./EntityCard"
import { outcomePolicyStatusAppearance } from "./statusAppearance"

export interface OutcomePolicyCardData {
    id: string
    name: string
    createdAt?: string | null
    owners?: number[][] | null
    latestEdition?: {
        id?: string
        version?: number
        status?: string | null
        scriptCode?: string | null
        calculationScope?: string | null
        createdAt?: string | null
    } | null
}

interface OutcomePolicyCardProps {
    policy: OutcomePolicyCardData
    /** Owner auid -> username, from useUsernames on the list page. */
    usernames?: Record<string, string>
    density?: EntityCardDensity
}

export function OutcomePolicyCard({ policy, usernames, density = "comfortable" }: OutcomePolicyCardProps) {
    const { t, formatStatus } = useTranslation()

    const edition = policy.latestEdition
    const statusValue = edition?.status
    const statusAppearance = outcomePolicyStatusAppearance(statusValue)
    const versionLabel = edition?.version ? `v${edition.version}` : undefined

    const owners = (policy.owners || []).flat()
    const meta: EntityCardMeta[] = []

    if (owners.length > 0) {
        meta.push({
            icon: User,
            label: t("outcomePolicies.author"),
            value: owners.map((id) => usernames?.[id] || String(id)).join(", "),
        })
    }

    if (policy.createdAt) {
        meta.push({
            icon: Calendar,
            label: t("myOutcomePolicies.createdAt"),
            value: new Date(policy.createdAt).toLocaleDateString("en-CA"),
        })
    }

    return (
        <EntityCard
            href={`/outcome-policy/${policy.id}`}
            icon={ScrollText}
            title={policy.name}
            meta={meta}
            status={
                statusValue
                    ? {
                          label: formatStatus(statusValue),
                          colorScheme: statusAppearance.colorScheme,
                          icon: statusAppearance.icon,
                          trailing: versionLabel,
                      }
                    : versionLabel
                    ? {
                          label: versionLabel,
                          colorScheme: statusAppearance.colorScheme,
                          icon: statusAppearance.icon,
                      }
                    : undefined
            }
            density={density}
        />
    )
}
