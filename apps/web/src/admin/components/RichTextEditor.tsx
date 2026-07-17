import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import { useEffect } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo2,
  Redo2,
  Link as LinkIcon,
  Youtube as YoutubeIcon,
} from 'lucide-react';
import { cx } from '../../lib/format';

export function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Link.configure({ openOnClick: false, autolink: true }),
      Youtube.configure({ nocookie: true, width: 640, height: 360 }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt('URL do link:');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: url }).run();
  };

  const addYoutube = () => {
    const url = window.prompt('URL do vídeo do YouTube:');
    if (!url) return;
    editor.chain().focus().setYoutubeVideo({ src: url }).run();
  };

  const btn = (active: boolean) => cx('ms-rte__btn', active && 'ms-rte__btn--active');

  return (
    <div className="ms-rte">
      <div className="ms-rte__toolbar">
        <button type="button" className={btn(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()} aria-label="Negrito">
          <Bold />
        </button>
        <button type="button" className={btn(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()} aria-label="Itálico">
          <Italic />
        </button>
        <button type="button" className={btn(editor.isActive('strike'))} onClick={() => editor.chain().focus().toggleStrike().run()} aria-label="Riscado">
          <Strikethrough />
        </button>
        <span className="ms-rte__sep" />
        <button type="button" className={btn(editor.isActive('heading', { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} aria-label="Título 2">
          <Heading2 />
        </button>
        <button type="button" className={btn(editor.isActive('heading', { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} aria-label="Título 3">
          <Heading3 />
        </button>
        <span className="ms-rte__sep" />
        <button type="button" className={btn(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()} aria-label="Lista">
          <List />
        </button>
        <button type="button" className={btn(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()} aria-label="Lista numerada">
          <ListOrdered />
        </button>
        <button type="button" className={btn(editor.isActive('blockquote'))} onClick={() => editor.chain().focus().toggleBlockquote().run()} aria-label="Citação">
          <Quote />
        </button>
        <span className="ms-rte__sep" />
        <button type="button" className={btn(editor.isActive('link'))} onClick={addLink} aria-label="Link">
          <LinkIcon />
        </button>
        <button type="button" className="ms-rte__btn" onClick={addYoutube} aria-label="Vídeo do YouTube">
          <YoutubeIcon />
        </button>
        <span className="ms-rte__sep" />
        <button type="button" className="ms-rte__btn" onClick={() => editor.chain().focus().undo().run()} aria-label="Desfazer">
          <Undo2 />
        </button>
        <button type="button" className="ms-rte__btn" onClick={() => editor.chain().focus().redo().run()} aria-label="Refazer">
          <Redo2 />
        </button>
      </div>
      <EditorContent editor={editor} className="ms-rte__content" />
    </div>
  );
}
