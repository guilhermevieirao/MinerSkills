import { useEditor, useEditorState, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import { Plugin } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react';
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
import { Button, Field, Input } from '../../components/ui';
import { cx } from '../../lib/format';
import './RichTextEditor.scss';

const PLACEHOLDER = 'Escreva o conteúdo…';

/**
 * Placeholder do documento vazio: marca o único parágrafo vazio com
 * `is-editor-empty` + `data-placeholder` (o CSS do `.ms-rte` desenha o texto).
 * Uma decoração, sem dependência nova — mesmo contrato da extensão oficial.
 */
const EmptyPlaceholder = Extension.create<{ text: string }>({
  name: 'emptyPlaceholder',
  addOptions() {
    return { text: '' };
  },
  addProseMirrorPlugins() {
    const text = this.options.text;
    return [
      new Plugin({
        props: {
          decorations: ({ doc }) => {
            const first = doc.firstChild;
            if (doc.childCount !== 1 || !first?.isTextblock || first.content.size > 0) {
              return null;
            }
            return DecorationSet.create(doc, [
              Decoration.node(0, first.nodeSize, {
                class: 'is-editor-empty',
                'data-placeholder': text,
              }),
            ]);
          },
        },
      }),
    ];
  },
});

type PromptKind = 'link' | 'youtube';

const PROMPT_LABEL: Record<PromptKind, { group: string; field: string }> = {
  link: { group: 'Inserir link', field: 'URL do link' },
  youtube: { group: 'Inserir vídeo do YouTube', field: 'URL do vídeo do YouTube' },
};

export function RichTextEditor({
  value,
  onChange,
  label = 'Conteúdo',
}: {
  value: string;
  onChange: (html: string) => void;
  /** Nome acessível da área de edição. */
  label?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Link.configure({ openOnClick: false, autolink: true }),
      Youtube.configure({ nocookie: true, width: 640, height: 360 }),
      EmptyPlaceholder.configure({ text: PLACEHOLDER }),
    ],
    editorProps: {
      attributes: { 'aria-label': label, 'aria-multiline': 'true' },
    },
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Estado da barra (botões ativos) acompanha também mudanças só de seleção.
  const active = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive('bold'),
            italic: e.isActive('italic'),
            strike: e.isActive('strike'),
            h2: e.isActive('heading', { level: 2 }),
            h3: e.isActive('heading', { level: 3 }),
            bulletList: e.isActive('bulletList'),
            orderedList: e.isActive('orderedList'),
            blockquote: e.isActive('blockquote'),
            link: e.isActive('link'),
          }
        : null,
  });

  const [prompt, setPrompt] = useState<PromptKind | null>(null);
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState<string | undefined>();

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor || !active) return null;

  const openPrompt = (kind: PromptKind) => {
    if (prompt === kind) {
      closePrompt();
      return;
    }
    const href = editor.getAttributes('link').href as string | undefined;
    setUrl(kind === 'link' ? (href ?? '') : '');
    setUrlError(undefined);
    setPrompt(kind);
  };

  const closePrompt = () => {
    setPrompt(null);
    setUrlError(undefined);
    editor.commands.focus();
  };

  const removeLink = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    setPrompt(null);
  };

  const apply = () => {
    const src = url.trim();
    if (prompt === 'link') {
      if (!src) {
        removeLink();
        return;
      }
      const { empty } = editor.state.selection;
      if (empty && !editor.isActive('link')) {
        // sem texto selecionado: insere a própria URL como texto do link
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'text',
            text: src,
            marks: [{ type: 'link', attrs: { href: src } }],
          })
          .run();
      } else {
        editor.chain().focus().extendMarkRange('link').setLink({ href: src }).run();
      }
      setPrompt(null);
      return;
    }
    if (prompt === 'youtube') {
      if (!src) {
        setUrlError('Informe a URL do vídeo.');
        return;
      }
      const ok = editor.chain().focus().setYoutubeVideo({ src }).run();
      if (!ok) {
        setUrlError('URL do YouTube inválida.');
        return;
      }
      setPrompt(null);
    }
  };

  // Enter aplica sem enviar o formulário do post; Esc fecha só esta linha
  // (não o modal inteiro, que também escuta o Esc).
  const onPromptKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      apply();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closePrompt();
    }
  };

  return (
    <div className="ms-rte">
      <div className="ms-rte__toolbar" role="toolbar" aria-label="Formatação do texto">
        <ToolbarButton
          label="Negrito"
          active={active.bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Itálico"
          active={active.italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Riscado"
          active={active.strike}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough aria-hidden />
        </ToolbarButton>
        <span className="ms-rte__sep" aria-hidden />
        <ToolbarButton
          label="Título 2"
          active={active.h2}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Título 3"
          active={active.h3}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 aria-hidden />
        </ToolbarButton>
        <span className="ms-rte__sep" aria-hidden />
        <ToolbarButton
          label="Lista"
          active={active.bulletList}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Lista numerada"
          active={active.orderedList}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Citação"
          active={active.blockquote}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote aria-hidden />
        </ToolbarButton>
        <span className="ms-rte__sep" aria-hidden />
        <ToolbarButton
          label="Link"
          active={active.link}
          expanded={prompt === 'link'}
          onClick={() => openPrompt('link')}
        >
          <LinkIcon aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Vídeo do YouTube"
          expanded={prompt === 'youtube'}
          onClick={() => openPrompt('youtube')}
        >
          <YoutubeIcon aria-hidden />
        </ToolbarButton>
        <span className="ms-rte__sep" aria-hidden />
        <ToolbarButton
          label="Desfazer"
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Refazer"
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 aria-hidden />
        </ToolbarButton>
      </div>

      {prompt && (
        <div
          className="ms-rte__prompt"
          role="group"
          aria-label={PROMPT_LABEL[prompt].group}
        >
          <Field label={PROMPT_LABEL[prompt].field} error={urlError}>
            <Input
              type="url"
              inputMode="url"
              placeholder={
                prompt === 'link' ? 'https://…' : 'https://www.youtube.com/watch?v=…'
              }
              value={url}
              autoFocus
              onChange={(e) => {
                setUrl(e.target.value);
                setUrlError(undefined);
              }}
              onKeyDown={onPromptKey}
            />
          </Field>
          <div className="ms-rte__prompt-actions">
            <Button type="button" size="sm" onClick={apply}>
              Aplicar
            </Button>
            {prompt === 'link' && active.link && (
              <Button type="button" size="sm" variant="ghost" onClick={removeLink}>
                Remover link
              </Button>
            )}
            <Button type="button" size="sm" variant="ghost" onClick={closePrompt}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <EditorContent editor={editor} className="ms-rte__content" />
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  expanded,
  onClick,
  children,
}: {
  label: string;
  /** Formatação aplicada na seleção (botão alternável → `aria-pressed`). */
  active?: boolean;
  /** Abre a linha de URL (→ `aria-expanded`). */
  expanded?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={cx('ms-rte__btn', active && 'ms-rte__btn--active')}
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={expanded === undefined ? active : undefined}
      aria-expanded={expanded}
    >
      {children}
    </button>
  );
}
