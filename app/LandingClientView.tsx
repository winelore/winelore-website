"use client"
import React from "react"
import Link from "next/link"
import {ArrowRight} from "lucide-react"
import {useTranslation} from "@/lib/i18n/context"
import {LanguageSwitcher} from "@/components/LanguageSwitcher"
export default function LandingClientView() {
    const {t} = useTranslation()
    return (
        <div className="flex min-h-screen flex-col bg-slate-50">
            {/* Header */}
            <header
                className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-4 sticky top-0 z-50">
                <div className="flex flex-1 items-center justify-start">
                    <Link href="/"
                          className="text-2xl font-bold tracking-tight text-slate-800 transition-colors hover:text-slate-600">
                        WineLore
                    </Link>
                </div>
                <div className="flex flex-1 items-center justify-end gap-3">
                    <LanguageSwitcher/>
                    <a
                        href="/auth/login"
                        className="flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 shadow-sm"
                    >
                        <span>{t("common.signIn") || "Увійти"}</span>
                    </a>
                </div>
            </header>
            {/* Hero Section */}
            <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
                <h1 className="max-w-4xl text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
                    Manage your beverage <span
                    className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">competitions</span> seamlessly
                </h1>
                <p className="max-w-2xl text-lg md:text-xl text-slate-600 mb-10 leading-relaxed">
                    The ultimate platform for organizing, tracking, and participating in wine and beverage competitions.
                    Join our community of professionals today.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <a
                        href="/auth/login"
                        className="flex items-center gap-2 rounded-full bg-slate-900 px-8 py-4 text-base font-semibold text-white transition-all hover:bg-slate-800 hover:scale-105 hover:shadow-xl hover:shadow-slate-200/50"
                    >
                        Get Started <ArrowRight className="w-5 h-5"/>
                    </a>
                </div>
                {/* Decorative elements */}
                <div
                    className="absolute top-1/2 left-0 -z-10 h-64 w-64 -translate-y-1/2 rounded-full bg-indigo-200/30 blur-3xl"/>
                <div
                    className="absolute top-1/4 right-0 -z-10 h-64 w-64 -translate-y-1/2 rounded-full bg-purple-200/30 blur-3xl"/>
            </main>
        </div>
    )
}
