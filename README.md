# Books Mock

Projekt je rozdělený na tři části:

| Část | Účel |
|---|---|
| `server/` | Mock služby, serverová dokumentace, start script a podklady pro instalátor. |
| `client/` | Materiály pro uchazeče: odkazy, přístupové údaje a zadání. |
| `sql/` | Samostatná SQLite část s knihami a výpůjčkami. |

## Spuštění serveru ze zdrojů

```bash
npm install
npm start
```

Po startu otevři:

```text
http://localhost:4010/services
```

## Služby

- REST Swagger: `http://localhost:4010/swagger`
- REST Books OpenAPI: `http://localhost:4010/openapi-books.yaml`
- REST Loans OpenAPI: `http://localhost:4010/openapi-loans.yaml`
- SOAP WSDL: `http://localhost:4010/soap?wsdl`

## Přístupy

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

## Balení

```bash
npm run package
```

Balení vytvoří výstupy v `dist/packages/`.
