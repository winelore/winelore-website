import { getEvaluationTemplatesAction } from "./actions";
import TemplatesClientView from "./TemplatesClientView";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
    let templates: any[] = [];
    try {
        templates = await getEvaluationTemplatesAction();
    } catch (error) {
        console.error("Failed to load templates:", error);
    }

    return <TemplatesClientView initialTemplates={templates} />;
}
