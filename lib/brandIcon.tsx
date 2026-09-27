import { ImageResponse } from "next/og"

/**
 * The WineLore app mark — a white wine glass on the indigo→violet brand
 * gradient. Rendered to PNG by the `icon` / `apple-icon` routes so the app
 * gets a proper home-screen icon when installed on iOS.
 *
 * `rounded` is off for the Apple touch icon: iOS applies its own mask, and a
 * pre-rounded square would show white corners inside it.
 */
export function renderBrandIcon(size: number, { rounded = true }: { rounded?: boolean } = {}) {
    const glyph = Math.round(size * 0.56)

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(145deg, #6366f1 0%, #4f46e5 45%, #7c3aed 100%)",
                    borderRadius: rounded ? size * 0.225 : 0,
                }}
            >
                {/* lucide "wine" glyph */}
                <svg
                    width={glyph}
                    height={glyph}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M8 22h8" />
                    <path d="M7 10h10" />
                    <path d="M12 15v7" />
                    <path d="M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z" />
                </svg>
            </div>
        ),
        { width: size, height: size },
    )
}
