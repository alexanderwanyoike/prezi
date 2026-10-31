import { EditableText } from './EditableText';

interface Props {
  name: string;
  rename: (name: string) => void;
}
export function ProjectName({ name, rename }: Props): React.JSX.Element {
  return (
    <EditableText
      id="project-name"
      className="project-name"
      label="Presentation name"
      value={name}
      maxLength={200}
      commit={rename}
    />
  );
}
