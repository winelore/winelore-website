import { getCommissionDataAction } from '../actions';
import CommissionClientView from './CommissionClientView';
import CommissionNotFound from './CommissionNotFound';
import { ensureAuthenticated } from '@/lib/auth/session';

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function CommissionStartPage({ params }: PageProps) {
    const resolvedParams = await params;
    const commissionId = resolvedParams.id;

    const auidStr = await ensureAuthenticated();
    const currentAuid = auidStr ? parseInt(auidStr, 10) : null;

    let commission = null;

    try {
        commission = await getCommissionDataAction(commissionId);
    } catch (error) {
        console.error("Error loading initial data:", error);
        commission = null;
    }

    if (!commission) {
        return <CommissionNotFound />;
    }

    return (
        <CommissionClientView 
            initialData={commission} 
            serverAuid={currentAuid} 
        />
    );
}
