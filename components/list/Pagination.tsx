"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationProps {
    currentPage: number
    totalPages: number
    isLoading?: boolean
    onPageChange: (page: number) => void
}

function getPageNumbers(currentPage: number, totalPages: number): (number | "...")[] {
    if (totalPages <= 5) {
        return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    if (currentPage <= 3) {
        return [1, 2, 3, 4, "...", totalPages]
    }
    if (currentPage >= totalPages - 2) {
        return [1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    }
    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages]
}

export function Pagination({ currentPage, totalPages, isLoading = false, onPageChange }: PaginationProps) {
    if (totalPages <= 1) return null

    return (
        <div className="mt-2 flex items-center justify-center gap-3 shrink-0 pt-2 pb-2">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1 || isLoading}
                className="flex items-center justify-center h-10 w-10 rounded-full bg-white border border-slate-100 text-slate-600 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-slate-300/50 hover:border-indigo-100 disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100"
            >
                <ChevronLeft className="h-5 w-5" />
            </button>

            {getPageNumbers(currentPage, totalPages).map((p, i) =>
                p === "..." ? (
                    <span key={i} className="flex items-center justify-center w-8 h-10 text-slate-400">...</span>
                ) : (
                    <button
                        key={i}
                        onClick={() => onPageChange(p)}
                        disabled={isLoading || p === currentPage}
                        className={`flex items-center justify-center h-10 w-10 rounded-full text-sm font-semibold transition-all duration-300 shadow-xl ${
                            p === currentPage
                                ? "bg-indigo-600 text-white shadow-indigo-200/50 pointer-events-none"
                                : "bg-white border border-slate-100 text-slate-600 shadow-slate-200/50 hover:scale-110 hover:shadow-2xl hover:shadow-slate-300/50 hover:border-indigo-100"
                        }`}
                    >
                        {p}
                    </button>
                )
            )}

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || isLoading}
                className="flex items-center justify-center h-10 w-10 rounded-full bg-white border border-slate-100 text-slate-600 shadow-xl shadow-slate-200/50 transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-slate-300/50 hover:border-indigo-100 disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100"
            >
                <ChevronRight className="h-5 w-5" />
            </button>
        </div>
    )
}
