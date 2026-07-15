'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createCompetitionSeriesAction } from './actions';
import { AppHeader } from '@/components/AppHeader';
import { useTranslation } from "@/lib/i18n/context";
import { Trophy, Globe2, ArrowLeft, Loader2 } from "lucide-react";
import Link from 'next/link';
import Cookies from "js-cookie";

export default function CreateCompetitionSeriesPage() {
    const router = useRouter();
    const { t } = useTranslation();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [currentAuid, setCurrentAuid] = useState<number | null>(null);
    
    const [name, setName] = useState('');
    const [countriesType, setCountriesType] = useState('GLOBAL');

    useEffect(() => {
        const cookieAuid = Cookies.get("auid")
        if (cookieAuid) {
            setCurrentAuid(parseInt(cookieAuid, 10))
        }
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        if (!currentAuid) {
            setSubmitError("User session not found. Please log in.");
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);

        try {
            const result = await createCompetitionSeriesAction(name, countriesType, [[currentAuid]]);
            if (result.success) {
                router.push('/myCompetitionsSeries');
                router.refresh();
            } else {
                setSubmitError(result.error || "Failed to create series");
            }
        } catch (err: any) {
            setSubmitError(err.message || "An unexpected error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex h-screen flex-col bg-slate-50/50">
            <AppHeader activeTab="competitions" onTabChange={() => {}} />

            <main className="flex-1 overflow-auto p-4 md:p-8 flex flex-col items-center">
                <div className="w-full max-w-3xl flex flex-col gap-8">
                    
                    <div className="flex flex-col gap-4">
                        <Link 
                            href="/myCompetitionsSeries"
                            className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors w-fit group"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            <span className="text-sm font-semibold">{t("myCompetitionSeries.title")}</span>
                        </Link>
                        
                        <div>
                            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                                {t("myCompetitionSeries.createTitle")}
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">
                                {t("myCompetitionSeries.createSubtitle")}
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-xl shadow-slate-200/50 flex flex-col gap-8">
                        
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-slate-700 ml-1 flex items-center gap-2">
                                    <Trophy className="w-4 h-4 text-indigo-500" />
                                    {t("myCompetitionSeries.nameLabel")}
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={t("myCompetitionSeries.namePlaceholder")}
                                    className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                                    required
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-slate-700 ml-1 flex items-center gap-2">
                                    <Globe2 className="w-4 h-4 text-indigo-500" />
                                    {t("myCompetitionSeries.countriesTypeLabel")}
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {['GLOBAL', 'SPECIFIC', 'NOT_SPECIFIED'].map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setCountriesType(type)}
                                            className={`px-4 py-3 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                                                countriesType === type
                                                    ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-[1.02]"
                                                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-white hover:border-indigo-200 hover:text-indigo-600"
                                            }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {submitError && (
                            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-semibold flex items-center gap-2">
                                <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                                {submitError}
                            </div>
                        )}

                        <div className="flex items-center gap-4 pt-4">
                            <button
                                type="submit"
                                disabled={isSubmitting || !name.trim()}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-slate-200 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        {t("myCompetitionSeries.creating")}
                                    </>
                                ) : (
                                    t("myCompetitionSeries.createButton")
                                )}
                            </button>
                        </div>
                    </form>

                </div>
            </main>
        </div>
    );
}