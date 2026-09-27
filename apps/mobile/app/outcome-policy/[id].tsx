import { useLocalSearchParams } from "expo-router"
import { PolicyEditorSheet } from "../../src/outcomePolicies/PolicyEditorSheet"

/** An outcome policy's editor — the web's edit dialog, at the path of the policy's page. */
export default function OutcomePolicyRoute() {
    const { id } = useLocalSearchParams<{ id: string }>()
    return <PolicyEditorSheet id={String(id)} />
}
