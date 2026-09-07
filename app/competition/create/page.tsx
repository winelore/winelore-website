'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Cookies from 'js-cookie';
import {
    AlertCircle,
    CalendarClock,
    ChevronDown,
    Layers,
    Loader2,
    Plus,
    Trophy,
    Type,
} from 'lucide-react';

import { AppHeader } from '@/components/AppHeader';
import { BackLink } from '@/components/BackLink';
import { useTranslation } from '@/lib/i18n/context';
import { getDateLocale, type MessageKey } from '@/lib/i18n';
import {
    createCompetitionInfrastructure,
    createCompetitionSeriesAction,
    getCompetitionSeriesListAction,
} from './actions';

interface SeriesOption {
    id: string;
    name: string;
}

/** Sentinel <option> value for "I want a brand new series". */
const NEW_SERIES = '__new__';

const pad = (n: number) => String(n).padStart(2, '0');

/** `Date` -> the `YYYY-MM-DDTHH:mm` shape `datetime-local` expects, in local time. */
function toLocalInput(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Backend messages are raw GraphQL strings; map the ones we recognise onto a
 * translated sentence instead of showing the user server internals.
 */
function friendlyError(raw: string | undefined, t: (key: MessageKey) => string): string {
    const lower = (raw || '').toLowerCase();
    if (!lower) return t('competition.createErrorGeneric');
    if (
        lower.includes('failed to fetch') ||
        lower.includes('fetch failed') ||
        lower.includes('server responded with status') ||
        lower.includes('network')
    ) return t('competition.createErrorNetwork');
    if (
        lower.includes('seriesid') ||
        lower.includes('series id') ||
        lower.includes('competition series') ||
        lower.includes('failed to convert argument value')
    ) return t('competition.createErrorSeries');
    if (lower.includes('name') && (lower.includes('null') || lower.includes('empty') || lower.includes('required'))) {
        return t('competition.createErrorName');
    }
    if (lower.includes('authentication') || lower.includes('unauthorized')) return t('competition.createErrorAuth');
    return t('competition.createErrorGeneric');
}

function SectionHeader({ step, title, icon: Icon, hint, badge }: {
    step: number;
    title: string;
    icon: React.ElementType;
    hint?: string;
    badge?: string;
}) {
    return (
        // A single-line header centres against the icon tile; a two-line one
        // (title + hint) hangs from the top instead, or the tile drifts low.
        <div className={`flex gap-3 ${hint ? 'items-start' : 'items-center'}`}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                <Icon className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-extrabold tracking-tight text-slate-800">
                        <span className="mr-1.5 text-slate-300">{step}</span>
                        {title}
                    </h2>
                    {badge && (
                        <span className="rounded-full border border-slate-100 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {badge}
                        </span>
                    )}
                </div>
                {hint && <p className="mt-0.5 text-xs font-medium text-slate-400">{hint}</p>}
            </div>
        </div>
    );
}

function FieldError({ message }: { message: string }) {
    return (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-600">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {message}
        </p>
    );
}

function SummaryRow({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
    return (
        <div className="flex flex-col gap-0.5 py-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
            <span className={`text-xs font-semibold break-words ${muted ? 'text-slate-400' : 'text-slate-700'}`}>
                {value}
            </span>
        </div>
    );
}

export default function CreateCompetitionPage() {
    const router = useRouter();
    const { t, locale } = useTranslation();

    const nameRef = useRef<HTMLInputElement>(null);
    const newSeriesRef = useRef<HTMLInputElement>(null);
    const endRef = useRef<HTMLInputElement>(null);

    const [currentAuid, setCurrentAuid] = useState<number | null>(null);
    const [authChecked, setAuthChecked] = useState(false);

    const [name, setName] = useState('');
    const [seriesSelection, setSeriesSelection] = useState('');
    const [newSeriesName, setNewSeriesName] = useState('');
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');

    const [seriesList, setSeriesList] = useState<SeriesOption[]>([]);
    const [seriesLoading, setSeriesLoading] = useState(true);

    const [showErrors, setShowErrors] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        const cookieAuid = Cookies.get('auid');
        setCurrentAuid(cookieAuid ? parseInt(cookieAuid, 10) : null);
        setAuthChecked(true);
    }, []);

    useEffect(() => {
        if (!authChecked) return;
        if (!currentAuid) {
            setSeriesLoading(false);
            return;
        }

        let cancelled = false;
        setSeriesLoading(true);
        getCompetitionSeriesListAction()
            .then((items) => {
                if (cancelled) return;
                if (!Array.isArray(items)) return;
                const mySeries: SeriesOption[] = items.filter((series: any) =>
                    series.owners?.flat().includes(Number(currentAuid))
                );
                setSeriesList(mySeries);
                if (mySeries.length > 0) setSeriesSelection(mySeries[0].id);
            })
            .catch((err) => {
                console.error('Error fetching competition series:', err);
            })
            .finally(() => {
                if (!cancelled) setSeriesLoading(false);
            });

        return () => { cancelled = true; };
    }, [authChecked, currentAuid]);

    const trimmedName = name.trim();
    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;

    const invalid = {
        name: trimmedName.length === 0,
        seriesName: seriesSelection === NEW_SERIES && newSeriesName.trim().length === 0,
        dates: !!(startDate && endDate && endDate.getTime() <= startDate.getTime()),
    };

    const dateFormatter = useMemo(
        () => new Intl.DateTimeFormat(getDateLocale(locale), { dateStyle: 'medium', timeStyle: 'short' }),
        [locale]
    );

    const durationLabel = useMemo(() => {
        if (!startDate || !endDate || invalid.dates) return null;
        const diff = endDate.getTime() - startDate.getTime();
        const days = Math.floor(diff / 86_400_000);
        const hours = Math.floor((diff % 86_400_000) / 3_600_000);
        const minutes = Math.floor((diff % 3_600_000) / 60_000);
        if (days > 0) return t('time.duration', { days, hours });
        if (hours > 0) return t('time.durationHoursMinutes', { hours, minutes });
        return t('time.durationMinutes', { minutes });
    }, [start, end, invalid.dates, t]); // eslint-disable-line react-hooks/exhaustive-deps

    const selectedSeriesName = useMemo(() => {
        if (seriesSelection === NEW_SERIES) return newSeriesName.trim() || t('competition.createSeriesNewLabel');
        const found = seriesList.find(s => s.id === seriesSelection);
        return found ? found.name : null;
    }, [seriesSelection, newSeriesName, seriesList, t]);

    const applyPreset = (kind: 'today' | 'tomorrow' | 'nextWeek') => {
        const base = new Date();
        if (kind === 'today') {
            base.setMinutes(0, 0, 0);
            base.setHours(base.getHours() + 1);
        } else {
            base.setDate(base.getDate() + (kind === 'tomorrow' ? 1 : 7));
            base.setHours(9, 0, 0, 0);
        }

        setStart(toLocalInput(base));
        const current = end ? new Date(end) : null;
        if (!current || current.getTime() <= base.getTime()) {
            setEnd(toLocalInput(new Date(base.getTime() + 8 * 3_600_000)));
        }
    };

    const clearSchedule = () => {
        setStart('');
        setEnd('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setShowErrors(true);
        setSubmitError(null);

        if (!currentAuid) {
            setSubmitError(t('competition.createErrorAuth'));
            return;
        }
        // Field-level problems are already called out inline next to the field,
        // so focus the offender rather than repeating the message in the footer.
        if (invalid.name) {
            nameRef.current?.focus();
            return;
        }
        if (invalid.seriesName) {
            newSeriesRef.current?.focus();
            return;
        }
        if (invalid.dates) {
            endRef.current?.focus();
            return;
        }

        setIsSubmitting(true);
        try {
            let seriesId = seriesSelection === NEW_SERIES ? '' : seriesSelection;

            if (seriesSelection === NEW_SERIES) {
                const seriesResult = await createCompetitionSeriesAction(newSeriesName, currentAuid);
                if (!seriesResult.success || !seriesResult.id) {
                    throw new Error(seriesResult.error || 'competition series');
                }
                seriesId = seriesResult.id;
            }

            const result = await createCompetitionInfrastructure({
                name: trimmedName,
                seriesId,
                plannedStartDate: start,
                plannedEndDate: end,
                holders: [[currentAuid]],
            });

            if (!result.success || !result.competitionId) {
                throw new Error(result.error || '');
            }

            toast.success(t('competition.createSuccess'));
            router.push(`/competition/${result.competitionId}`);
        } catch (err: any) {
            console.error('Competition creation failed:', err);
            const message = friendlyError(err?.message, t);
            setSubmitError(message);
            toast.error(message);
            setIsSubmitting(false);
        }
    };

    const inputClass = (hasError: boolean) =>
        `w-full rounded-xl border bg-slate-50/50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-all placeholder:font-medium placeholder:text-slate-300 disabled:cursor-not-allowed disabled:opacity-60 ${
            hasError
                ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                : 'border-slate-200 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20'
        }`;

    const presets: { key: 'today' | 'tomorrow' | 'nextWeek'; label: string }[] = [
        { key: 'today', label: t('competition.createPresetToday') },
        { key: 'tomorrow', label: t('competition.createPresetTomorrow') },
        { key: 'nextWeek', label: t('competition.createPresetNextWeek') },
    ];

    return (
        <div className="flex h-screen flex-col bg-slate-50/50 text-slate-800">
            <AppHeader activeTab="competitions" />

            <main className="flex-1 overflow-auto px-4 py-6 sm:px-6 sm:py-8">
                <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
                    <BackLink href="/myCompetitions" label={t('competition.createBack')} />

                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                            <Trophy className="h-7 w-7" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="truncate text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">
                                {t('competition.createTitle')}
                            </h1>
                            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">{t('competition.createSubtitle')}</p>
                        </div>
                    </div>

                    {authChecked && !currentAuid && (
                        <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            {t('competition.createErrorAuth')}
                        </div>
                    )}

                    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                        <form
                            onSubmit={handleSubmit}
                            noValidate
                            className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-xl shadow-slate-200/50"
                        >
                            {/* 1 — Basics */}
                            <section className="flex flex-col gap-5 p-6 sm:p-8">
                                <SectionHeader
                                    step={1}
                                    title={t('competition.createSectionBasics')}
                                    icon={Type}
                                />

                                <div className="flex flex-col gap-2">
                                    <label htmlFor="competition-name" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        {t('myCompetitions.nameLabel')}
                                    </label>
                                    <input
                                        id="competition-name"
                                        ref={nameRef}
                                        type="text"
                                        autoFocus
                                        autoComplete="off"
                                        placeholder={t('myCompetitions.namePlaceholder')}
                                        className={`${inputClass(showErrors && invalid.name)} text-base`}
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        disabled={isSubmitting}
                                        aria-invalid={showErrors && invalid.name}
                                    />
                                    {showErrors && invalid.name
                                        ? <FieldError message={t('competition.createErrorName')} />
                                        : <p className="text-xs font-medium text-slate-400">{t('competition.createNameHint')}</p>}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label htmlFor="competition-series" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        {t('myCompetitions.seriesLabel')}
                                    </label>
                                    <div className="relative">
                                        <select
                                            id="competition-series"
                                            className={`${inputClass(false)} cursor-pointer appearance-none pr-11`}
                                            value={seriesSelection}
                                            onChange={e => setSeriesSelection(e.target.value)}
                                            disabled={isSubmitting || seriesLoading}
                                        >
                                            {seriesList.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                            <option value="">{t('myCompetitions.autoAssignSeries')}</option>
                                            <option value={NEW_SERIES}>{t('competition.createSeriesNew')}</option>
                                        </select>
                                        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                                            {seriesLoading
                                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                                : <ChevronDown className="h-4 w-4" />}
                                        </span>
                                    </div>

                                    {seriesSelection === NEW_SERIES ? (
                                        <div className="mt-1 flex flex-col gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
                                            <label htmlFor="new-series-name" className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">
                                                {t('competition.createSeriesNewLabel')}
                                            </label>
                                            <input
                                                id="new-series-name"
                                                ref={newSeriesRef}
                                                type="text"
                                                autoComplete="off"
                                                placeholder={t('competition.createSeriesNewPlaceholder')}
                                                className={`${inputClass(showErrors && invalid.seriesName)} bg-white`}
                                                value={newSeriesName}
                                                onChange={e => setNewSeriesName(e.target.value)}
                                                disabled={isSubmitting}
                                                aria-invalid={showErrors && invalid.seriesName}
                                            />
                                            {showErrors && invalid.seriesName && (
                                                <FieldError message={t('competition.createErrorSeriesName')} />
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-xs font-medium text-slate-400">
                                            {seriesLoading
                                                ? t('competition.createSeriesLoading')
                                                : seriesList.length === 0
                                                    ? t('competition.createSeriesEmpty')
                                                    : t('competition.createSeriesHint')}
                                        </p>
                                    )}
                                </div>
                            </section>

                            <div className="h-px bg-slate-100" />

                            {/* 2 — Schedule */}
                            <section className="flex flex-col gap-5 p-6 sm:p-8">
                                <SectionHeader
                                    step={2}
                                    title={t('competition.schedule')}
                                    icon={CalendarClock}
                                    badge={t('competition.createOptional')}
                                    hint={t('competition.createScheduleHint')}
                                />

                                <div className="flex flex-wrap items-center gap-2">
                                    {presets.map(preset => (
                                        <button
                                            key={preset.key}
                                            type="button"
                                            onClick={() => applyPreset(preset.key)}
                                            disabled={isSubmitting}
                                            className="cursor-pointer rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-600 transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50"
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                    {(start || end) && (
                                        <button
                                            type="button"
                                            onClick={clearSchedule}
                                            disabled={isSubmitting}
                                            className="cursor-pointer rounded-full px-3 py-1.5 text-xs font-bold text-slate-400 transition-colors hover:text-slate-600 disabled:opacity-50"
                                        >
                                            {t('competition.createPresetClear')}
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="flex flex-col gap-2">
                                        <label htmlFor="planned-start" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                            {t('competition.plannedStart')}
                                        </label>
                                        <input
                                            id="planned-start"
                                            type="datetime-local"
                                            className={inputClass(false)}
                                            value={start}
                                            onChange={e => setStart(e.target.value)}
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label htmlFor="planned-end" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                            {t('competition.plannedEnd')}
                                        </label>
                                        <input
                                            id="planned-end"
                                            ref={endRef}
                                            type="datetime-local"
                                            min={start || undefined}
                                            className={inputClass(invalid.dates)}
                                            value={end}
                                            onChange={e => setEnd(e.target.value)}
                                            disabled={isSubmitting}
                                            aria-invalid={invalid.dates}
                                        />
                                    </div>
                                </div>

                                {invalid.dates ? (
                                    <FieldError message={t('competition.createErrorDates')} />
                                ) : durationLabel && (
                                    <div className="flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600">
                                        <CalendarClock className="h-3.5 w-3.5" />
                                        {t('competition.createDuration')}: {durationLabel}
                                    </div>
                                )}
                            </section>

                            {/* Action bar */}
                            <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                                <div className="min-w-0 flex-1">
                                    {submitError && (
                                        <p className="flex items-start gap-1.5 text-xs font-semibold text-rose-600">
                                            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
                                            {submitError}
                                        </p>
                                    )}
                                </div>
                                <div className="flex shrink-0 items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => router.push('/myCompetitions')}
                                        disabled={isSubmitting}
                                        className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                                    >
                                        {t('competition.cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || (authChecked && !currentAuid)}
                                        className="flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/20 transition-all hover:from-indigo-500 hover:to-violet-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                <span>{t('myCompetitions.creating')}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="h-4 w-4" />
                                                <span>{t('myCompetitions.createButton')}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>

                        {/* Live summary */}
                        <aside className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm lg:sticky lg:top-6">
                            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                {t('competition.createSummaryTitle')}
                            </h2>

                            <div className="mt-4 flex items-center gap-3 border-b border-slate-100 pb-4">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                                    <Trophy className="h-5 w-5" />
                                </div>
                                <p className={`min-w-0 flex-1 text-base font-bold break-words ${trimmedName ? 'text-slate-800' : 'text-slate-300'}`}>
                                    {trimmedName || t('competition.createSummaryUntitled')}
                                </p>
                            </div>

                            <div className="divide-y divide-slate-50">
                                <SummaryRow
                                    label={t('competition.series')}
                                    value={selectedSeriesName || t('competition.createSummarySeriesAuto')}
                                    muted={!selectedSeriesName}
                                />
                                <SummaryRow
                                    label={t('competition.plannedStart')}
                                    value={startDate ? dateFormatter.format(startDate) : t('competition.createNoSchedule')}
                                    muted={!startDate}
                                />
                                <SummaryRow
                                    label={t('competition.plannedEnd')}
                                    value={endDate ? dateFormatter.format(endDate) : t('competition.createNoSchedule')}
                                    muted={!endDate}
                                />
                                {durationLabel && (
                                    <SummaryRow label={t('competition.createDuration')} value={durationLabel} />
                                )}
                                <SummaryRow
                                    label={t('competition.createSummaryHolder')}
                                    value={currentAuid ? t('competition.auid', { id: currentAuid }) : t('common.na')}
                                    muted={!currentAuid}
                                />
                            </div>

                            <p className="mt-4 flex items-start gap-2 rounded-2xl bg-slate-50 p-3 text-[11px] font-medium leading-relaxed text-slate-500">
                                <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                                {t('competition.createNextSteps')}
                            </p>
                        </aside>
                    </div>
                </div>
            </main>
        </div>
    );
}
