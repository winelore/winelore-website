import { useLocalSearchParams } from "expo-router"
import { TemplateScreen } from "../../../../src/templates/TemplateScreen"

/**
 * The web's /templates/[id]. `?version=` opens an edition other than the
 * latest, which is how the commission page links the one it uses.
 */
export default function TemplateRoute() {
    const { id, version } = useLocalSearchParams<{ id: string; version?: string }>()
    const requested = Number(version)
    return <TemplateScreen id={String(id)} version={Number.isInteger(requested) ? requested : undefined} />
}
