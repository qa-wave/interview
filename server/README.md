# Serverova cast

Tahle slozka je urcena pro provoz mock sluzeb.

## Co obsahuje

- REST sluzby pro knihy a vypujcky.
- SOAP sluzbu pro vypujcky.
- OpenAPI dokumentaci.
- WSDL dostupne po spusteni serveru.
- Mock data.
- SQL slozka zustava v rootu projektu jako samostatna cast testu.

## Spusteni

Ze zdrojoveho projektu:

```bash
npm start
```

Po spusteni otevri:

```text
http://localhost:4010/services
```

## Windows balicek

Finalni Windows balicek ma vedle teto dokumentace obsahovat `books-mock.exe`
a `start-windows.cmd`. Instalator vznikne z baliciho skriptu az na stroji,
kde je dostupny `pkg`/NSIS a sit pro stazeni runtime binarek.
