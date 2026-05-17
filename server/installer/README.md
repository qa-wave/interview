# Instalator

Zdroj NSIS instalatoru je v `scripts/installer.nsi`.

Pri baleni pres:

```bash
npm run package
```

vznikne Windows instalator v `dist/packages/books-mock-<version>-setup.exe`,
pokud je na stroji dostupny `makensis`.

Bez NSIS vznikne alespon ZIP serverove casti:

```text
dist/packages/books-mock-server-windows-x64.zip
```
