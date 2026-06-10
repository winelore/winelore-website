import { fetchGraphQL } from '../../../lib/apiClient';
import { GET_COMMISSION, GET_COMPETITION } from './queries';
import CommissionClientView from './CommissionClientView';

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function CommissionStartPage({ params }: PageProps) {
    const resolvedParams = await params;
    const commissionId = resolvedParams.id;

    let commission;

    try {
        const commissionData = await fetchGraphQL(GET_COMMISSION, { id: commissionId });
        commission = commissionData.commission;
    } catch (error) {
        console.error("Помилка завантаження:", error);
        commission = null;
    }

    if (!commission) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-card-foreground mb-2">
                        Комісію не знайдено
                    </h2>
                    <p className="text-muted-foreground">
                        Перевірте правильність посилання або зверніться до адміністратора.
                    </p>
                </div>
            </div>
        );
    }

    let competitionName = "Невідоме змагання";
    try {
        const competitionData = await fetchGraphQL(GET_COMPETITION, { id: commission.competitionId });
        if (competitionData.competition?.name) {
            competitionName = competitionData.competition.name;
        }
    } catch (error) {
        console.log(error);
    }

    const initialData = {
        id: commission.id,
        name: commission.name,
        status: commission.status,
        competitionName: competitionName,
        candidateCount: commission.registeredCandidates?.length || 0,
        creatorUsername: "Система",
        timeElapsed: commission.startedAt ? "В процесі" : "Очікує старту",
        members: commission.members.map((m: any) => ({
            id: m.id,
            auid: m.auid,
            role: m.role,
            username: `Експерт [ID: ${m.auid.join('-')}]`,
        }))
    };

    return <CommissionClientView initialData={initialData} />;
}