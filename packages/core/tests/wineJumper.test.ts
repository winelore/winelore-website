/**
 * Wine Jumper, the mini-game shared by the web's wait page and the app's.
 *
 * Run with `npm run test:core`.
 */
import test from "node:test"
import assert from "node:assert/strict"
import { JUMPER, beginJump, jumperTick, newJumperGame, type JumperState } from "../src/wineJumper"

/** Run the game for a while, jumping whenever `shouldJump` says to. */
function play(ticks: number, shouldJump: (state: JumperState) => boolean = () => false) {
    let state = newJumperGame()
    for (let i = 0; i < ticks && !state.isOver; i += 1) {
        if (shouldJump(state)) state = beginJump(state)
        state = jumperTick(state)
    }
    return state
}

test("a new game starts on the ground with the glass off to the right", () => {
    const start = newJumperGame()
    assert.deepEqual(start, {
        grapeY: 0,
        glassX: JUMPER.glassStart,
        score: 0,
        isJumping: false,
        isOver: false,
    })
})

test("standing still, the first glass runs the grape down", () => {
    const state = play(200)
    assert.equal(state.isOver, true)
    assert.equal(state.score, 0)
    // It ended where the glass reaches the grape's column, not somewhere later.
    assert.ok(state.glassX > JUMPER.hitFrom && state.glassX < JUMPER.hitTo)
})

test("a jump timed for the glass clears it and scores", () => {
    const ready = (s: JumperState) => s.grapeY === 0 && !s.isJumping
    // The grape is above the glass long enough to clear it only if it leaves
    // the ground as the glass closes in.
    const timed = play(300, (s) => s.glassX <= 28 && ready(s))
    assert.equal(timed.isOver, false)
    assert.ok(timed.score >= 3, `expected points, got ${timed.score}`)

    // Too early and it has landed again before the glass arrives; too late and
    // it has not left the ground. Either way the game ends — the timing window
    // is what makes it a game, so it is pinned here.
    assert.equal(play(300, (s) => s.glassX <= 40 && ready(s)).isOver, true)
    assert.equal(play(300, (s) => s.glassX <= 22 && ready(s)).isOver, true)
})

test("a jump rises to its height, then falls back to the ground", () => {
    let state = beginJump(newJumperGame())
    const heights: number[] = []
    for (let i = 0; i < 40; i += 1) {
        state = jumperTick(state)
        heights.push(state.grapeY)
        if (heights.length > 2 && state.grapeY === 0) break
    }
    assert.equal(Math.max(...heights), JUMPER.jumpHeight)
    assert.equal(heights[heights.length - 1], 0)
    // It never overshoots: the rise stops exactly at the top.
    assert.ok(heights.every((height) => height <= JUMPER.jumpHeight))
})

test("a jump only starts from the ground", () => {
    const rising = jumperTick(beginJump(newJumperGame()))
    assert.equal(rising.isJumping, true)
    // Tapping again mid-rise, and mid-fall, changes nothing.
    assert.equal(beginJump(rising), rising)

    let falling = rising
    while (falling.isJumping) falling = jumperTick(falling)
    assert.ok(falling.grapeY > 0)
    assert.equal(beginJump(falling), falling)

    const over: JumperState = { ...newJumperGame(), isOver: true }
    assert.equal(beginJump(over), over)
})

test("a glass off the left edge scores a point and comes back from the right", () => {
    // Put the glass one step from the end, with the grape safely airborne.
    let state: JumperState = {
        grapeY: JUMPER.jumpHeight,
        glassX: JUMPER.glassEnd + JUMPER.glassSpeed,
        score: 3,
        isJumping: true,
        isOver: false,
    }
    state = jumperTick(state)
    assert.equal(state.score, 4)
    assert.equal(state.glassX, JUMPER.glassStart)
})

test("a finished game stays finished", () => {
    const over = play(200)
    assert.equal(over.isOver, true)
    assert.deepEqual(jumperTick(over), over)
})
