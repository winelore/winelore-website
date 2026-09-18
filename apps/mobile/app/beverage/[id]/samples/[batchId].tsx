import { useLocalSearchParams } from "expo-router"
import { SamplesSheet } from "../../../../src/beverage/SamplesSheet"

/** A batch's samples, as a sheet above the beverage page. */
export default function SamplesRoute() {
    const { id, batchId } = useLocalSearchParams<{ id: string; batchId: string }>()
    return <SamplesSheet id={String(id)} batchId={String(batchId)} />
}
