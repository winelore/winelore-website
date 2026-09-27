/**
 * Evaluates SmartProperty expression AST nodes (shared with EvaluationForm and outcome policy score expansion).
 */
export function evaluateAST(
    ast: any,
    /**
     * Judge-entered values by property code. Deliberately `unknown`: an enum
     * answer is a string and a boolean answer is a boolean, and variable
     * lookup below coerces and rejects anything non-numeric, so callers need
     * not pre-filter.
     */
    currentValues: Record<string, unknown>,
): number | null {
    if (!ast) return null

    const { type, __typename } = ast

    if (__typename === "VariableExpression" || type === "VARIABLE") {
        const val = currentValues[ast.code]
        if (val === undefined || val === null) return null
        const num = typeof val === "boolean" ? (val ? 1 : 0) : Number(val)
        return Number.isNaN(num) ? null : num
    }

    if (__typename === "ConstantExpression" || type === "CONSTANT") {
        const num = Number(ast.value)
        return Number.isNaN(num) ? null : num
    }

    const isBinary =
        __typename === "BinaryExpression" ||
        ast.left !== undefined ||
        ast.right !== undefined
    if (!isBinary) return null

    const left = evaluateAST(ast.left, currentValues)
    const right = evaluateAST(ast.right, currentValues)
    if (left === null || right === null) return null

    switch (type) {
        case "ADD":
            return left + right
        case "SUBTRACT":
            return left - right
        case "MULTIPLY":
            return left * right
        case "DIVIDE":
            return right !== 0 ? left / right : null
        case "MODULO":
            return right !== 0 ? left % right : null
        case "POWER":
            return Math.pow(left, right)
        case "GREATER_THAN":
            return left > right ? 1 : 0
        case "GREATER_THAN_OR_EQUAL":
        case "GREATER_OR_EQUAL":
            return left >= right ? 1 : 0
        case "LESS_THAN":
            return left < right ? 1 : 0
        case "LESS_THAN_OR_EQUAL":
        case "LESS_OR_EQUAL":
            return left <= right ? 1 : 0
        case "EQUAL":
        case "EQUALS":
            return left === right ? 1 : 0
        case "NOT_EQUAL":
            return left !== right ? 1 : 0
        case "AND":
            return left !== 0 && right !== 0 ? 1 : 0
        case "OR":
            return left !== 0 || right !== 0 ? 1 : 0
        default:
            return null
    }
}
