# Rifa Online - Guia de Execução Local

Este projeto é uma aplicação full-stack moderna para gerenciamento e reserva de rifas (Chá Rifa), com suporte a banco de dados local em arquivo JSON (para desenvolvimento rápido) ou sincronização em nuvem segura via **Supabase**.

---

## 📋 Pré-requisitos

Para rodar esta aplicação localmente, você precisa ter instalado em sua máquina:
- [Node.js](https://nodejs.org/) (Recomendado: Versão 18 ou superior)
- Gerenciador de pacotes **npm** (já vem instalado com o Node.js)

---

## 🛠️ Passo a Passo para Configuração Local

### 1. Clonar ou Baixar o Projeto
Se você importou pelo GitHub ou baixou o arquivo ZIP do Workspace, extraia ou navegue até a pasta raiz do projeto no seu terminal:
```bash
cd caminho/para/o/projeto
```

### 2. Instalar as Dependências
Instale todos os pacotes configurados no `package.json` executando:
```bash
npm install
```

### 3. Configurar as Variáveis de Ambiente
Crie um arquivo chamado **`.env`** ou **`.env.local`** na raiz do projeto (onde o arquivo `package.json` está localizado) e adicione as suas credenciais. 

Você pode copiar a estrutura base de exemplo:
```env
# Chave de API do Gemini para recursos de inteligência artificial (opcional)
GEMINI_API_KEY=sua_chave_de_api_aqui

# Integração com o Banco de Dados do Supabase (Recomendado para persistência)
# Obtenha estes valores na seção Settings > API da sua dashboard do Supabase
SUPABASE_URL=https://ovpavtgsijpawftggujc.supabase.co/rest/v1/
SUPABASE_ANON_KEY=sb_publishable_mUqRZ_DSgPmVMH0KzD2x4w_DFBu0D04
```

> **💡 Nota sobre Armazenamento Local:** Caso nenhuma variável de conexão do Supabase esteja declarada, o aplicativo iniciará de forma autônoma e segura no modo **JSON Local**, criando um arquivo `db-rifa.json` na raiz da pasta para salvar as informações de forma persistente em sua máquina.

### 4. Executar e Criar as Tabelas no Supabase (Se Aplicável)
Se você configurou as chaves do Supabase (`SUPABASE_URL` e `SUPABASE_ANON_KEY`), execute o seguinte script no **SQL Editor** do painel do Supabase para criar sua estrutura inicial:

```sql
CREATE TABLE IF NOT EXISTS public.raffle_state (
  id INT PRIMARY KEY,
  state TEXT NOT NULL
);

-- Ativa o acesso para a sua chave Anon API ler e escrever dados
ALTER TABLE public.raffle_state DISABLE ROW LEVEL SECURITY;
```

---

## 🚀 Como Executar o App

### Modo de Desenvolvimento (Hot Reloading ativo)
Para inicializar o servidor Express + Vite local:
```bash
npm run dev
```
O servidor será aberto localmente. Acesse pelo navegador em:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📦 Produção e Publicação

Caso queira gerar a versão otimizada para implantar em produção (como Vercel, Railway, Render ou Cloud Run):

1. **Compilar os recursos estáticos e o backend processado:**
   ```bash
   npm run build
   ```
   *Isso compilará o client React dentro de `dist/` e gerará o servidor bundling unificado em `dist/server.cjs`.*

2. **Iniciar o app compilado para produção:**
   ```bash
   npm run start
   ```
