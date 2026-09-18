import { useLocalSearchParams } from "expo-router"
import { TemplateEditorSheet } from "../../../src/templates/TemplateEditorSheet"

/** A template's editor — the web's editor dialog, as a page sheet over its page. */
export default function EditTemplateRoute() {
    const { id } = useLocalSearchParams<{ id: string }>()
    return <TemplateEditorSheet templateId={String(id)} />
}
