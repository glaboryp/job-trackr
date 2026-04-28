# Auth + Sync Runbook

## 1. Prerequisitos

- Node.js y pnpm instalados.
- Proyecto InsForge vinculado (`.insforge/project.json` existe).
- Dependencias instaladas con `pnpm install`.

## 2. Variables de entorno

Crear `.env` desde `.env.example` y completar:

```bash
VITE_INSFORGE_URL=https://<appkey>.<region>.insforge.app
VITE_INSFORGE_ANON_KEY=<public-anon-key>
VITE_INSFORGE_AUTH_ENABLED=true
```

Notas:

- Nunca uses `api_key` de `.insforge/project.json` en frontend.
- Si `VITE_INSFORGE_AUTH_ENABLED=false`, la app funciona 100% anónima con localStorage.

## 3. Flujo operativo

### Bootstrap de sesión

- `bootstrapping`: la app intenta recuperar sesión actual.
- `anonymous`: sin sesión, fuente de datos local (`localStorage`).
- `authenticated`: sesión activa y fuente de datos remota.
- `conflict_required`: detectó datos locales y remotos; bloquea mutaciones.
- `reconciling`: aplicando estrategia de reconciliación.
- `error`: fallo de auth/sync recuperable.

### Sign up / Login

- Registro y login están embebidos en la UI principal.
- Si el usuario se autentica y:
  - Solo existe local: se migra automáticamente a cuenta (`keep_local`).
  - Solo existe remoto: se carga remoto.
  - Existen ambos: se muestra modal bloqueante obligatoria.

### Modal de conflicto

Opciones disponibles:

- `merge`: unifica con regla determinista `most recent wins`.
- `keep_account`: conserva dataset remoto.
- `keep_local`: sobrescribe remoto con local (requiere snapshot de respaldo en backend).

## 4. Endpoint de reconciliación

- Función: `reconcile-applications`.
- Requiere `Bearer token` válido.
- Requiere `x-idempotency-key` por request.
- Debe ser transaccional e idempotente por `(user_id, idempotency_key)`.

## 5. Verificación local

### Suite completa

```bash
pnpm test -- --run
pnpm build
```

### Pruebas focalizadas

```bash
pnpm vitest run src/__tests__/useSession.test.ts
pnpm vitest run src/__tests__/App.auth.integration.test.ts
pnpm vitest run src/__tests__/mergeApplications.test.ts
pnpm vitest run src/__tests__/authService.test.ts
```

## 6. Rollback de reconciliación

Caso objetivo: un `keep_local` sobrescribió remoto y se necesita recuperar estado previo.

1. Identificar snapshot reciente del usuario en `public.reconcile_snapshots`:

```sql
select id, created_at, strategy
from public.reconcile_snapshots
where user_id = '<USER_ID>'
order by created_at desc;
```

2. Tomar `snapshot_payload` del snapshot seleccionado.
3. Ejecutar restore transaccional:

```sql
begin;

-- eliminar estado actual del usuario
delete from public.applications where user_id = '<USER_ID>';

-- reinsertar desde snapshot_payload (estructura JSON de applications)
-- este paso depende del helper SQL disponible en tu entorno

commit;
```

4. Verificar con consulta por usuario:

```sql
select id, company_name, job_title, updated_at
from public.applications
where user_id = '<USER_ID>'
order by updated_at desc;
```

## 7. Post-deploy checklist

- `pnpm test -- --run` en CI en verde.
- `pnpm build` en verde.
- Registro, login, logout y reset password funcionales.
- Modal de conflicto se muestra cuando hay local+remoto.
- Reconciliación por `merge`, `keep_account`, `keep_local` devuelve conteos y snapshot.
- No hay secretos en bundle frontend (`api_key`, service roles).
- RLS activa y policies CRUD por `auth.uid()` en `public.applications`.
