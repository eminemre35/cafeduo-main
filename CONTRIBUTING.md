# Contributing to CafeDuo

First off, thanks for taking the time to contribute! 🎉

## How to Contribute

### Reporting Bugs

1.  Check existing issues on GitHub.
2.  Open a new issue with a clear title and description.
3.  Include steps to reproduce, expected behavior, and screenshots if applicable.

### Suggesting Enhancements

1.  Open an issue with the `enhancement` label.
2.  Describe the feature and why it would be useful.

### Pull Requests

1.  Fork the repository.
2.  Create a feature branch: `git checkout -b feature/amazing-feature`.
3.  Make your changes.
4.  Run tests: `npm test` and `npm run test:e2e`.
5.  Commit your changes using [Conventional Commits](https://www.conventionalcommits.org/):
    - `feat:` for new features
    - `fix:` for bug fixes
    - `docs:` for documentation updates
    - `refactor:` for code modifications
6.  Push to your branch and open a Pull Request.

## Development Setup

See the [README.md](README.md) for detailed setup instructions using Docker or manual installation.

## CafeDuo çalışma kapısı

Node.js `20.17+` ve npm `10+` kullanın. Değişiklik göndermeden önce tek komutluk doğrulamayı çalıştırın:

```bash
npm ci
npm run verify
npm run test:e2e:smoke
```

`npm run verify` güvenlik audit'ini, lint'i, TypeScript kontrolünü, unit test + coverage'ı ve production build'i fail-fast çalıştırır. Smoke E2E testi API + frontend entegrasyonunu ayrıca doğrular.

### Pull request kuralları

1. `main` üzerine doğrudan push veya başarısız kontrolü yönetici olarak geçme yapılmaz.
2. PR açıklamasında değişen davranış, test komutları ve varsa migration/deploy etkisi yazılır.
3. CI'da `build-and-test` ve `e2e-tests` yeşil olmadan merge edilmez.
4. Güvenlik bulguları için `npm run verify:security` sonucu PR'a eklenir.

### Canlıya çıkış

Canlı deploy sonrasında `/api/readiness`, `/api/meta/version` ve public smoke kontrolü doğrulanır. Beklenen commit canlı sürüm ile eşleşmiyorsa deploy tamamlanmış sayılmaz.

## Style Guide

- Use **TypeScript** for frontend code.
- Use **Prettier** for formatting.
- Follow existing code patterns.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
