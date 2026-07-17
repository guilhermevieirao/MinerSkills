/** Erro de API com status HTTP e código legível. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'error',
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(msg = 'Requisição inválida', details?: unknown) {
    return new ApiError(400, msg, 'bad_request', details);
  }
  static unauthorized(msg = 'Não autorizado') {
    return new ApiError(401, msg, 'unauthorized');
  }
  static forbidden(msg = 'Acesso negado') {
    return new ApiError(403, msg, 'forbidden');
  }
  static notFound(msg = 'Não encontrado') {
    return new ApiError(404, msg, 'not_found');
  }
  static conflict(msg = 'Conflito') {
    return new ApiError(409, msg, 'conflict');
  }
  static payload(msg = 'Arquivo muito grande') {
    return new ApiError(413, msg, 'payload_too_large');
  }
  static tooMany(msg = 'Muitas requisições') {
    return new ApiError(429, msg, 'too_many_requests');
  }
}
