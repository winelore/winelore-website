"use client"

import React from "react"
import { Check } from "lucide-react"

export interface StepperStep {
    id: string
    label: string
    description: string
}

/**
 * Three-step progress indicator shared by the competition and commission pages.
 *
 * Both pages had their own copy that laid the steps out with `justify-between`
 * and no connector, so on a wide screen the circles floated apart and read as
 * three unrelated labels rather than a progression. This draws the connecting
 * track and exposes the state to assistive tech.
 */
export function StatusStepper({
    steps,
    currentStepIdx,
    className = "",
}: {
    steps: StepperStep[]
    currentStepIdx: number
    className?: string
}) {
    return (
        <ol
            className={`flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-0 ${className}`}
            aria-label={steps[currentStepIdx]?.label}
        >
            {steps.map((step, idx) => {
                const isCompleted = idx < currentStepIdx
                const isActive = idx === currentStepIdx
                const isLast = idx === steps.length - 1

                return (
                    <li
                        key={step.id}
                        className="relative flex min-w-0 flex-1 items-start gap-3 sm:flex-col sm:gap-0"
                        aria-current={isActive ? "step" : undefined}
                    >
                        <div className="flex shrink-0 flex-col items-center sm:w-full sm:flex-row">
                            <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors duration-300 ${
                                    isCompleted
                                        ? "border-emerald-500 bg-emerald-500 text-white"
                                        : isActive
                                          ? "border-indigo-600 bg-indigo-600 text-white ring-4 ring-indigo-500/15"
                                          : "border-slate-200 bg-slate-50 text-slate-400"
                                }`}
                            >
                                {isCompleted ? <Check className="h-4 w-4" /> : <span>{idx + 1}</span>}
                            </div>

                            {/* Connector: vertical on mobile, horizontal from sm up. */}
                            {!isLast && (
                                <span
                                    aria-hidden
                                    className={`absolute left-4 top-8 h-[calc(100%+1rem)] w-px sm:relative sm:left-auto sm:top-auto sm:mx-3 sm:h-px sm:w-full ${
                                        isCompleted ? "bg-emerald-400" : "bg-slate-200"
                                    }`}
                                />
                            )}
                        </div>

                        <div className="min-w-0 pb-1 sm:mt-3 sm:pr-6">
                            <h4
                                className={`truncate text-xs font-semibold ${
                                    isActive ? "text-slate-900" : isCompleted ? "text-slate-600" : "text-slate-400"
                                }`}
                            >
                                {step.label}
                            </h4>
                            <p className="mt-0.5 text-[11px] text-slate-400">{step.description}</p>
                        </div>
                    </li>
                )
            })}
        </ol>
    )
}
