import ts from 'typescript';
import type { SceneSource, SourceDiagnostic } from '../../shared/custom-scene';

export function sourcePolicy(source: SceneSource): SourceDiagnostic[] {
  const diagnostics: SourceDiagnostic[] = [];
  Object.entries(source.files)
    .filter(([name]) => /\.tsx?$/.test(name))
    .forEach(([name, text]) => {
      const file = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true);
      const visit = (node: ts.Node): void => {
        let message: string | undefined;
        if (node.kind === ts.SyntaxKind.AnyKeyword)
          message = 'Use explicit property types instead of any.';
        if (
          ts.isCallExpression(node) &&
          (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
            (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
        )
          message = 'Use static imports from scene files, react, remotion or prezi.';
        if (message && diagnostics.length < 50) {
          const point = file.getLineAndCharacterOfPosition(node.getStart(file));
          diagnostics.push({
            file: name,
            line: point.line + 1,
            column: point.character + 1,
            message,
          });
        }
        ts.forEachChild(node, visit);
      };
      visit(file);
    });
  return diagnostics;
}
