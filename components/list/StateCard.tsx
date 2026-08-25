"use client"

import type { LucideIcon } from "lucide-react"
import { AlertCircle } from "lucide-react"

interface StateCardProps {
    variant: "empty" | "error"
    icon?: LucideIcon
    title: string
    description: string
}

export function StateCard({ variant, icon: Icon = AlertCircle, title, description }: StateCardProps) {
    const isError = variant === "error"
    return (
        <div
            className={`col-span-full flex flex-col items-center justify-center py-20 px-4 text-center rounded-[32px] shadow-xl ${
                isError
                    ? "bg-red-50 border border-red-100 shadow-red-200/50"
                    : "bg-white border border-slate-100 shadow-slate-200/50"
            }`}
        >
            <Icon className={`w-12 h-12 mb-4 ${isError ? "text-red-400" : "text-slate-300"}`} />
            <h3 className={`text-lg font-bold ${isError ? "text-red-800" : "text-slate-700"}`}>{title}</h3>
            <p className={`text-sm mt-1 max-w-md ${isError ? "text-red-600" : "text-slate-500"}`}>{description}</p>
        </div>
    )
}
