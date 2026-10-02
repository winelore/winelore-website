"use client"

import React, { useState, useRef, useEffect } from "react"
import { ChevronDown, Search, X, Check } from "lucide-react"
import { COUNTRIES } from "./countries"

export default function CountryMultiSelect({
                                               value,
                                               onChange,
                                               disabled,
                                               placeholder = "Select countries…",
                                           }: {
    value: string[]
    onChange: (codes: string[]) => void
    disabled?: boolean
    placeholder?: string
}) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState("")
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const filtered = COUNTRIES.filter(
        (c) =>
            c.name.toLowerCase().includes(query.toLowerCase()) ||
            c.code.toLowerCase().includes(query.toLowerCase()),
    )

    const selectedCountries = COUNTRIES.filter((c) => value.includes(c.code))

    function toggle(code: string) {
        if (value.includes(code)) {
            onChange(value.filter((c) => c !== code))
        } else {
            onChange([...value, code])
        }
    }

    function remove(code: string, e: React.MouseEvent) {
        e.stopPropagation()
        onChange(value.filter((c) => c !== code))
    }

    return (
        <div ref={containerRef} className="relative w-full">
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen((o) => !o)}
                className="w-full min-h-[48px] rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-left text-slate-800 disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all bg-white flex items-center justify-between gap-2"
            >
                <div className="flex flex-wrap gap-1.5 flex-1">
                    {selectedCountries.length === 0 && (
                        <span className="text-slate-400">{placeholder}</span>
                    )}
                    {selectedCountries.map((c) => (
                        <span
                            key={c.code}
                            className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-semibold"
                        >
                            {c.code}
                            {!disabled && (
                                <span
                                    onClick={(e) => remove(c.code, e)}
                                    className="p-0.5 rounded hover:bg-indigo-100 cursor-pointer"
                                >
                                    <X className="w-3 h-3" />
                                </span>
                            )}
                        </span>
                    ))}
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && !disabled && (
                <div className="absolute z-20 mt-2 w-full max-h-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 flex flex-col">
                    <div className="p-2 border-b border-slate-100 flex items-center gap-2">
                        <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
                        <input
                            autoFocus
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search…"
                            className="w-full text-sm focus:outline-none py-1.5"
                        />
                    </div>
                    <div className="overflow-y-auto">
                        {filtered.length === 0 && (
                            <div className="px-4 py-3 text-sm text-slate-400">No matches</div>
                        )}
                        {filtered.map((c) => {
                            const checked = value.includes(c.code)
                            return (
                                <button
                                    type="button"
                                    key={c.code}
                                    onClick={() => toggle(c.code)}
                                    className="w-full flex items-center justify-between gap-2 px-4 py-2 text-sm text-left hover:bg-slate-50 transition-colors"
                                >
                                    <span className="text-slate-700">
                                        <span className="text-slate-400 font-mono text-xs mr-2">{c.code}</span>
                                        {c.name}
                                    </span>
                                    {checked && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}