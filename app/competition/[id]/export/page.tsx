import { redirect } from "next/navigation";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function CompetitionExportPage({ params }: PageProps) {
    const resolvedParams = await params;
    redirect(`/competition/${resolvedParams.id}/results`);
}
