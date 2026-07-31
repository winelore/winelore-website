import { Suspense } from "react";
import { getEvaluationTemplatesAction } from "./actions";
import TemplatesClientView from "./TemplatesClientView";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
    let templates: any[] = [];
    let totalCount = 0;

    const cookieStore = await cookies();
    const auidStr = cookieStore.get("auid")?.value;
    const auid = auidStr ? parseInt(auidStr, 10) : undefined;

    try {
        const result = await getEvaluationTemplatesAction(auid);
        templates = result.templates;
        totalCount = result.totalCount;
    } catch (error) {
        console.error("Failed to load templates:", error);
    }

    return (
        <Suspense fallback={<div>Loading templates...</div>}>
            <TemplatesClientView initialTemplates={templates} totalCount={totalCount} />
        </Suspense>
    );
}
