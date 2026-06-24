"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Cookies from "js-cookie"
import { CheckCircle, Clock, Users, Wine, Loader2 } from "lucide-react"
import WineJumperGame from "@/components/WineJumperGame"

export default function WaitPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [auid, setAuid] = useState<number | null>(null);
    const [role, setRole] = useState<string>("EXPERT");
    const [members, setMembers] = useState<any[]>([]);

    const [currentCandidateId, setCurrentCandidateId] = useState<string | null>(null);
    const [evaluations, setEvaluations] = useState<any[]>([]);
    const [isSwitching, setIsSwitching] = useState(false);

    // 1. Отримуємо AUID користувача
    useEffect(() => {
        const cookieAuid = Cookies.get("auid");
        if (cookieAuid) setAuid(parseInt(cookieAuid, 10));
    }, []);

    // 2. Головний цикл (Polling) кожні 3 секунди
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Запитуємо Комісію (щоб знати ролі) і Кандидатів (напої)
                const res = await fetch('http://switchback.proxy.rlwy.net:43233', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: `
                            query GetWaitData($commId: ID!) {
                                commission(id: $commId) {
                                    members { auid role }
                                }
                                commissionCandidatesByCommission(commissionId: $commId, limit: 100) {
                                    items { id status orderIndex }
                                }
                            }
                        `,
                        variables: { commId: params.id }
                    })
                });
                const json = await res.json();

                const commMembers = json.data?.commission?.members || [];
                setMembers(commMembers);

                // Знаходимо роль поточного користувача
                const me = commMembers.find((m: any) => m.auid.includes(auid));
                if (me) setRole(me.role);

                // Знаходимо поточний напій (перший у списку зі статусом PENDING)
                const candidates = json.data?.commissionCandidatesByCommission?.items || [];
                const sortedCandidates = [...candidates].sort((a, b) => a.orderIndex - b.orderIndex);
                const current = sortedCandidates.find((c: any) => c.status === "PENDING");

                if (!current) {
                    // Якщо PENDING немає - дегустація завершена!
                    router.push(`/commission/${params.id}`);
                    return;
                }

                const newCandidateId = current.id;

                // Якщо напій змінився (голова перемкнув) - РЕДІРЕКТИМО ВСІХ НА ОЦІНЮВАННЯ!
                if (currentCandidateId && currentCandidateId !== newCandidateId) {
                    router.push(`/commission/${params.id}/evaluate/${newCandidateId}`);
                    return;
                }

                setCurrentCandidateId(newCandidateId);

                // Якщо ми Голова, дістаємо ще й оцінки для цього напою
                if (me?.role === "HEAD") {
                    const evalsRes = await fetch('http://switchback.proxy.rlwy.net:43233', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            query: `
                                query GetEvals($candId: ID!) {
                                    evaluationsByCandidate(candidateId: $candId, limit: 50) {
                                        items { evaluatorAuid isComplete }
                                    }
                                }
                            `,
                            variables: { candId: newCandidateId }
                        })
                    });
                    const evalsJson = await evalsRes.json();
                    setEvaluations(evalsJson.data?.evaluationsByCandidate?.items || []);
                }

            } catch (err) {
                console.error("Polling error", err);
            }
        };

        fetchData(); // Перший виклик
        const interval = setInterval(fetchData, 3000); // Потім кожні 3 сек
        return () => clearInterval(interval);
    }, [params.id, auid, currentCandidateId, router]);

    // Мутація: Голова перемикає на наступний напій
    const handleNextBeverage = async () => {
        if (!currentCandidateId) return;
        setIsSwitching(true);
        try {
            await fetch('http://switchback.proxy.rlwy.net:43233', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `
                        mutation MarkEvaluated($id: ID!) {
                            markCommissionCandidateAsEvaluated(id: $id) { id status }
                        }
                    `,
                    variables: { id: currentCandidateId }
                })
            });
            // Не робимо редірект вручну, Polling (useEffect) сам побачить зміну статусу і перекине нас!
        } catch (err) {
            console.error(err);
            setIsSwitching(false);
        }
    };

    // Фільтруємо експертів для дашборду Голови
    const experts = members.filter(m => m.role === "EXPERT" || m.role === "TRAINEE_EXPERT");
    const allSubmitted = experts.length > 0 && experts.every(exp =>
        evaluations.some(ev => ev.evaluatorAuid.includes(exp.auid[0]) && ev.isComplete)
    );


    // ==========================================
    // ВІДМАЛЬОВКА ДЛЯ ГОЛОВИ КОМІСІЇ (HEAD)
    // ==========================================
    if (role === "HEAD") {
        return (
            <main className="min-h-screen bg-slate-50 p-6 md:p-10">
                <div className="max-w-5xl mx-auto space-y-8">
                    <header className="flex flex-col sm:flex-row justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Head Dashboard</h1>
                            <p className="text-slate-500 text-sm mt-1">
                                Candidate ID: <span className="font-semibold text-indigo-600">{currentCandidateId || "Loading..."}</span>
                            </p>
                        </div>
                        <button
                            onClick={handleNextBeverage}
                            disabled={!allSubmitted || isSwitching}
                            className={`px-8 py-3.5 rounded-xl font-bold text-white transition-all flex items-center gap-2 ${allSubmitted ? 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30' : 'bg-slate-300 cursor-not-allowed'}`}
                        >
                            {isSwitching ? <Loader2 className="w-5 h-5 animate-spin" /> : "Next Beverage →"}
                        </button>
                    </header>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        {/* Прогрес експертів */}
                        <div className="xl:col-span-2 bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
                            <h2 className="text-lg font-bold flex items-center gap-2 mb-6 text-slate-800">
                                <Users className="text-indigo-500 w-5 h-5" />
                                Experts Progress
                            </h2>
                            <div className="space-y-3">
                                {experts.map((expert, i) => {
                                    const hasSubmitted = evaluations.some(ev => ev.evaluatorAuid.includes(expert.auid[0]) && ev.isComplete);
                                    return (
                                        <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                            <span className="font-semibold text-slate-700">Expert AUID: {expert.auid[0]}</span>
                                            <div className="flex items-center gap-3">
                                                {hasSubmitted ? (
                                                    <>
                                                        <span className="text-emerald-600 font-bold bg-emerald-100 px-3 py-1 rounded-full text-xs">Submitted</span>
                                                        <CheckCircle className="text-emerald-500 w-5 h-5" />
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="text-amber-600 font-bold bg-amber-100 px-3 py-1 rounded-full text-xs">Evaluating...</span>
                                                        <Clock className="text-amber-500 w-5 h-5 animate-pulse" />
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Міні-гра збоку */}
                        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col items-center">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Bored? Play!</h3>
                            <WineJumperGame />
                        </div>
                    </div>
                </div>
            </main>
        )
    }

    // ==========================================
    // ВІДМАЛЬОВКА ДЛЯ ЕКСПЕРТА
    // ==========================================
    return (
        <main className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-center">
            <div className="relative mb-10 flex justify-center">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center animate-pulse">
                    <Wine className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center border-4 border-[#0f172a]">
                    <CheckCircle className="w-4 h-4 text-white" />
                </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
                Evaluation Submitted!
            </h1>
            <p className="text-slate-400 text-lg max-w-md mx-auto mb-14">
                Waiting for the Head of Commission to start the next tasting round.
                Don&apos;t close this page, it will automatically refresh.
            </p>

            {/* ВЕЛИКА ГРА ДЛЯ ЕКСПЕРТА */}
            <div className="w-full max-w-2xl bg-white p-2 rounded-[2.5rem] shadow-2xl shadow-black/50 border border-slate-800">
                <WineJumperGame />
            </div>

            <div className="mt-12 flex items-center gap-3 text-slate-400 font-medium">
                <Loader2 className="w-5 h-5 animate-spin" />
                Waiting for other experts...
            </div>
        </main>
    );
}