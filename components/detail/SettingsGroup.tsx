"use client"

import React from "react"
import { SectionCard } from "./SectionCard"
import { SettingToggle } from "./SettingToggle"

export interface ToggleSpec {
    id: string
    label: string
    description?: string
    checked: boolean
    disabled?: boolean
    onToggle: (next: boolean) => Promise<void> | void
}

/**
 * A collapsible block of on/off settings.
 *
 * Settings are configured once and then ignored for the rest of a session, so
 * they collapse by default instead of pushing the things you actually use —
 * readiness, panels, the start button — below the fold.
 */
export function SettingsGroup({
    title,
    subtitle,
    icon,
    toggles,
    defaultOpen = false,
    columns = 1,
}: {
    title: string
    subtitle?: string
    icon?: React.ComponentType<{ className?: string }>
    toggles: ToggleSpec[]
    defaultOpen?: boolean
    columns?: 1 | 2
}) {
    if (toggles.length === 0) return null

    return (
        <SectionCard title={title} subtitle={subtitle} icon={icon} collapsible defaultOpen={defaultOpen}>
            <div className={`grid gap-2.5 ${columns === 2 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
                {toggles.map(spec => (
                    <SettingToggle
                        key={spec.id}
                        label={spec.label}
                        description={spec.description}
                        checked={spec.checked}
                        disabled={spec.disabled}
                        onToggle={spec.onToggle}
                    />
                ))}
            </div>
        </SectionCard>
    )
}
