-- 1. Apaga tudo para limpar erros de chaves e políticas
DROP TABLE IF EXISTS public.app_state;

-- 2. Cria a tabela com a estrutura correta
CREATE TABLE public.app_state (
    id text PRIMARY KEY,
    payload jsonb NOT NULL,
    updated_at timestamptz DEFAULT now()
);

-- 3. Habilita o acesso total para a sua chave anon
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso_Total_Yolandia" 
ON public.app_state 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 4. Insere um teste inicial para confirmar que a tabela funciona
INSERT INTO public.app_state (id, payload) 
VALUES ('test_ping', '{"status":"ok"}');