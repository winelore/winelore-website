"use client"
import React from "react"
import Link from "next/link"
import {ArrowRight} from "lucide-react"
import {useTranslation} from "@/lib/i18n/context"
import {LanguageSwitcher} from "@/components/LanguageSwitcher"
export default function LandingClientView() {
    const {t} = useTranslation()
    return (
        <div className="flex min-h-app flex-col bg-slate-50/50">
            {/* Header */}
            <header
                className="sticky top-0 z-50 flex shrink-0 items-center justify-between border-b border-slate-100 bg-white/85 backdrop-blur-xl backdrop-saturate-150 px-4 pb-3 pt-[calc(var(--safe-top)+0.75rem)] sm:bg-white sm:px-6 sm:py-4">
                <div className="flex flex-1 items-center justify-start">
                    <Link href="/"
                          className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800 transition-colors hover:text-slate-600">
                        WineLore
                    </Link>
                </div>
                <div className="flex flex-1 items-center justify-end gap-1.5 sm:gap-3">
                    <LanguageSwitcher/>
                    <a
                        href="/auth/login"
                        className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 active:bg-indigo-700 shadow-sm"
                    >
                        <span>{t("common.signIn")}</span>
                    </a>
                </div>
            </header>
            {/* Hero Section */}
            <main className="relative overflow-hidden flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-safe-4 md:py-20 text-center">
                <h1 className="max-w-4xl text-[42px] leading-[1.08] sm:text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-5 sm:mb-6 sm:leading-tight">
                    {t("landing.heroPrefix")}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                        {t("landing.heroHighlight")}
                    </span>
                    {t("landing.heroSuffix")}
                </h1>
                <p className="max-w-2xl text-[17px] sm:text-lg md:text-xl text-slate-600 mb-10 leading-relaxed">
                    {t("landing.subtitle")}
                </p>
                <div className="flex w-full flex-col sm:w-auto sm:flex-row gap-4 justify-center items-center">
                    <a
                        href="/auth/login"
                        className="flex w-full max-w-sm sm:w-auto justify-center items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 px-8 py-4 text-base font-semibold text-white shadow-md shadow-indigo-500/10 transition-all active:scale-95"
                    >
                        {t("landing.getStarted")} <ArrowRight className="w-5 h-5"/>
                    </a>
                </div>
                {/* Decorative elements */}
                <div
                    className="absolute top-1/2 left-0 -z-10 h-64 w-64 -translate-y-1/2 rounded-full bg-indigo-200/30 blur-3xl"/>
                <div
                    className="absolute top-1/4 right-0 -z-10 h-64 w-64 -translate-y-1/2 rounded-full bg-violet-200/30 blur-3xl"/>
            </main>
        </div>
    )
}
