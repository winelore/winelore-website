import { useLocalSearchParams } from "expo-router"
import { CommissionScreen } from "../../../../../src/commission/CommissionScreen"

/**
 * The web's /commission/[id]. It lives in the Home stack with the session
 * screens it hands off to, which move on with `router.replace`.
 */
export default function CommissionRoute() {
    const { commissionId } = useLocalSearchParams<{ commissionId: string }>()
    return <CommissionScreen id={String(commissionId)} />
}
