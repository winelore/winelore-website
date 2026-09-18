/**
 * Wine Jumper — the mini-game a commission can switch on to fill the wait
 * between candidates.
 *
 * A grape hops over wine glasses sliding in from the right. The rules are here
 * rather than in either client so the web page and the phone run the same
 * game: the same speed, the same jump, the same score for the same play.
 */

/** One frame. The web ran three timers at 30–50ms; this is the single clock. */
export const JUMPER_TICK_MS = 30

export const JUMPER = {
    /** How far the glass travels each tick, in percent of the field's width. */
    glassSpeed: 1.2,
    /** Where a glass enters, and the point past the left edge where it is done. */
    glassStart: 100,
    glassEnd: -10,
    /** The grape's fixed horizontal position, in percent. */
    grapeX: 15,
    /** How high a jump reaches, and how fast it rises and falls, in pixels. */
    jumpHeight: 80,
    riseSpeed: 10,
    fallSpeed: 5,
    /** A glass within this span of the grape's column is under it. */
    hitFrom: 10,
    hitTo: 20,
    /** The grape clears a glass above this height. */
    clearance: 30,
} as const

export interface JumperState {
    /** The grape's height above the ground, in pixels. */
    grapeY: number
    /** The glass's position, in percent from the left. */
    glassX: number
    score: number
    isJumping: boolean
    isOver: boolean
}

export function newJumperGame(): JumperState {
    return { grapeY: 0, glassX: JUMPER.glassStart, score: 0, isJumping: false, isOver: false }
}

/**
 * Start a jump.
 *
 * Only from the ground: holding the tap or tapping mid-air does nothing, which
 * is what keeps the game a game.
 */
export function beginJump(state: JumperState): JumperState {
    if (state.isOver || state.isJumping || state.grapeY > 0) return state
    return { ...state, isJumping: true }
}

/**
 * Advance one frame: the glass slides left, the grape rises or falls, and a
 * glass that reaches the grape's column while it is low ends the game.
 *
 * A glass that leaves the field scores a point and comes back from the right,
 * so the game has no end but a miss.
 */
export function jumperTick(state: JumperState): JumperState {
    if (state.isOver) return state

    let { grapeY, glassX, score, isJumping } = state

    if (isJumping) {
        grapeY += JUMPER.riseSpeed
        if (grapeY >= JUMPER.jumpHeight) {
            grapeY = JUMPER.jumpHeight
            isJumping = false
        }
    } else if (grapeY > 0) {
        grapeY = Math.max(0, grapeY - JUMPER.fallSpeed)
    }

    glassX -= JUMPER.glassSpeed
    if (glassX <= JUMPER.glassEnd) {
        glassX = JUMPER.glassStart
        score += 1
    }

    // Checked after both have moved, so a jump landing on a glass still counts
    // as a hit rather than slipping through between frames.
    const isOver = glassX > JUMPER.hitFrom && glassX < JUMPER.hitTo && grapeY < JUMPER.clearance

    return { grapeY, glassX, score, isJumping, isOver }
}
