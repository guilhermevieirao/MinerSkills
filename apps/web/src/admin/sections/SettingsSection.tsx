import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  SETTING_DEFINITIONS,
  settingSchema,
  type SettingDTO,
  type SettingInput,
  type SettingKey,
} from '@minerskills/shared';
import { adminApi } from '../adminApi';
import { Button, Input, Textarea, Field, Loader, EmptyState } from '../../components/ui';
import { useToast } from '../../components/ui/Toast';
import { queryClient } from '../../lib/queryClient';
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
  const { data, isLoading, isError } = useQuery({
    queryKey: ADMIN_SETTINGS_QUERY_KEY,
    queryFn: adminApi.settings.list,
  });
  // Só o que o usuário digitou fica em estado local; o resto vem direto da query.
  // Assim não há efeito de sincronização nem risco de um refetch apagar a edição.
  const [edits, setEdits] = useState<Partial<SettingsForm>>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
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
    if (Object.keys(errs).length > 0) return;

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
    <div>
      <div className="ms-adm__head">
        <div>
          <h1>Configurações</h1>
          <p>Textos e opções gerais do site.</p>
        </div>
      </div>

      {isLoading ? (
        <Loader />
      ) : isError ? (
        <EmptyState
          title="Não foi possível carregar as configurações"
          description="Recarregue a página para tentar novamente."
        />
      ) : (
        <form className="ms-settings" onSubmit={save}>
          {SETTING_DEFINITIONS.map((def) => (
            <SettingField
              key={def.key}
              def={def}
              value={form[def.key]}
              error={errors[def.key]}
              onChange={(value) => update(def.key, value)}
            />
          ))}

          <div className="ms-settings__actions">
            {isDirty && <span className="ms-settings__dirty">Alterações não salvas</span>}
            <Button type="submit" loading={saving}>
              Salvar
            </Button>
          </div>
        </form>
      )}
    </div>
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
    return (
      <div className="ms-field">
        <label className="ms-checkbox">
          <input
            type="checkbox"
            checked={value === 'true'}
            onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
          />
          {def.label}
        </label>
        {error ? (
          <span className="ms-field__error">{error}</span>
        ) : (
          <span className="ms-field__hint">{def.hint}</span>
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
