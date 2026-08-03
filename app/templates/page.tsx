import { Suspense } from "react";
import { getEvaluationTemplatesAction } from "./actions";
import TemplatesClientView from "./TemplatesClientView";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TemplatesPage({ searchParams }: { searchParams: Promise<{ cursor?: string; page?: string }> }) {
    const resolvedParams = await searchParams;
    const cursor = resolvedParams.cursor;
    const currentPage = parseInt(resolvedParams.page || "1", 10);

    const LIMIT = 7;
    let templates: any[] = [];
    let totalCount = 0;
    let nextCursor: string | null = null;

    const cookieStore = await cookies();
    const auidStr = cookieStore.get("auid")?.value;
    if (!auidStr) {
        redirect("/auth/login");
    }
    const auid = parseInt(auidStr, 10);

    try {
        let offset;
        if (!cursor && currentPage > 1) {
            offset = (currentPage - 1) * LIMIT;
        }

        const result = await getEvaluationTemplatesAction(auid, LIMIT, cursor, offset);
        templates = result.templates;
        totalCount = result.totalCount;
        if (result.rawItems && result.rawItems.length > 0) {
            nextCursor = result.rawItems[result.rawItems.length - 1].id;
        }
    } catch (error) {
        console.error("Failed to load templates:", error);
    }
    const totalPages = Math.ceil(totalCount / LIMIT);

    return (
        <Suspense fallback={<div>Loading templates...</div>}>
            <TemplatesClientView
                initialTemplates={templates}
                nextCursor={nextCursor}
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
            />
        </Suspense>
    );
}
