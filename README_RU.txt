CYBERDROP — облачная версия

Эта папка содержит PWA-версию сайта + интеграцию Supabase Auth/Postgres.

1. Создайте проект Supabase.
2. Выполните supabase/schema.sql в SQL Editor.
3. Вставьте Project URL и Publishable key в supabase-config.js.
4. Разместите папку на HTTPS-хостинге.
5. Откройте сайт в Safari на iPhone и авторизуйтесь.

GitHub Pages: загрузите содержимое папки в репозиторий и включите Settings → Pages → GitHub Actions.

Примечание: игровой движок по-прежнему частично client-authoritative. Для защиты от читов открытие кейсов и выдачу кредитов позже нужно вынести в RPC/Edge Functions.
