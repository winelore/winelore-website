import { getEvaluationTemplatesAction } from "./actions";
import TemplatesClientView from "./TemplatesClientView";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
    let templates: any[] = [];
    let totalCount = 0;
    let hasError = false;

    const cookieStore = await cookies();
    const auidStr = cookieStore.get("auid")?.value;
    const auid = auidStr ? parseInt(auidStr, 10) : undefined;

    try {
        const result = await getEvaluationTemplatesAction(auid);
        templates = result.templates;
        totalCount = result.totalCount;
    } catch (error) {
        console.error("Failed to load templates:", error);
        hasError = true;
    }

    return (
        <TemplatesClientView initialTemplates={templates} totalCount={totalCount} hasError={hasError} />
    );
}
