import { getEvaluationTemplateDetailAction } from "../actions";
import TemplateDetailClientView from "./TemplateDetailClientView";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function TemplateDetailPage({ params }: PageProps) {
    const { id } = await params;
    
    let templateData: any = null;
    try {
        templateData = await getEvaluationTemplateDetailAction(id);
    } catch (error) {
        console.error(`Failed to load template ${id}:`, error);
        notFound();
    }

    if (!templateData) {
        notFound();
    }

    return <TemplateDetailClientView initialTemplate={templateData} />;
}
