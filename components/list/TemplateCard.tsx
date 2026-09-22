"use client"

import { Calendar, Layers, User } from "lucide-react"
import { useTranslation } from "@/lib/i18n/context"
import { catalogTemplateCounts } from "@winelore/core/commission"
import { EntityCard, type EntityCardDensity, type EntityCardMeta } from "./EntityCard"
import { templateStatusAppearance } from "./statusAppearance"

export interface TemplateCardData {
    id: string
    name: string
    status?: string | null
    beverageType?: string | null
    createdAt?: string | null
    owners?: number[][] | null
    latestEdition?: {
        id?: string
        version?: number
        status?: string | null
        categories?: Array<{
            id?: string
            name?: string
            properties?: any[]
        }> | null
    } | null
}

interface TemplateCardProps {
    template: TemplateCardData
    /** Owner auid -> username, from useUsernames on the list page. */
    usernames?: Record<string, string>
    density?: EntityCardDensity
}

export function TemplateCard({ template, usernames, density = "comfortable" }: TemplateCardProps) {
    const { t, formatStatus, formatBeverageType } = useTranslation()

    const edition = template.latestEdition
    const statusValue = edition?.status || template.status
    const statusAppearance = templateStatusAppearance(statusValue)
    const versionLabel = edition?.version ? `v${edition.version}` : undefined

    const owners = (template.owners || []).flat()
    const meta: EntityCardMeta[] = []

    if (owners.length > 0) {
        meta.push({
            icon: User,
            label: t("templates.author"),
            value: owners.map((id) => usernames?.[id] || String(id)).join(", "),
        })
    }

    if (template.createdAt) {
        meta.push({
            icon: Calendar,
            label: t("myTemplates.createdAt"),
            value: new Date(template.createdAt).toLocaleDateString("en-CA"),
        })
    }

    if (edition?.categories) {
        const { categories, properties } = catalogTemplateCounts(template as any)
        meta.push({
            icon: Layers,
            value: `${categories} ${t("myTemplates.categories").toLowerCase()} · ${properties} ${t("myTemplates.totalScores").toLowerCase()}`,
        })
    }

    return (
        <EntityCard
            href={`/templates/${template.id}`}
            icon={Layers}
            kicker={template.beverageType ? formatBeverageType(template.beverageType) : null}
            title={template.name}
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
