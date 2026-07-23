'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createCompetitionInfrastructure, getCompetitionSeriesListAction } from './actions';
import { AppHeader } from '@/components/AppHeader';
import Cookies from "js-cookie";

interface CompetitionFormState {
    name: string;
    seriesId: string;
    plannedStartDate: string;
    plannedEndDate: string;
    holders: number[][];
}

interface SeriesOption {
    id: string;
    name: string;
}

export default function CreateCompetitionPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [seriesList, setSeriesList] = useState<SeriesOption[]>([]);
    const [currentAuid, setCurrentAuid] = useState<number | null>(null);
    const [formData, setFormData] = useState<CompetitionFormState>({
        name: '',
        seriesId: '',
        plannedStartDate: '',
        plannedEndDate: '',
        holders: [],
    });

    const getCurrentAuidHolders = (auid: number): number[][] => [[auid]];

    useEffect(() => {
        const cookieAuid = Cookies.get("auid")
        if (cookieAuid) {
            setCurrentAuid(parseInt(cookieAuid, 10))
        }
    }, [])

    useEffect(() => {
        if (currentAuid === null) return;

        setFormData(prev => ({
            ...prev,
            holders: getCurrentAuidHolders(currentAuid)
        }));
    }, [currentAuid]);

    useEffect(() => {
        if (!currentAuid) return;

        getCompetitionSeriesListAction()
            .then((items) => {
                if (!Array.isArray(items)) {
                    console.warn('Unexpected response shape:', items);
                    return;
                }

                const mySeries = items.filter(series =>
                    series.owners.flat().includes(Number(currentAuid))
                );
                setSeriesList(mySeries);
            })
            .catch((err) => {
                console.error("Error fetching competition series:", err);
            });
    }, [currentAuid]);

    const handleCompetitionChange = (field: keyof CompetitionFormState, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentAuid) {
            setSubmitError('Unable to detect current user. Please sign in again.');
            return;
        }

        if (!formData.seriesId) {
            setSubmitError('Please select a valid Competition Series from the list.');
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);

        try {
            const result = await createCompetitionInfrastructure({
                ...formData,
                holders: getCurrentAuidHolders(currentAuid)
            });

            if (!result.success) {
                throw new Error(result.error);
            }

            router.push('/myCompetitions');
        } catch (err: any) {
            console.error('Cascade activation failed:', err);

            const errorMsg = err.message || '';
            const lower = errorMsg.toLowerCase();
            let friendlyMessage = 'An unexpected error occurred while creating the competition. Please try again.';

            if (lower.includes('failed to fetch') || lower.includes('fetch failed') || lower.includes('server responded with status')) {
                friendlyMessage = 'Network error: Unable to connect to the server. Please check your internet connection.';
            } else if (lower.includes('seriesid') || lower.includes('series id') || lower.includes('failed to convert argument value')) {
                friendlyMessage = 'Please select a valid Competition Series from the list.';
            } else if (lower.includes('name') && (lower.includes('null') || lower.includes('empty') || lower.includes('required'))) {
                friendlyMessage = 'Please fill in the competition name.';
            } else if (lower.includes('holders')) {
                friendlyMessage = 'Please specify at least one holder for the competition.';
            } else if (lower.includes('failed to initialize competition root node')) {
                friendlyMessage = 'Failed to create the competition. Please review the submitted details.';
            } else if (errorMsg) {
                friendlyMessage = `Error: ${errorMsg}`;
            }

            setSubmitError(friendlyMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] font-sans antialiased">
            <AppHeader activeTab="competitions" />

            <main className="max-w-2xl mx-auto px-6 py-12">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-[#0F172A]">New Competition</h1>
                    <p className="text-sm text-[#94A3B8] mt-1">Set a name, series, and schedule to get started.</p>
                </div>

                {submitError && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-sm font-medium">
                        ⚠️ {submitError}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-[#F1F5F9] shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">

                    {/* Name — the headline field */}
                    <div className="p-8 pb-6">
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#94A3B8] mb-2">
                            Competition Name
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g., Wines of the Silver Land 2026"
                            className="text-2xl font-bold text-[#0F172A] bg-transparent border-b-2 border-[#E2E8F0] focus:border-[#5046E5] focus:outline-none w-full pb-2 transition-colors placeholder:text-[#CBD5E1] placeholder:font-normal"
                            value={formData.name}
                            onChange={e => handleCompetitionChange('name', e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="h-px bg-[#F1F5F9]" />

                    {/* Series */}
                    <div className="p-8 py-6">
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#94A3B8] mb-2">
                            Competition Series
                        </label>
                        <select
                            required
                            className="text-base font-semibold text-[#0F172A] bg-[#F8FAFC] rounded-xl px-4 py-3 w-full outline-none border border-transparent focus:border-[#5046E5] cursor-pointer transition-colors"
                            value={formData.seriesId}
                            onChange={e => handleCompetitionChange('seriesId', e.target.value)}
                            disabled={isSubmitting}
                        >
                            <option value="">— Select a series —</option>
                            {seriesList.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="h-px bg-[#F1F5F9]" />

                    {/* Schedule */}
                    <div className="p-8 pt-6">
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#94A3B8] mb-3">
                            Schedule
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-[#F8FAFC] rounded-xl px-4 py-3">
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1">
                                    Planned Start
                                </span>
                                <input
                                    type="datetime-local"
                                    className="w-full text-sm font-medium text-[#334155] bg-transparent border-none outline-none"
                                    value={formData.plannedStartDate}
                                    onChange={e => handleCompetitionChange('plannedStartDate', e.target.value)}
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="bg-[#F8FAFC] rounded-xl px-4 py-3">
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1">
                                    Planned Completion
                                </span>
                                <input
                                    type="datetime-local"
                                    className="w-full text-sm font-medium text-[#334155] bg-transparent border-none outline-none"
                                    value={formData.plannedEndDate}
                                    onChange={e => handleCompetitionChange('plannedEndDate', e.target.value)}
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Action bar */}
                    <div className="flex justify-end gap-3 px-8 py-5 bg-[#F8FAFC] border-t border-[#F1F5F9]">
                        <button
                            type="button"
                            onClick={() => router.push('/')}
                            disabled={isSubmitting}
                            className="px-6 py-2.5 bg-white border border-[#E2E8F0] text-[#475569] text-sm font-semibold rounded-xl hover:bg-[#F1F5F9] disabled:opacity-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2.5 bg-[#5046E5] text-white text-sm font-semibold rounded-xl hover:bg-[#4338CA] transition-all shadow-[0_4px_12px_rgba(80,70,229,0.2)] disabled:opacity-75 flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Competition'
                            )}
                        </button>
                    </div>

                </form>
            </main>
        </div>
    );
}