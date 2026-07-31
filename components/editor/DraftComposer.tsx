"use client";

import { useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { DraftEditor, plainTextToDoc } from "./DraftEditor";

export function DraftComposer({
  initialContent,
  initialPlainText,
  action,
}: {
  initialContent: JSONContent | null;
  initialPlainText: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const startingDoc = initialContent || plainTextToDoc(initialPlainText);
  const [json, setJson] = useState<JSONContent>(startingDoc);
  const [plainText, setPlainText] = useState(initialPlainText);

  return (
    <form action={action}>
      <DraftEditor
        content={startingDoc}
        editable
        onChange={(newJson, newPlainText) => {
          setJson(newJson);
          setPlainText(newPlainText);
        }}
      />
      <input type="hidden" name="content" value={plainText} />
      <input type="hidden" name="content_json" value={JSON.stringify(json)} />
      <button
        type="submit"
        className="rounded bg-ink px-4 py-2 text-sm font-semibold text-white mt-3"
      >
        儲存新版本
      </button>
    </form>
  );
}
