"use client"

import { useState } from "react"

type AxusAvatarProps = {
    /** Absolute AXUS ID avatar download URL, or null when the user has no photo. */
    imageUrl?: string | null;
    alt: string;
    /** Sizing/rounding for the photo; the fallback renders instead when there is no photo. */
    className?: string;
    /** Existing gradient/initials/placeholder markup shown without a photo or on load error. */
    fallback: React.ReactNode;
};

/**
 * AXUS ID profile photo with graceful fallback. Image loads are lazy so member
 * lists don't fetch dozens of photos up front; any load error (expired redirect,
 * removed photo) swaps back to the fallback instead of a broken image.
 */
export function AxusAvatar({ imageUrl, alt, className, fallback }: AxusAvatarProps) {
    const [failed, setFailed] = useState(false)

    if (!imageUrl || failed) {
        return <>{fallback}</>
    }

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={imageUrl}
            alt={alt}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className={className}
        />
    )
}
