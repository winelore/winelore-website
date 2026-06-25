"use client"

import React, { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"

const TOTAL_SCORE_CODE = "taste_score"

interface CommissionResultsClientViewProps {
    commission: any
    awardsMap: Record<string, any[]>
}

export default function CommissionResultsClientView({ commission, awardsMap }: CommissionResultsClientViewProps) {
    const router = useRouter()

    // Стейт для порівняння двох реплік
    const [replicaAId, setReplicaAId] = useState<string>("")
    const [replicaBId, setReplicaBId] = useState<string>("")

    // Встановлюємо дефолтні значення для порівняння, якщо є хоча б 2 репліки
    useEffect(() => {
        if (commission?.replicas?.length >= 2) {
            setReplicaAId(commission.replicas[0].id)
            setReplicaBId(commission.replicas[1].id)
        } else if (commission?.replicas?.length === 1) {
            setReplicaAId(commission.replicas[0].id)
        }
    }, [commission])

    useEffect(() => {
        const intervalId = setInterval(() => {
            router.refresh()
        }, 10000)
        return () => clearInterval(intervalId)
    }, [router])

    // --- ДОПОМІЖНІ ФУНКЦІЇ ДЛЯ ОБРОБКИ БАЛІВ ---

    // Отримуємо всі оцінки кандидата в конкретній репліці з розбивкою по категоріях
    const getReplicaCandidateDetails = (replica: any, candidateId: string) => {
        const rc = replica.replicaCandidates.find((c: any) => c.candidate.id === candidateId)
        if (!rc || !rc.evaluations || rc.evaluations.length === 0) return null

        let totalSum = 0
        let totalCount = 0
        const categorySums: Record<string, { sum: number, count: number }> = {}

        rc.evaluations.forEach((ev: any) => {
            if (!ev.isComplete) return
            ev.scores.forEach((score: any) => {
                const val = parseFloat(score.value)
                if (isNaN(val)) return // Ігноруємо булеві значення (true/false) для математики порівняння

                if (score.code === TOTAL_SCORE_CODE) {
                    totalSum += val
                    totalCount++
                } else {
                    if (!categorySums[score.code]) categorySums[score.code] = { sum: 0, count: 0 }
                    categorySums[score.code].sum += val
                    categorySums[score.code].count++
                }
            })
        })

        if (totalCount === 0) return null

        const categories: Record<string, string> = {}
        Object.keys(categorySums).forEach(code => {
            categories[code] = (categorySums[code].sum / categorySums[code].count).toFixed(2)
        })

        return {
            total: (totalSum / totalCount).toFixed(2),
            categories
        }
    }

    // Рахуємо загальний середній бал по всіх репліках для головної таблиці
    const getOverallCandidateAverage = (candidateId: string) => {
        const scores = commission.replicas
            .map((r: any) => getReplicaCandidateDetails(r, candidateId)?.total)
            .filter(Boolean)
            .map((s: string) => parseFloat(s))

        if (scores.length === 0) return "-"
        return (scores.reduce((a: number, b: number) => a + b, 0) / scores.length).toFixed(2)
    }

    // --- ПІДГОТОВКА ДАНИХ ДЛЯ ПОРІВНЯННЯ ---
    const replicaA = commission.replicas.find((r: any) => r.id === replicaAId)
    const replicaB = commission.replicas.find((r: any) => r.id === replicaBId)

    // Збираємо всі унікальні числові категорії для відмальовки колонок порівняння
    const allNumericCategories = useMemo(() => {
        const cats = new Set<string>()
        if (replicaA) {
            commission.candidates.forEach((c: any) => {
                const details = getReplicaCandidateDetails(replicaA, c.id)
                if (details) Object.keys(details.categories).forEach(k => cats.add(k))
            })
        }
        if (replicaB) {
            commission.candidates.forEach((c: any) => {
                const details = getReplicaCandidateDetails(replicaB, c.id)
                if (details) Object.keys(details.categories).forEach(k => cats.add(k))
            })
        }
        return Array.from(cats)
    }, [replicaA, replicaB, commission.candidates])

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 md:p-12 font-sans">
            <div className="max-w-7xl mx-auto flex flex-col gap-10">

                <header>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                        Results: {commission.name}
                    </h1>
                </header>

                {/* === БЛОК ПОРІВНЯННЯ РЕПЛІК === */}
                <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                    <div className="mb-6 border-b border-slate-100 pb-4">
                        <h2 className="text-xl font-bold text-slate-800">Replica Comparison Mode</h2>
                        <p className="text-sm text-slate-500 mt-1">Select two replicas to compare expert vs novice scores and category breakdowns.</p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 mb-8">
                        <div className="flex-1">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Replica A</label>
                            <select
                                value={replicaAId}
                                onChange={(e) => setReplicaAId(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg p-2.5 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="" disabled>Select Replica...</option>
                                {commission.replicas.map((r: any) => (
                                    <option key={r.id} value={r.id}>{r.name || r.type}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Replica B</label>
                            <select
                                value={replicaBId}
                                onChange={(e) => setReplicaBId(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg p-2.5 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="" disabled>Select Replica...</option>
                                {commission.replicas.map((r: any) => (
                                    <option key={r.id} value={r.id}>{r.name || r.type}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {replicaA && replicaB && replicaAId !== replicaBId ? (
                        <div className="overflow-x-auto border border-slate-100 rounded-xl">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                <tr className="bg-slate-50">
                                    <th className="py-3 px-4 font-semibold text-slate-600 border-b border-slate-200">Candidate</th>

                                    {/* Загальний бал */}
                                    <th className="py-3 px-4 text-center border-b border-l border-slate-200 bg-indigo-50/30">Total (A)</th>
                                    <th className="py-3 px-4 text-center border-b border-slate-200 bg-indigo-50/30">Total (B)</th>
                                    <th className="py-3 px-4 text-center border-b border-r border-slate-200 font-bold bg-indigo-50/50">Diff (A - B)</th>

                                    {/* Динамічні категорії */}
                                    {allNumericCategories.map(cat => (
                                        <th key={cat} colSpan={3} className="py-3 px-4 text-center border-b border-r border-slate-200 font-medium text-slate-600">
                                            {cat} <span className="text-xs text-slate-400 font-normal block">(A vs B | Diff)</span>
                                        </th>
                                    ))}
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                {commission.candidates.map((candidate: any) => {
                                    const detA = getReplicaCandidateDetails(replicaA, candidate.id)
                                    const detB = getReplicaCandidateDetails(replicaB, candidate.id)

                                    const totalA = detA ? parseFloat(detA.total) : null
                                    const totalB = detB ? parseFloat(detB.total) : null
                                    const totalDiff = (totalA !== null && totalB !== null) ? (totalA - totalB).toFixed(2) : "-"

                                    return (
                                        <tr key={candidate.id} className="hover:bg-slate-50/30">
                                            <td className="py-3 px-4 font-medium text-slate-800">
                                                {candidate.anonymizedCode || "N/A"}
                                            </td>

                                            {/* Totals */}
                                            <td className="py-3 px-4 text-center border-l border-slate-100">{totalA ?? "-"}</td>
                                            <td className="py-3 px-4 text-center">{totalB ?? "-"}</td>
                                            <td className={`py-3 px-4 text-center border-r border-slate-100 font-bold ${totalDiff !== "-" && parseFloat(totalDiff) > 0 ? "text-emerald-600" : totalDiff !== "-" && parseFloat(totalDiff) < 0 ? "text-rose-600" : "text-slate-500"}`}>
                                                {totalDiff !== "-" ? (parseFloat(totalDiff) > 0 ? `+${totalDiff}` : totalDiff) : "-"}
                                            </td>

                                            {/* Categories */}
                                            {allNumericCategories.map(cat => {
                                                const valA = detA?.categories[cat] ? parseFloat(detA.categories[cat]) : null
                                                const valB = detB?.categories[cat] ? parseFloat(detB.categories[cat]) : null
                                                const catDiff = (valA !== null && valB !== null) ? (valA - valB).toFixed(2) : "-"

                                                return (
                                                    <React.Fragment key={cat}>
                                                        <td className="py-3 px-2 text-center text-xs border-l border-slate-100 text-slate-500">{valA ?? "-"}</td>
                                                        <td className="py-3 px-2 text-center text-xs text-slate-500">{valB ?? "-"}</td>
                                                        <td className={`py-3 px-2 text-center text-xs font-semibold border-r border-slate-100 ${catDiff !== "-" && parseFloat(catDiff) > 0 ? "text-emerald-500" : catDiff !== "-" && parseFloat(catDiff) < 0 ? "text-rose-500" : "text-slate-400"}`}>
                                                            {catDiff !== "-" ? (parseFloat(catDiff) > 0 ? `+${catDiff}` : catDiff) : "-"}
                                                        </td>
                                                    </React.Fragment>
                                                )
                                            })}
                                        </tr>
                                    )
                                })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                            {commission.replicas.length < 2
                                ? "Not enough replicas available to compare."
                                : "Select two different replicas above to view the comparison."}
                        </div>
                    )}
                </section>

                {/* === СПРОЩЕНА ГОЛОВНА ТАБЛИЦЯ === */}
                <section className="bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-lg font-bold text-slate-800">Final Overview</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                                <th className="py-4 px-6 font-semibold text-slate-600 text-sm">Code / Beverage</th>
                                <th className="py-4 px-6 font-bold text-indigo-700 text-sm text-center border-l border-slate-100 bg-indigo-50/30">
                                    Overall Average Total
                                </th>
                                <th className="py-4 px-6 font-semibold text-slate-600 text-sm border-l border-slate-100">
                                    Awards
                                </th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                            {commission.candidates.map((candidate: any) => {
                                const beverageId = candidate.sample?.batch?.beverage?.id
                                const beverageName = candidate.sample?.batch?.beverage?.name || "Unknown Beverage"

                                const overallAverage = getOverallCandidateAverage(candidate.id)
                                const allBeverageAwards = awardsMap[beverageId] || []
                                const currentCommissionAwards = allBeverageAwards.filter((a: any) => a.commissionId === commission.id)

                                return (
                                    <tr key={candidate.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800">{candidate.anonymizedCode || "N/A"}</span>
                                                <span className="text-xs text-slate-500">{beverageName}</span>
                                            </div>
                                        </td>

                                        <td className="py-4 px-6 text-center border-l border-slate-50 font-bold text-indigo-700 bg-indigo-50/10">
                                            {overallAverage}
                                        </td>

                                        <td className="py-4 px-6 border-l border-slate-50 w-1/2">
                                            <div className="flex flex-wrap gap-1.5">
                                                {currentCommissionAwards.map((assignment: any) => (
                                                    <span
                                                        key={assignment.id}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/60 shadow-xs"
                                                        title={assignment.award?.description || ""}
                                                    >
                                                            {assignment.award?.badgeUrl && (
                                                                <img
                                                                    src={assignment.award.badgeUrl}
                                                                    alt={assignment.award.name}
                                                                    className="w-3.5 h-3.5 object-contain"
                                                                />
                                                            )}
                                                        {assignment.award?.name || "Unknown Award"}
                                                        </span>
                                                ))}
                                                {currentCommissionAwards.length === 0 && (
                                                    <span className="text-xs text-slate-400 font-normal">No awards yet</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}

                            {commission.candidates.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="py-12 text-center text-slate-400 text-sm">
                                        No candidates registered for this commission yet.
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </section>

            </div>
        </div>
    )
}