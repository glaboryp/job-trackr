# JobTrackr

JobTrackr es una herramienta sencilla y eficiente para gestionar tus candidaturas de empleo. Organiza tus procesos de selección en un tablero Kanban intuitivo, mantén un registro de tus entrevistas y visualiza tu progreso de un vistazo.

## 🚀 MVP: Alcance del Proyecto

Esta versión inicial (MVP) se centra en la experiencia core de gestión local:

- **Tablero Kanban**: Visualiza tus candidaturas por estado (Pendiente, Entrevista, Oferta, Rechazada).
- **Gestión de Candidaturas (CRUD)**: Crea, edita y elimina registros de empleo.
- **Movimiento de Estados**: 
  - Desktop: Soporte para Drag & Drop.
  - Mobile: Selector de estado simplificado para pantallas táctiles.
- **Validación de Datos**: Modal con validación para asegurar que la información sea correcta.
- **Persistencia**: Todos los datos se guardan automáticamente en el `localStorage` de tu navegador.
- **Empty State**: Interfaz optimizada para cuando aún no tienes candidaturas.

## 🛠️ Stack Tecnológico

- **Framework**: Vue 3 (Composition API + `<script setup>`)
- **Build Tool**: Vite
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS
- **Testing**: Vitest + Vue Test Utils

## 📦 Instalación y Configuración

Sigue estos pasos para levantar el proyecto localmente:

1. **Clona el repositorio**:
   ```bash
   git clone <url-del-repositorio>
   cd job-trackr
   ```

2. **Instala las dependencias**:
   ```bash
   pnpm install
   ```

3. **Inicia el servidor de desarrollo**:
   ```bash
   pnpm dev
   ```

## 🔐 Inicio de Sesión y Sync (InsForge)

Se incluye autenticación con InsForge:

- **Signup**: crea una cuenta nueva con email y contraseña.
- **Login**: inicia sesión con email y contraseña.
- **Reset de contraseña**: solicita un enlace para recuperar acceso.
- **Sync remoto**: al iniciar sesión, la app puede unificar candidaturas locales y remotas.
- **Modo anónimo**: si no activas auth, la app sigue funcionando con `localStorage`.

1. Copiar el fichero de ejemplo de variables de entorno:
   ```bash
   cp .env.example .env
   ```

2. Completa las variables públicas del cliente:
   ```bash
   VITE_INSFORGE_URL=https://<appkey>.<region>.insforge.app
   VITE_INSFORGE_ANON_KEY=<public-anon-key>
   VITE_INSFORGE_AUTH_ENABLED=true
   ```

3. Si quieres mantener auth apagada temporalmente:
   ```bash
   VITE_INSFORGE_AUTH_ENABLED=false
   ```

## 🔄 Auth + Sync (Resumen de Flujo)

- El bootstrap detecta sesión y define estado global:
   - `anonymous`, `authenticated`, `conflict_required`, `reconciling`, `error`.
- Si hay datos locales y remotos al hacer login:
   - se muestra una **modal bloqueante** con opciones `merge`, `keep_account`, `keep_local`.

## ⌨️ Comandos Útiles

- `pnpm dev`: Inicia el entorno de desarrollo.
- `pnpm build`: Genera la versión de producción en la carpeta `dist`.
- `pnpm test`: Ejecuta la suite de pruebas con Vitest.
- `pnpm preview`: Previsualiza localmente la build de producción.
- `pnpm test -- --run`: Ejecuta suite completa en modo CI.

## 🚀 Deploy manual de la function

Cuando se modifique la lógica de sincronización o resolución de conflictos, desplegar la función de InsForge manualmente:

```bash
npx @insforge/cli functions deploy reconcile-applications
```

Si ya estás autenticada en el CLI y el proyecto está vinculado, este comando actualiza la function `reconcile-applications` en InsForge.

## 📂 Estructura del Proyecto

```text
src/
├── components/      # Componentes de la interfaz (Kanban, Form, Cards)
├── composables/     # Lógica de estado y persistencia (useApplications)
├── types/           # Definiciones de tipos TypeScript
├── constants/       # Constantes del dominio (Estados)
├── __tests__/       # Pruebas unitarias e integración
└── tailwind.css     # Configuración global de estilos
```

## 🤝 Cómo Contribuir

¡Las contribuciones son bienvenidas! Para mantener el proyecto organizado, seguimos este flujo:

1. **Flujo de Ramas**:
   - Crea una rama para tu cambio: `git checkout -b feat/nombre-de-la-mejora` o `fix/descripcion-del-error`.
   - Asegúrate de que las pruebas pasen antes de enviar.

2. **Commits Convencionales**:
   Usamos el formato de commits convencionales para mantener un historial claro:
   - `feat(scope): mensaje` para nuevas funcionalidades.
   - `fix(scope): mensaje` para correcciones.
   - `docs(scope): mensaje` para cambios en documentación.

   *Ejemplo: `feat(kanban): añadir animación al mover tarjetas`*

3. **Abrir PR**:
   Abre un Pull Request detallando los cambios realizados y su propósito.

