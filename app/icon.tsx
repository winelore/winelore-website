import { renderBrandIcon } from "@/lib/brandIcon"

export const contentType = "image/png"

// 32 for the browser tab; 192/512 are what the web app manifest points at.
export function generateImageMetadata() {
    return [32, 192, 512].map((px) => ({
        id: String(px),
        size: { width: px, height: px },
        contentType,
    }))
}

export default async function Icon({ id }: { id: Promise<string | number> }) {
    const px = Number(await id)
    return renderBrandIcon(px)
}
