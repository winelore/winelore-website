import { useEffect, useRef } from "react"

/**
 * What a sheet changed, for the screen behind it. A create form opened from
 * a list is its own screen, and `router.push` returns before it closes, so a
 * list cannot reload "after" it the way it could after the in-app browser
 * closed; the form says what it made instead, and whoever shows that kind of
 * thing reloads.
 */
export type ChangeTopic = "competitions" | "beverages" | `beverage:${string}` | "templates"

const listeners = new Map<string, Set<() => void>>()

export function notifyChanged(topic: ChangeTopic) {
    listeners.get(topic)?.forEach((listener) => listener())
}

/** Calls `onChange` whenever something of `topic` is created or changed elsewhere. */
export function useOnChanged(topic: ChangeTopic, onChange: () => void) {
    const latest = useRef(onChange)
    latest.current = onChange
    useEffect(() => {
        const listener = () => latest.current()
        let set = listeners.get(topic)
        if (!set) listeners.set(topic, (set = new Set()))
        set.add(listener)
        return () => {
            set!.delete(listener)
        }
    }, [topic])
}
