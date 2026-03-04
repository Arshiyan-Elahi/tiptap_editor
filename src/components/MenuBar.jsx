import { useEditorState } from "@tiptap/react";
import { menuBarStateSelector } from "./menuBarState";

export const MenuBar = ({
    editor,
    onSave,
    onNewVersion,
    currentVersion,
    onLoadVersion,
    versions,
    onExportPDF,
    isDarkMode,        // ✅ DARK MODE PROP
    onToggleDarkMode   // ✅ DARK MODE TOGGLE
}) => {
    const editorState = useEditorState({
        editor,
        selector: menuBarStateSelector,
    });

    if (!editor) return null;

    const isInTable = editor.isActive("table");

    return (
        <div className="control-group">
            <div className="button-group">
                {/* SAVE & VERSIONS & EXPORT */}
                <button onClick={onSave} title="Manual Save (Ctrl+S)" className="save-btn">
                    Save
                </button>
                <button onClick={onNewVersion} title="Create New Version" className="version-btn">
                    New Version
                </button>

                <select
                    value={currentVersion}
                    onChange={(e) => onLoadVersion(e.target.value)}
                    className="version-select"
                >
                    {versions.map(v => (
                        <option key={v.id} value={v.id}>
                            {v.id} ({new Date(v.timestamp).toLocaleString()})
                        </option>
                    ))}
                </select>

                {/* PDF EXPORT */}
                <button
                    onClick={onExportPDF}
                    className="pdf-export-btn"
                    title="Export to PDF (Ctrl+P)"
                >
                    Export PDF
                </button>

                {/* ✅ DARK MODE TOGGLE BUTTON */}
                <button
                    onClick={onToggleDarkMode}
                    className={`dark-mode-btn ${isDarkMode ? 'active' : ''}`}
                    title="Toggle Dark Mode"
                >
                    {isDarkMode ? '☀️ Light' : '🌙 Dark'}
                </button>

                {/* TEXT FORMATTING */}
                <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    disabled={!editorState.canBold}
                    className={editorState.isBold ? "is-active" : ""}
                >
                    Bold
                </button>

                <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    disabled={!editorState.canItalic}
                    className={editorState.isItalic ? "is-active" : ""}
                >
                    Italic
                </button>

                <button
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    disabled={!editorState.canStrike}
                    className={editorState.isStrike ? "is-active" : ""}
                >
                    Strike
                </button>

                {/* HEADINGS */}
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={editorState.isHeading1 ? "is-active" : ""}
                >
                    Heading 1
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={editorState.isHeading2 ? "is-active" : ""}
                >
                    Heading 2
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={editorState.isHeading3 ? "is-active" : ""}
                >
                    Heading 3
                </button>

                {/* LISTS */}
                <button
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={editorState.isBulletList ? "is-active" : ""}
                >
                    Bullet List
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={editorState.isOrderedList ? "is-active" : ""}
                >
                    Numbered List
                </button>

                {/* HISTORY */}
                <button
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editorState.canUndo}
                >
                    Undo
                </button>
                <button
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editorState.canRedo}
                >
                    Redo
                </button>

                {/* TABLES */}
                <button
                    onClick={() => editor.chain().focus().insertTable({ rows: 4, cols: 4, withHeaderRow: true }).run()}
                >
                    Insert Table
                </button>

                {isInTable && (
                    <>
                        <button onClick={() => editor.chain().focus().addColumnBefore().run()}>
                            Add Col Before
                        </button>
                        <button onClick={() => editor.chain().focus().addColumnAfter().run()}>
                            Add Col After
                        </button>
                        <button onClick={() => editor.chain().focus().deleteColumn().run()}>
                            Delete Column
                        </button>
                        <button onClick={() => editor.chain().focus().addRowBefore().run()}>
                            Add Row Before
                        </button>
                        <button onClick={() => editor.chain().focus().addRowAfter().run()}>
                            Add Row After
                        </button>
                        <button onClick={() => editor.chain().focus().deleteRow().run()}>
                            Delete Row
                        </button>
                        <button onClick={() => editor.chain().focus().deleteTable().run()}>
                            Delete Table
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
