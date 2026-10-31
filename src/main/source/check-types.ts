import ts from 'typescript';
import { posix } from 'node:path';
import { defaultPresentationTheme } from '../../shared/presentation-theme';
import type { SceneCandidate } from '../../shared/scene-definition';
import type { CompilationKind, SceneSource, SourceDiagnostic } from '../../shared/custom-scene';

export function checkSceneTypes(
  source: SceneSource,
  libraries: Record<string, string>,
  fields: SceneCandidate['fields'] = {},
  kind: CompilationKind = 'scene',
): SourceDiagnostic[] {
  const root = '/prezi/scenes/';
  const files = new Map(Object.entries(libraries));
  Object.entries(source.files).forEach(([name, text]) => files.set(`${root}${name}`, text));
  files.set(
    `${root}__prezi_contract.tsx`,
    kind === 'transition'
      ? `import type {TransitionFunction} from 'prezi';
import transition from './${source.entry.replace(/\.tsx$/, '')}';
const accepted: TransitionFunction = transition;
export default accepted;`
      : `import type {ComponentType} from 'react';
import type {SceneProps} from 'prezi';
import Scene from './${source.entry.replace(/\.tsx$/, '')}';
const component: ComponentType<SceneProps> = Scene;
export default component;`,
  );
  const propertyTypes = Object.entries(fields)
    .map(
      ([name, field]) =>
        `${JSON.stringify(name)}: ${{ number: 'number', boolean: 'boolean', text: 'string', color: 'string' }[field.type]};`,
    )
    .join('\n');
  const themeType = Object.entries(defaultPresentationTheme)
    .map(([name, value]) => `${name}: ${typeof value};`)
    .join('');
  files.set(
    '/prezi/node_modules/prezi/index.d.ts',
    `import type {ComponentType, CSSProperties, ReactNode} from 'react';
export interface SceneProps {theme:{${themeType}fontFamily:string;monoFamily:string;}; title:string; body:string; reveal:number; props:{${propertyTypes}}; }
export const Text:ComponentType<{property:keyof SceneProps['props'];layer?:string;style?:CSSProperties}>;
export const Layer:ComponentType<{id:string;children?:ReactNode;style?:CSSProperties}>;
export interface TransitionStyle {opacity?:number;x?:number;y?:number;scale?:number;rotate?:number;blur?:number;clipTop?:number;clipRight?:number;clipBottom?:number;clipLeft?:number;}
export interface TransitionProps {progress:number;direction:'entering'|'exiting';navigation:'advance'|'back';props:SceneProps['props'];}
export type TransitionFunction=(input:TransitionProps)=>TransitionStyle;
`,
  );
  const directories = new Set<string>();
  files.forEach((_text, name) => {
    let directory = posix.dirname(name);
    while (directory !== '/') {
      directories.add(directory);
      directory = posix.dirname(directory);
    }
  });
  const host: ts.CompilerHost = {
    getSourceFile(name, target) {
      const text = files.get(name);
      return text === undefined ? undefined : ts.createSourceFile(name, text, target, true);
    },
    getDefaultLibFileName: () => '/prezi/node_modules/typescript/lib/lib.es2022.full.d.ts',
    getCurrentDirectory: () => root,
    getDirectories: (path) => [...directories].filter((item) => posix.dirname(item) === path),
    fileExists: (path) => files.has(path),
    readFile: (path) => files.get(path),
    directoryExists: (path) => directories.has(path.replace(/\/$/, '')),
    getCanonicalFileName: (path) => path,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    writeFile: () => undefined,
  };
  const program = ts.createProgram({
    rootNames: [...Object.keys(source.files), '__prezi_contract.tsx']
      .filter((name) => /\.tsx?$/.test(name))
      .map((name) => root + name),
    options: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      jsx: ts.JsxEmit.ReactJSX,
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      allowSyntheticDefaultImports: true,
      resolveJsonModule: true,
      types: [],
    },
    host,
  });
  return ts
    .getPreEmitDiagnostics(program)
    .filter((item) => item.category === ts.DiagnosticCategory.Error)
    .slice(0, 50)
    .map((item) => {
      const internal = item.file?.fileName === `${root}__prezi_contract.tsx`;
      const target = internal ? program.getSourceFile(root + source.entry) : item.file;
      const exported = internal
        ? target?.statements.find(
            (statement) =>
              ts.isExportAssignment(statement) ||
              (ts.canHaveModifiers(statement) &&
                ts
                  .getModifiers(statement)
                  ?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)),
          )
        : undefined;
      const point = target?.getLineAndCharacterOfPosition(
        internal ? (exported?.getStart(target) ?? 0) : (item.start ?? 0),
      );
      return {
        file: target?.fileName.replace(root, '') ?? source.entry,
        line: (point?.line ?? 0) + 1,
        column: (point?.character ?? 0) + 1,
        message: ts.flattenDiagnosticMessageText(item.messageText, '\n').slice(0, 2000),
      };
    });
}
