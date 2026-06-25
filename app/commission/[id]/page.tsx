import { getCommissionDataAction } from '../actions';
import CommissionClientView from './CommissionClientView';
import { cookies } from 'next/headers';

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function CommissionStartPage({ params }: PageProps) {
    const resolvedParams = await params;
    const commissionId = resolvedParams.id;

    const cookieStore = await cookies();
    const auidStr = cookieStore.get("auid")?.value;
    const currentAuid = auidStr ? parseInt(auidStr, 10) : null;

    let commission = null;

    try {
        commission = await getCommissionDataAction(commissionId);
    } catch (error) {
        console.error("Error loading initial data:", error);
        commission = null;
    }

    if (!commission) {
        return (
            <div className="flex h-screen items-center justify-center bg-background text-white">
                <div className="text-center">
                    <h2 className="text-3xl font-bold mb-2">Commission not found</h2>
                    <p className="text-muted-foreground">Please check the link or contact your administrator.</p>
                </div>
            </div>
        );
    }

    return (
        <CommissionClientView 
            initialData={commission} 
            serverAuid={currentAuid} 
        />
    );
}
