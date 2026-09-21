import { useLocalSearchParams } from "expo-router"
import { CreateBatchSheet } from "../../src/beverage/CreateBatchSheet"

/** The web's /batch/create; `?beverageId=` is the beverage it was opened from. */
export default function CreateBatchRoute() {
    const { beverageId } = useLocalSearchParams<{ beverageId?: string }>()
    return <CreateBatchSheet beverageId={beverageId || undefined} />
}
