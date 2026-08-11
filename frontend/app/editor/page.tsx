import { EditorShell } from "@/components/editor/EditorShell";

interface EditorPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function EditorPage({ searchParams }: EditorPageProps) {
  const params = await searchParams;
  // Flatten to a plain string map (URLSearchParams can't hold arrays anyway;
  // Astra's launch contract only ever expects single string values).
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") flat[key] = value;
  }
  return <EditorShell initialSearchParams={flat} />;
}
