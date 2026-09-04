# Publicar o ChopeControl na Hostinger (Node.js + MySQL)

Este guia usa a opção de **aplicativo Node.js** da Hostinger e o **MySQL** da própria conta.

---

## 1. Criar o banco de dados

1. No hPanel: **Bancos de dados → MySQL**.
2. Crie um banco (ex.: `chopecontrol`) e um usuário com senha forte.
3. Anote: host, nome do banco, usuário e senha.

## 2. Importar a estrutura e os dados

No **phpMyAdmin** do banco criado, importe nesta ordem:

1. `mysql/schema.sql` — cria todas as tabelas.
2. `mysql/triggers.sql` — cria as automações (status de conta, consignação, baixa de pagamento).
3. `mysql/dados.sql` — carrega os dados que já existem hoje no sistema (clientes, produtos, barris, movimentações, financeiro).

Se quiser começar do zero, importe só os dois primeiros.

> Para atualizar o arquivo de dados antes de migrar (pegar o que houver de mais
> recente), rode `node scripts/export-mysql-dados.mjs` aqui no projeto.

## 3. Gerar os arquivos do site

No seu computador ou no terminal da Hostinger (esse passo não roda dentro do editor Lovable, que sempre gera a versão da nuvem):

```sh
npm install
npm run build:hostinger
```

Isso gera a pasta **`.output`**, que é o site pronto para rodar em Node.

## 4. Enviar para a Hostinger

Envie para a pasta do aplicativo (ex.: `/home/uXXXX/domains/seudominio.com/chopecontrol`):

- a pasta `.output` inteira
- `package.json`
- o arquivo `.env` (veja o passo 5)

Depois, no terminal da pasta: `npm install --omit=dev` (instala o conector MySQL).

## 5. Variáveis de ambiente

Copie `.env.hostinger.example` para `.env` e preencha:

```
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=seu_usuario
MYSQL_PASSWORD=sua_senha
MYSQL_DATABASE=seu_banco
AUTH_SECRET=uma-frase-longa-e-aleatoria
UPLOAD_DIR=./uploads
```

`AUTH_SECRET` é o que protege o login: use uma frase longa e não compartilhe.

## 6. Configurar o aplicativo Node

No painel de aplicativo Node.js da Hostinger:

- **Versão do Node:** 20 ou superior
- **Pasta do aplicativo:** a pasta onde você enviou os arquivos
- **Arquivo de inicialização / comando de start:** `.output/server/index.mjs`
  (ou comando `npm start`)
- Salve e clique em **Reiniciar**.

Crie também a pasta `uploads` dentro da pasta do aplicativo (é onde ficam as
fotos dos romaneios).

## 7. Primeiro acesso

1. Abra seu domínio.
2. Clique em **Criar conta** e cadastre o seu e-mail e senha.
   A primeira conta criada recebe o papel de administrador.
3. Pronto: clientes, produtos, barris e financeiro aparecem já com os dados importados.

> As senhas antigas não são transferidas (ficavam no login da nuvem). Cada
> pessoa da equipe cria a conta dela no primeiro acesso.

---

## Como o sistema escolhe o banco

- Build normal (`npm run build`): usa o banco na nuvem, como hoje no preview.
- Build da Hostinger (`npm run build:hostinger`): usa o MySQL através dos
  endereços internos `/api/db`, `/api/auth` e `/api/storage`.

## Backup

Faça o backup pelo phpMyAdmin (**Exportar**) ou pelo backup automático da
Hostinger, e guarde também a pasta `uploads` (fotos das entregas).

## Se algo não abrir

- **Página em branco / erro 500:** confira o log do aplicativo no hPanel; quase
  sempre é uma variável do `.env` faltando ou errada.
- **"Banco MySQL não configurado":** o `.env` não foi lido — verifique o caminho
  do arquivo e reinicie o aplicativo.
- **Fotos não aparecem:** a pasta `uploads` precisa existir e ter permissão de
  escrita.
