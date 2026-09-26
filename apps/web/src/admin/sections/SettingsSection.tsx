import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  SETTING_DEFINITIONS,
  settingSchema,
  type SettingDTO,
  type SettingInput,
  type SettingKey,
} from '@minerskills/shared';
import { adminApi } from '../adminApi';
import { Button, Input, Textarea, Field, Switch } from '../../components/ui';
import { QueryState } from '../../components/ui/QueryState';
import { ListSkeleton } from '../../components/ui/skeletons';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { useToast } from '../../components/ui/Toast';
import { queryClient } from '../../lib/queryClient';
import { cx } from '../../lib/format';
import { focusFirstInvalid } from '../../lib/forms';
import { ApiError } from '../../lib/api';
import { SETTINGS_QUERY_KEY } from '../../features/social/useSocial';
import './SettingsSection.scss';

type SettingDefinition = (typeof SETTING_DEFINITIONS)[number];
type SettingsForm = Record<SettingKey, string>;
type FieldErrors = Partial<Record<SettingKey, string>>;

const ADMIN_SETTINGS_QUERY_KEY = ['admin-settings'] as const;

/** Valor de uma chave que ainda não existe no banco. */
const emptyValue = (def: SettingDefinition) => (def.type === 'boolean' ? 'false' : '');

/**
 * Monta o formulário a partir da lista da API: toda chave de SETTING_DEFINITIONS
 * aparece (vazia/'false' quando ausente) e chaves desconhecidas são ignoradas.
 */
function formFromList(items: SettingDTO[] | undefined): SettingsForm {
  const byKey = new Map((items ?? []).map((s) => [s.key, s.value]));
  const form = {} as SettingsForm;
  for (const def of SETTING_DEFINITIONS)
    form[def.key] = byKey.get(def.key) ?? emptyValue(def);
  return form;
}

export function SettingsSection() {
  const settings = useQuery({
    queryKey: ADMIN_SETTINGS_QUERY_KEY,
    queryFn: adminApi.settings.list,
  });

  return (
    <div>
      <AdminPageHeader
        title="Configurações"
        description="Textos e opções gerais do site."
      />

      <QueryState query={settings} skeleton={<ListSkeleton rows={5} lead={0} />}>
        {(data) => <SettingsFormView data={data} />}
      </QueryState>
    </div>
  );
}

/** O formulário só monta depois que a lista chegou (o QueryState cuida do resto). */
function SettingsFormView({ data }: { data: SettingDTO[] }) {
  // Só o que o usuário digitou fica em estado local; o resto vem direto da query.
  // Assim não há efeito de sincronização nem risco de um refetch apagar a edição.
  const [edits, setEdits] = useState<Partial<SettingsForm>>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();

  const form: SettingsForm = { ...formFromList(data), ...edits };
  const isDirty = Object.keys(edits).length > 0;

  const update = (key: SettingKey, value: string) => {
    setEdits((e) => ({ ...e, [key]: value }));
    if (errors[key]) setErrors((errs) => ({ ...errs, [key]: undefined }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    // valida item a item com o mesmo schema do servidor; erro fica no campo
    const items: SettingInput[] = [];
    const errs: FieldErrors = {};
    for (const def of SETTING_DEFINITIONS) {
      const raw = form[def.key];
      const item = { key: def.key, value: def.type === 'boolean' ? raw : raw.trim() };
      const parsed = settingSchema.safeParse(item);
      if (parsed.success) items.push(parsed.data);
      else errs[def.key] = parsed.error.issues[0]?.message ?? 'Valor inválido';
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      requestAnimationFrame(() => focusFirstInvalid(formRef.current));
      return;
    }

    setSaving(true);
    try {
      const saved = await adminApi.settings.saveAll(items);
      queryClient.setQueryData(ADMIN_SETTINGS_QUERY_KEY, saved);
      setEdits({});
      void queryClient.invalidateQueries({ queryKey: ADMIN_SETTINGS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
      toast.success('Configurações salvas.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form ref={formRef} className="ms-settings" onSubmit={save} noValidate>
      <div className="ms-settings__fields">
        {SETTING_DEFINITIONS.map((def) => (
          <SettingField
            key={def.key}
            def={def}
            value={form[def.key]}
            error={errors[def.key]}
            onChange={(value) => update(def.key, value)}
          />
        ))}
      </div>

      {/* com alterações pendentes a barra gruda no fim da tela: salvar nunca some */}
      <div
        className={cx('ms-settings__actions', isDirty && 'ms-settings__actions--sticky')}
      >
        {isDirty && (
          <span className="ms-settings__dirty" role="status">
            Alterações não salvas
          </span>
        )}
        <Button type="submit" loading={saving}>
          Salvar
        </Button>
      </div>
    </form>
  );
}

/** Um campo do formulário; o controle depende do `type` da definição. */
function SettingField({
  def,
  value,
  error,
  onChange,
}: {
  def: SettingDefinition;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  if (def.type === 'boolean') {
    const hintId = `ms-setting-${def.key}-hint`;
    return (
      <div className="ms-field">
        <Switch
          checked={value === 'true'}
          onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
          aria-describedby={hintId}
          aria-invalid={error ? true : undefined}
        >
          {def.label}
        </Switch>
        <span className="ms-field__hint" id={hintId}>
          {def.hint}
        </span>
        {error && (
          <span className="ms-field__error" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <Field label={def.label} hint={def.hint} error={error}>
      {def.type === 'textarea' ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          maxLength={2000}
        />
      ) : (
        <Input
          type={def.type === 'email' ? 'email' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={2000}
        />
      )}
    </Field>
  );
}
