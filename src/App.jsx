import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import { BlockIdExtension } from './components/BlockIdExtension';
import { MenuBar } from './components/MenuBar';
import { StatusBar } from './components/StatusBar';
import { debounce } from 'lodash';
import html2pdf from 'html2pdf.js';
import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

const App = () => {
  const editorRef = useRef(null); // ✅ PDF Export Reference
  const [editor, setEditor] = useState(null);
  const [versions, setVersions] = useState([]);
  const [currentVersionId, setCurrentVersionId] = useState('v1');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  // ADD THESE LINES (top of component):
  const [isDarkMode, setIsDarkMode] = useState(false);
  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  // Debounced autosave (2s)
  const debouncedSave = useCallback(
    debounce((json) => {
      setIsSaving(true);
      setVersions(prev => {
        const updated = prev.map(v =>
          v.id === currentVersionId
            ? { ...v, json, timestamp: new Date() }
            : v
        );
        localStorage.setItem('editorVersions', JSON.stringify(updated));
        setLastSaved(new Date());
        setTimeout(() => setIsSaving(false), 1000);
        return updated;
      });
    }, 2000),
    [currentVersionId]
  );

  // ✅ PDF EXPORT FUNCTION
  const exportPDF = useCallback(() => {
    if (!editor || !editorRef.current) return;

    const element = editorRef.current;
    const opt = {
      margin: 20,
      filename: `AI-LAW-Document-v${currentVersionId}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  }, [editor, currentVersionId]);

  const manualSave = () => {
    if (editor) {
      debouncedSave.flush()(editor.getJSON());
    }
  };

  const createNewVersion = () => {
    if (!editor) return;
    const newId = `v${versions.length + 1}`;
    const newVersion = {
      id: newId,
      json: editor.getJSON(),
      timestamp: new Date()
    };
    setVersions(prev => [...prev, newVersion]);
    setCurrentVersionId(newId);
    localStorage.setItem('editorVersions', JSON.stringify([...versions, newVersion]));
  };

  const loadVersion = (versionId) => {
    const version = versions.find(v => v.id === versionId);
    if (version && editor) {
      editor.commands.setContent(version.json, false);
      setCurrentVersionId(versionId);
    }
  };

  // Load saved versions on mount
  useEffect(() => {
    const savedVersions = JSON.parse(localStorage.getItem('editorVersions') || '[]');
    if (savedVersions.length === 0) {
      const initialVersion = {
        id: 'v1',
        json: {
          type: 'doc',
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: 'Start editing your AI-LAW document... Autosave every 2s! Tables work with TableKit!' }]
          }]
        },
        timestamp: new Date()
      };
      savedVersions.push(initialVersion);
      localStorage.setItem('editorVersions', JSON.stringify(savedVersions));
    }
    setVersions(savedVersions);
    setCurrentVersionId(savedVersions[0]?.id || 'v1');
  }, []);

  const actualEditor = useEditor({
    extensions: [
      StarterKit,
      TableKit.configure({ resizable: true }),
      BlockIdExtension
    ],
    content: 'Loading...',
    editorProps: {
      attributes: {
        class: 'tiptap',
      },
    },
    onUpdate: ({ editor: ed }) => {
      debouncedSave(ed.getJSON());
    },
  });

  useEffect(() => {
    setEditor(actualEditor);
  }, [actualEditor]);

  const wordCount = editor ? editor.getText().split(/\s+/).filter(Boolean).length : 0;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            manualSave();
            break;
          case 'z':
            editor?.chain().focus().undo().run();
            break;
        }
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
        editor?.chain().focus().redo().run();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor, manualSave]);

  if (!editor) return <div className="loading">Loading AI-LAW Editor...</div>;

  return (
    <div className="editor-wrapper">
      <MenuBar
        editor={editor}
        onSave={manualSave}
        onNewVersion={createNewVersion}
        currentVersion={currentVersionId}
        onLoadVersion={loadVersion}
        versions={versions}
        onExportPDF={exportPDF}  // ✅ PASSED TO MENUBAR
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
      />

      {/* ✅ PDF EXPORT WRAPPER */}
      <div ref={editorRef} className="pdf-export-wrapper">
        <EditorContent editor={editor} />
      </div>

      <StatusBar
        wordCount={wordCount}
        lastSaved={lastSaved}
        isSaving={isSaving}
      />
    </div>














  );
};

export default App;
