import { getEvaluationTemplatesAction } from "./actions";
import MyTemplatesClientView from "./MyTemplatesClientView";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function TemplatesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
    const resolvedParams = await searchParams;
    const parsedPage = parseInt(resolvedParams.page || "1", 10);
    const currentPage = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

    const LIMIT = 6;
    let templates: any[] = [];
    let totalCount = 0;
    let hasError = false;

    const cookieStore = await cookies();
    const auidStr = cookieStore.get("auid")?.value;
    const auid = auidStr ? parseInt(auidStr, 10) : undefined;

    try {
        const offset = (currentPage - 1) * LIMIT;
        const result = await getEvaluationTemplatesAction(auid, LIMIT, offset);
        templates = result.templates;
        totalCount = result.totalCount;
    } catch (error) {
        console.error("Failed to load templates:", error);
        hasError = true;
    }

    const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

    return (
        <MyTemplatesClientView
            initialTemplates={templates}
            totalCount={totalCount}
            totalPages={totalPages}
            currentPage={currentPage}
            hasError={hasError}
        />
    );
}
