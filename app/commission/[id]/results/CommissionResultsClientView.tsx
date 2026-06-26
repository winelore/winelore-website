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

    const [showCompare, setShowCompare] = useState<boolean>(false)
    const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null)
    const [expandedCompareCandidateId, setExpandedCompareCandidateId] = useState<string | null>(null)

    const [replicaAId, setReplicaAId] = useState<string>("")
    const [replicaBId, setReplicaBId] = useState<string>("")

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

    // --- ОБРОБКА БАЛІВ ---

    const getReplicaCandidateDetails = (replica: any, candidateId: string) => {
        const rc = replica.replicaCandidates.find((c: any) => c.candidate.id === candidateId)
        if (!rc || !rc.evaluations || rc.evaluations.length === 0) return null

        let totalSum = 0
        let totalCount = 0
        const categoryValues: Record<string, string[]> = {}

        rc.evaluations.forEach((ev: any) => {
            if (!ev.isComplete) return
            ev.scores.forEach((score: any) => {
                if (score.code === TOTAL_SCORE_CODE) {
                    const val = parseFloat(score.value)
                    if (!isNaN(val)) {
                        totalSum += val
                        totalCount++
                    }
                } else {
                    if (!categoryValues[score.code]) categoryValues[score.code] = []
                    categoryValues[score.code].push(score.value)
                }
            })
        })

        if (totalCount === 0 && Object.keys(categoryValues).length === 0) return null

        const categories: Record<string, string> = {}
        Object.keys(categoryValues).forEach(code => {
            const vals = categoryValues[code]
            const isNumeric = vals.length > 0 && vals.every(v => !isNaN(parseFloat(v)))

            if (isNumeric) {
                const sum = vals.reduce((acc, curr) => acc + parseFloat(curr), 0)
                categories[code] = (sum / vals.length).toFixed(2)
            } else {
                categories[code] = Array.from(new Set(vals)).join(" | ")
            }
        })

        return {
            total: totalCount > 0 ? (totalSum / totalCount).toFixed(2) : "-",
            categories
        }
    }

    // РАХУЄМО СЕРЕДНЄ ТІЛЬКИ ДЛЯ ОСНОВНИХ ЕКСПЕРТІВ (Ігноруємо TRAINEE)
    const getOverallCandidateAverage = (candidateId: string) => {
        const scores = commission.replicas
            .filter((r: any) => r.type !== "TRAINEE")
            .map((r: any) => {
                const details = getReplicaCandidateDetails(r, candidateId)
                return details ? parseFloat(details.total) : NaN
            })
            .filter((s: number) => !isNaN(s))

        if (scores.length === 0) return "-"
        return (scores.reduce((a: number, b: number) => a + b, 0) / scores.length).toFixed(2)
    }

    const getExpertBreakdown = (candidateId: string) => {
        const breakdown: any[] = []
        commission.replicas.forEach((r: any) => {
            const rc = r.replicaCandidates.find((c: any) => c.candidate.id === candidateId)
            if (rc && rc.evaluations) {
                rc.evaluations.forEach((ev: any) => {
                    if (ev.isComplete) {
                        const totalScoreObj = ev.scores.find((s: any) => s.code === TOTAL_SCORE_CODE)
                        // Забираємо всі інші категорії без фільтрації через isNaN
                        const categoryScores = ev.scores.filter((s: any) => s.code !== TOTAL_SCORE_CODE)

                        breakdown.push({
                            replicaName: r.name || r.type,
                            evaluatorId: ev.evaluatorAuid?.join(", ") || "Unknown",
                            totalScore: totalScoreObj ? totalScoreObj.value : "-",
                            scores: categoryScores
                        })
                    }
                })
            }
        })
        return breakdown
    }

    // --- ДАНІ ДЛЯ ПОРІВНЯННЯ ---
    const replicaA = commission.replicas.find((r: any) => r.id === replicaAId)
    const replicaB = commission.replicas.find((r: any) => r.id === replicaBId)

    const allCategoriesKeys = useMemo(() => {
        const cats = new Set<string>()
        const processReplica = (rep: any) => {
            if (!rep) return
            commission.candidates.forEach((c: any) => {
                const details = getReplicaCandidateDetails(rep, c.id)
                if (details) Object.keys(details.categories).forEach(k => cats.add(k))
            })
        }
        processReplica(replicaA)
        processReplica(replicaB)
        return Array.from(cats)
    }, [replicaA, replicaB, commission.candidates])

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 md:p-12 font-sans">
            <div className="max-w-7xl mx-auto flex flex-col gap-10">

                <header className="flex justify-between items-center">
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                        Results: {commission.name}
                    </h1>
                    <button
                        onClick={() => setShowCompare(!showCompare)}
                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        {showCompare ? "Back to Final Overview" : "Compare Replicas"}
                    </button>
                </header>

                {showCompare ? (
                    <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                        <div className="mb-6 border-b border-slate-100 pb-4">
                            <h2 className="text-xl font-bold text-slate-800">Replica Comparison Mode</h2>
                            <p className="text-sm text-slate-500 mt-1">Select two replicas to compare expert vs novice scores and category breakdowns.</p>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 mb-8 items-end">
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
                            <button
                                onClick={() => { setReplicaAId(""); setReplicaBId("") }}
                                className="px-4 py-2.5 text-rose-600 font-medium bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200"
                            >
                                Clear
                            </button>
                        </div>

                        {replicaA && replicaB && replicaAId !== replicaBId ? (
                            <div className="overflow-x-auto border border-slate-100 rounded-xl">
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-200">
                                        <th className="py-4 px-6 font-semibold text-slate-600">Candidate</th>
                                        <th className="py-4 px-6 text-center text-slate-600">Total (A)</th>
                                        <th className="py-4 px-6 text-center text-slate-600">Total (B)</th>
                                        <th className="py-4 px-6 text-center font-bold text-slate-800">Diff (A - B)</th>
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
                                            <React.Fragment key={candidate.id}>
                                                <tr
                                                    className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                                                    onClick={() => setExpandedCompareCandidateId(expandedCompareCandidateId === candidate.id ? null : candidate.id)}
                                                >
                                                    <td className="py-4 px-6 font-medium text-slate-800">{candidate.anonymizedCode || "N/A"}</td>
                                                    <td className="py-4 px-6 text-center">{totalA ?? "-"}</td>
                                                    <td className="py-4 px-6 text-center">{totalB ?? "-"}</td>
                                                    <td className={`py-4 px-6 text-center font-bold ${totalDiff !== "-" && parseFloat(totalDiff) > 0 ? "text-emerald-600" : totalDiff !== "-" && parseFloat(totalDiff) < 0 ? "text-rose-600" : "text-slate-500"}`}>
                                                        {totalDiff !== "-" ? (parseFloat(totalDiff) > 0 ? `+${totalDiff}` : totalDiff) : "-"}
                                                    </td>
                                                </tr>

                                                {expandedCompareCandidateId === candidate.id && (
                                                    <tr>
                                                        <td colSpan={4} className="p-0 border-b border-slate-200 bg-slate-50/80 shadow-inner">
                                                            <div className="p-6">
                                                                <h4 className="text-sm font-bold text-slate-700 mb-4">Category Breakdown Comparison</h4>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                                    {allCategoriesKeys.map(cat => {
                                                                        const valA = detA?.categories[cat] ?? null
                                                                        const valB = detB?.categories[cat] ?? null

                                                                        const isNumericCat = valA !== null && valB !== null && !isNaN(parseFloat(valA)) && !isNaN(parseFloat(valB))

                                                                        let diffDisplay = "-"
                                                                        let diffColor = "text-slate-400"

                                                                        if (valA !== null && valB !== null) {
                                                                            if (isNumericCat) {
                                                                                const diffNum = parseFloat(valA) - parseFloat(valB)
                                                                                diffDisplay = diffNum > 0 ? `+${diffNum.toFixed(2)}` : diffNum.toFixed(2)
                                                                                diffColor = diffNum > 0 ? "text-emerald-500" : diffNum < 0 ? "text-rose-500" : "text-slate-400"
                                                                            } else {
                                                                                diffDisplay = valA === valB ? "=" : "≠"
                                                                                diffColor = valA === valB ? "text-slate-400" : "text-amber-500"
                                                                            }
                                                                        }

                                                                        return (
                                                                            <div key={cat} className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 text-sm">
                                                                                <div className="font-semibold text-slate-600 mb-2 capitalize border-b border-slate-100 pb-1">
                                                                                    {cat.replace(/_/g, ' ')}
                                                                                </div>
                                                                                <div className="flex justify-between items-center mt-2">
                                                                                    <div className="flex flex-col space-y-1">
                                                                                        <span className="text-xs text-slate-400">Rep A: <span className="font-medium text-slate-700">{valA ?? "-"}</span></span>
                                                                                        <span className="text-xs text-slate-400">Rep B: <span className="font-medium text-slate-700">{valB ?? "-"}</span></span>
                                                                                    </div>
                                                                                    <div className={`font-bold text-base ${diffColor}`}>
                                                                                        {diffDisplay}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
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
                ) : (
                    <section className="bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800">Final Overview</h2>
                            <span className="text-xs font-semibold text-slate-500 bg-slate-200 px-2 py-1 rounded">TRAINEE scores excluded from total</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-100">
                                    <th className="py-4 px-6 font-semibold text-slate-600 text-sm">Code / Beverage</th>
                                    <th className="py-4 px-6 font-bold text-indigo-700 text-sm text-center border-l border-slate-100 bg-indigo-50/30 w-48">
                                        Overall Average Total
                                    </th>
                                    <th className="py-4 px-6 font-semibold text-slate-600 text-sm border-l border-slate-100 w-1/2">
                                        Awards
                                    </th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                {commission.candidates.map((candidate: any) => {
                                    const beverageId = candidate.sample?.batch?.beverage?.id
                                    const beverageName = candidate.sample?.batch?.beverage?.name || "Unknown Beverage"

                                    // Розрахунок без TRAINEE
                                    const overallAverage = getOverallCandidateAverage(candidate.id)

                                    const allBeverageAwards = awardsMap[beverageId] || []
                                    const currentCommissionAwards = allBeverageAwards.filter((a: any) => a.commissionId === commission.id)
                                    const expertBreakdown = getExpertBreakdown(candidate.id)

                                    return (
                                        <React.Fragment key={candidate.id}>
                                            <tr
                                                className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                                                onClick={() => setExpandedCandidateId(expandedCandidateId === candidate.id ? null : candidate.id)}
                                            >
                                                <td className="py-4 px-6">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-800">{candidate.anonymizedCode || "N/A"}</span>
                                                        <span className="text-xs text-slate-500">{beverageName}</span>
                                                    </div>
                                                </td>

                                                <td className="py-4 px-6 text-center border-l border-slate-50 font-bold text-indigo-700 bg-indigo-50/10 text-lg">
                                                    {overallAverage}
                                                </td>

                                                <td className="py-4 px-6 border-l border-slate-50">
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

                                            {expandedCandidateId === candidate.id && (
                                                <tr>
                                                    <td colSpan={3} className="p-0 border-b border-slate-200 bg-slate-50/80 shadow-inner">
                                                        <div className="p-6">
                                                            <h4 className="text-sm font-bold text-slate-700 mb-4">Detailed Expert Breakdown</h4>
                                                            {expertBreakdown.length > 0 ? (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                                    {expertBreakdown.map((expert, idx) => (
                                                                        <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col">
                                                                            <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-3">
                                                                                <div className="flex flex-col">
                                                                                    <span className="text-xs font-bold text-slate-500 uppercase">{expert.replicaName}</span>
                                                                                    <span className="text-xs font-mono text-slate-400 mt-0.5">ID: {expert.evaluatorId}</span>
                                                                                </div>
                                                                                <div className="text-xl font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                                                                                    {expert.totalScore}
                                                                                </div>
                                                                            </div>
                                                                            <div className="space-y-1.5 flex-1">
                                                                                {expert.scores.map((score: any) => (
                                                                                    <div key={score.code} className="flex justify-between items-center text-sm">
                                                                                        <span className="text-slate-600 capitalize text-xs">{score.code.replace(/_/g, ' ')}</span>
                                                                                        <span className="font-medium text-slate-800">{score.value}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className="text-sm text-slate-500 italic">No detailed evaluations available yet.</p>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
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
                )}
            </div>
        </div>
    )
}