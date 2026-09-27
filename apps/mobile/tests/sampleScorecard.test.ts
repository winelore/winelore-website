/**
 * The preview route is how the scorecard gets judged on a real device before
 * any backend exists, so its fixture has to actually resolve. A typo in a
 * formula's variable code would leave every subtotal blank and read as a bug
 * in the evaluator rather than in the sample data.
 *
 * Run with `npm run test -w @winelore/mobile`.
 */
import test from "node:test"
import assert from "node:assert/strict"
import {
    buildInitialValues,
    computeSmartValues,
    countRatedProperties,
    getRatableProperties,
    isEvaluationSubmittable,
    isScoringComplete,
} from "@winelore/core/evaluation"
import { sampleCategories } from "../src/evaluation/sampleScorecard"

const fullyScored = {
    clarity: 4,
    colourIntensity: 3,
    noseIntensity: 6,
    noseQuality: 7,
    faulty: false,
    attack: 4.5,
    balance: 6.5,
    length: 7,
    harmony: "GOOD",
}

test("every formula in the sample scorecard resolves", () => {
    const smart = computeSmartValues(sampleCategories, fullyScored)

    assert.equal(smart.visualTotal, 7, "clarity 4 + colourIntensity 3")
    assert.equal(smart.noseTotal, 13, "noseIntensity 6 + noseQuality 7")
    assert.equal(smart.palateTotal, 18, "attack 4.5 + balance 6.5 + length 7")
    // Depends on the three subtotals, so it only resolves after they do.
    assert.equal(smart.total, 38)
})

test("the total stays unresolved until its inputs are scored", () => {
    const smart = computeSmartValues(sampleCategories, { clarity: 4, colourIntensity: 3 })
    assert.equal(smart.visualTotal, 7)
    assert.equal("total" in smart, false, "shown as a dash, not as NaN")
})

test("the sample scorecard blocks submission until required fields are filled", () => {
    assert.equal(isEvaluationSubmittable(sampleCategories, {}, false), false)
    assert.equal(isEvaluationSubmittable(sampleCategories, fullyScored, false), true)
    assert.equal(isScoringComplete(sampleCategories, fullyScored, false), true)
})

test("progress counts only the properties a judge fills in", () => {
    // Nine entered properties; the four formulas are computed, not rated.
    assert.equal(getRatableProperties(sampleCategories).length, 9)
    assert.equal(countRatedProperties(sampleCategories, fullyScored), 9)
    assert.equal(countRatedProperties(sampleCategories, {}), 0, "nothing entered")
    // A judge opening the card sees 1/9 already: `faulty` defaults to false,
    // and false is an answer.
    assert.equal(countRatedProperties(sampleCategories, buildInitialValues(sampleCategories)), 1)
})

test("limits in the sample scorecard are enforced", () => {
    assert.equal(
        isEvaluationSubmittable(sampleCategories, { ...fullyScored, clarity: 9 }, false),
        false,
        "clarity is capped at 5",
    )
})
