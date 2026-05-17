# Books Mock

Projekt je rozdeleny na tri casti:

| Cast | Ucel |
|---|---|
| `server/` | Mock sluzby, serverova dokumentace, start script a podklady pro instalator. |
| `client/` | Materialy pro uchazece: odkazy, pristupove udaje a zadani. |
| `sql/` | Samostatna SQLite cast s knihami a vypujckami. |

## Spusteni serveru ze zdroju

```bash
npm install
npm start
```

Po startu otevri:

```text
http://localhost:4010/services
```

## Sluzby

- REST Swagger: `http://localhost:4010/swagger`
- REST Books OpenAPI: `http://localhost:4010/openapi-books.yaml`
- REST Loans OpenAPI: `http://localhost:4010/openapi-loans.yaml`
- SOAP WSDL: `http://localhost:4010/soap?wsdl`

## Pristupy

```text
Authorization: Bearer BOOKS-REST-TOKEN-2026
SOAP username: books-user
SOAP password: Books!2026
```

## SQL

```bash
cd sql
./build.sh
sqlite3 -header -column books.db < examples.sql
```

## Baleni

```bash
npm run package
```

Baleni vytvori vystupy v `dist/packages/`.
