import { useLocalSearchParams } from "expo-router"
import { EditBeverageSheet } from "../../../src/beverage/EditBeverageSheet"

/** The beverage page's edit sheet, above the tabs. */
export default function EditBeverageRoute() {
    const { id } = useLocalSearchParams<{ id: string }>()
    return <EditBeverageSheet id={String(id)} />
}
