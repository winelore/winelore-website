import { useLocalSearchParams } from "expo-router"
import { CreateSampleSheet } from "../../src/beverage/CreateSampleSheet"

/** The web's /sample/create; `?batchId=&beverageId=` are the batch and beverage it was opened from. */
export default function CreateSampleRoute() {
    const { batchId, beverageId } = useLocalSearchParams<{ batchId?: string; beverageId?: string }>()
    return <CreateSampleSheet batchId={batchId || undefined} beverageId={beverageId || undefined} />
}
