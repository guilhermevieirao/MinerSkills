-- AgendaEvent.url: link de inscrição ou detalhes do evento (opcional).
-- Usado pelo botão "Inscrever-se" da agenda e pela propriedade URL do .ics.
ALTER TABLE "AgendaEvent" ADD COLUMN "url" TEXT;
