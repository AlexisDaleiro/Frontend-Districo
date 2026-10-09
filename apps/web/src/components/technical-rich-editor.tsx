"use client";

import { useEffect, useMemo } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TableHeader, TableKit } from "@tiptap/extension-table";
import { Bold, Italic, List, ListOrdered, Undo2, Redo2, Table2, Rows3, Columns3, Trash2, Combine, Split } from "lucide-react";

const header = TableHeader.extend({
  addAttributes() {
    return { ...this.parent?.(), scope: { default: null, parseHTML: (element) => element.getAttribute("scope") } };
  },
});
const extensions = [
  StarterKit.configure({ heading: { levels: [3] }, link: false, underline: false, strike: false, code: false, codeBlock: false, blockquote: false, horizontalRule: false }),
  // Table sizing is handled by CSS; cells remain editable without resize handles.
  TableKit.configure({ table: { View: null, resizable: false }, tableHeader: false }), header,
];

export function TechnicalRichEditor({ label, content, onChange, disabled }: {
  label: string; content: string; onChange: (html: string) => void; disabled: boolean;
}) {
  const editorProps = useMemo(() => ({ attributes: { role: "textbox", "aria-label": label, "aria-multiline": "true", class: "technical-rich-content" } }), [label]);
  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content,
    editable: !disabled,
    editorProps,
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
  });
  useEffect(() => { editor?.setEditable(!disabled, false); }, [editor, disabled]);
  const state = useEditorState({ editor, selector: ({ editor: current }) => current ? {
    bold: current.isActive("bold"), italic: current.isActive("italic"), bulletList: current.isActive("bulletList"), orderedList: current.isActive("orderedList"),
    table: current.isActive("table"), canUndo: current.can().undo(), canRedo: current.can().redo(),
  } : null });
  if (!editor) return <div className="technical-rich-loading" aria-busy="true" />;
  const controls = [
    { label: "Negrita", icon: Bold, active: state?.bold, action: () => editor.chain().focus().toggleBold().run() },
    { label: "Cursiva", icon: Italic, active: state?.italic, action: () => editor.chain().focus().toggleItalic().run() },
    { label: "Lista", icon: List, active: state?.bulletList, action: () => editor.chain().focus().toggleBulletList().run() },
    { label: "Lista numerada", icon: ListOrdered, active: state?.orderedList, action: () => editor.chain().focus().toggleOrderedList().run() },
    { label: "Deshacer", icon: Undo2, unavailable: !state?.canUndo, action: () => editor.chain().focus().undo().run() },
    { label: "Rehacer", icon: Redo2, unavailable: !state?.canRedo, action: () => editor.chain().focus().redo().run() },
    { label: "Insertar tabla", icon: Table2, unavailable: state?.table, action: () => editor.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run() },
  ];
  const tableControls = [
    { label: "Agregar fila", icon: Rows3, action: () => editor.chain().focus().addRowAfter().run() },
    { label: "Quitar fila", icon: Rows3, action: () => editor.chain().focus().deleteRow().run() },
    { label: "Agregar columna", icon: Columns3, action: () => editor.chain().focus().addColumnAfter().run() },
    { label: "Quitar columna", icon: Columns3, action: () => editor.chain().focus().deleteColumn().run() },
    { label: "Unir celdas", icon: Combine, unavailable: !editor.can().mergeCells(), action: () => editor.chain().focus().mergeCells().run() },
    { label: "Separar celdas", icon: Split, unavailable: !editor.can().splitCell(), action: () => editor.chain().focus().splitCell().run() },
    { label: "Eliminar tabla", icon: Trash2, action: () => editor.chain().focus().deleteTable().run() },
  ];
  return <div className="technical-rich-editor">
    <div className="technical-rich-toolbar" role="toolbar" aria-label={`Formato de ${label}`}>
      {[...controls, ...(state?.table ? tableControls : [])].map((control) => {
        const { label: title, icon: Icon, action, unavailable } = control;
        const active = "active" in control ? control.active : undefined;
        return <button
        type="button" className={`icon-button ${active ? "is-active" : ""}`} key={title} title={title} aria-label={title} aria-pressed={active}
        disabled={disabled || unavailable} onMouseDown={(event) => event.preventDefault()} onClick={action}><Icon size={17} /></button>;
      })}
    </div>
    <EditorContent editor={editor} />
  </div>;
}
