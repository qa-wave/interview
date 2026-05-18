# Serverová část

Tahle složka je určená pro provoz mock služeb.

## Co obsahuje

- REST služby pro knihy a výpůjčky.
- SOAP službu pro výpůjčky.
- OpenAPI dokumentaci.
- WSDL dostupné po spuštění serveru.
- Mock data.
- SQL složka zůstává v rootu projektu jako samostatná část testu.

## Spuštění

Ze zdrojového projektu:

```bash
npm start
```

Po spuštění otevři:

```text
http://localhost:4010/services
```

## Windows balíček

Finální Windows balíček má vedle této dokumentace obsahovat `books-mock.exe`
a `start-windows.cmd`. Instalátor vznikne z balicího skriptu až na stroji,
kde je dostupný `pkg`/NSIS a síť pro stažení runtime binárek.
