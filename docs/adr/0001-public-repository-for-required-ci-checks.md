# Repositório público para exigir checks de CI

Escolhemos tornar o repositório público para poder exigir checks antes do merge em `main` usando o plano gratuito do GitHub. A alternativa manteria o código privado, mas exigiria GitHub Pro para proteger a branch. Antes da mudança, auditamos os 107 commits do histórico remoto e não encontramos credenciais versionadas; arquivos `.env*` permanecem fora do Git, exceto `.env.example`.
