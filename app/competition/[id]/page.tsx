// app/competition/[id]/page.tsx

import { fetchGraphQL } from '@/lib/apiClient';
import { GET_COMPETITION_PAGE } from './queries';
import CompetitionClientView from './CompetitionClientView';

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function CompetitionStartPage({ params }: PageProps) {
    const resolvedParams = await params;
    const competitionId = resolvedParams.id;

    let competition = null;
    let commissions = [];

    try {
        const data = await fetchGraphQL(GET_COMPETITION_PAGE, { id: competitionId });

        // Додаємо перевірку чи data дійсно існує
        if (data) {
            competition = data.competition;
            commissions = data.commissionsByCompetition?.items || [];
        } else {
            console.error("Порожня відповідь від GraphQL (data is undefined)");
        }
    } catch (error) {
        console.error("Помилка завантаження змагання:", error);
    }

    if (!competition) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-card-foreground mb-2">
                        Змагання не знайдено
                    </h2>
                    <p className="text-muted-foreground">
                        Перевірте правильність посилання або зверніться до адміністратора.
                    </p>
                </div>
            </div>
        );
    }

    // Форматуємо дані для передачі у клієнтський компонент
    const initialData = {
        id: competition.id,
        name: competition.name,
        // Тимчасова заглушка, поки бекенд не оновить схему на сервері:
        seriesId: competition.seriesId || "Очікує бекенд (N/A)",
        status: competition.status,
        startedAt: competition.startedAt,
        plannedStartAt: competition.plannedStartAt,
        holders: competition.holders,
        commissions: commissions.map((comm: any) => ({
            id: comm.id,
            name: comm.name,
            status: comm.status,
            startedAt: comm.startedAt
        }))
    };

    return <CompetitionClientView initialData={initialData} />;
}