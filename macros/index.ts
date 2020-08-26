import * as ts from 'typescript'
import { FunctionMacro } from '@blainehansen/macro-ts'

function createConst(name: string, expression: ts.Expression) {
	return ts.createVariableStatement(undefined, ts.createVariableDeclarationList([
		ts.createVariableDeclaration(ts.createIdentifier(name), undefined, expression),
	], ts.NodeFlags.Const))
}

const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed })

function createIdentFromNode(node: ts.Node) {
	const resultFile = ts.createSourceFile('', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS)
	return '___' + printer.printNode(ts.EmitHint.Unspecified, node, resultFile).replace(/[^\w]/g, '_')
}

export const ok = FunctionMacro((ctx, args) => {
	if (args.length !== 1)
		return ctx.TsNodeErr(args, "Incorrect arguments", `The "ok" macro accepts exactly one argument.`)

	const target = args[0]
	const placeholder = createIdentFromNode(target)
	const placeholderIdent = ts.createIdentifier(placeholder)
	return ctx.Ok({
		prepend: [
			createConst(placeholder, target),
			ts.createIf(
				ts.createCall(ts.createPropertyAccess(placeholderIdent, ts.createIdentifier('isErr')), undefined, []),
				ts.createReturn(ts.createCall(ts.createIdentifier('Err'), undefined, [
					ts.createPropertyAccess(placeholderIdent, ts.createIdentifier('error')),
				])),
				undefined,
			),
		],
		expression: ts.createPropertyAccess(placeholderIdent, ts.createIdentifier('value')),
	})
})

export const some = FunctionMacro((ctx, args) => {
	if (args.length !== 1)
		return ctx.TsNodeErr(args, "Incorrect arguments", `The "some" macro accepts exactly one argument.`)

	const target = args[0]
	const placeholder = createIdentFromNode(target)
	const placeholderIdent = ts.createIdentifier(placeholder)
	return ctx.Ok({
		prepend: [
			createConst(placeholder, target),
			ts.createIf(
				ts.createCall(ts.createPropertyAccess(placeholderIdent, ts.createIdentifier('isNone')), undefined, []),
				ts.createReturn(ts.createIdentifier('None')),
				undefined,
			),
		],
		expression: ts.createPropertyAccess(placeholderIdent, ts.createIdentifier('value')),
	})
})
