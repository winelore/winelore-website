import * as SecureStore from "expo-secure-store"
import type { AxusSession } from "@winelore/core/auth"

/**
 * The session lives in the iOS Keychain, which is the native counterpart to the
 * web's httpOnly cookies: other apps cannot read it and it survives reinstalls
 * only if the keychain is restored.
 *
 * Fields are stored under separate keys rather than as one JSON blob because
 * SecureStore warns above ~2048 bytes per value, and access tokens are JWTs
 * that can approach that on their own.
 */
const KEYS = {
    accessToken: "axus_access_token",
    refreshToken: "axus_refresh_token",
    auid: "axus_auid",
    username: "axus_username",
    displayName: "axus_display_name",
} as const

/** Keychain items stay readable only after the device has been unlocked once. */
const OPTIONS: SecureStore.SecureStoreOptions = {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
}

type StoredSession = Omit<AxusSession, "expiresIn" | "refreshTokenExpiresIn">
let cachedSession: StoredSession | null | undefined
let queue: Promise<void> = Promise.resolve()

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation, operation)
    queue = result.then(() => undefined, () => undefined)
    return result
}

export async function saveSession(session: AxusSession): Promise<void> {
    await enqueue(async () => {
        await Promise.all([
            SecureStore.setItemAsync(KEYS.accessToken, session.accessToken, OPTIONS),
            SecureStore.setItemAsync(KEYS.refreshToken, session.refreshToken, OPTIONS),
            SecureStore.setItemAsync(KEYS.auid, session.auid, OPTIONS),
            SecureStore.setItemAsync(KEYS.username, session.username, OPTIONS),
            SecureStore.setItemAsync(KEYS.displayName, session.displayName, OPTIONS),
        ])
        cachedSession = session
    })
}

/** The stored session, or null when signed out. */
export async function loadSession(): Promise<StoredSession | null> {
    await queue
    if (cachedSession !== undefined) return cachedSession
    return enqueue(async () => {
        if (cachedSession === undefined) {
            const [accessToken, refreshToken, auid, username, displayName] = await Promise.all([
                SecureStore.getItemAsync(KEYS.accessToken, OPTIONS),
                SecureStore.getItemAsync(KEYS.refreshToken, OPTIONS),
                SecureStore.getItemAsync(KEYS.auid, OPTIONS),
                SecureStore.getItemAsync(KEYS.username, OPTIONS),
                SecureStore.getItemAsync(KEYS.displayName, OPTIONS),
            ])
            cachedSession = refreshToken && auid ? {
                accessToken: accessToken ?? "",
                refreshToken,
                auid,
                username: username ?? "axus_user",
                displayName: displayName ?? `@${username ?? "axus_user"}`,
            } : null
        }
        return cachedSession
    })
}

export async function clearSession(): Promise<void> {
    await enqueue(async () => {
        await Promise.all(
            Object.values(KEYS).map((key) => SecureStore.deleteItemAsync(key, OPTIONS)),
        )
        cachedSession = null
    })
}
