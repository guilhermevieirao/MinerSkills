/**
 * E-mail é a chave única do Admin. Toda gravação (seed, gestão de admins) e toda
 * busca (login) passam por aqui para que `Joao@Equipe.com` e `joao@equipe.com`
 * sejam a mesma conta — a igualdade de TEXT distingue caixa no SQLite e no Postgres.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
