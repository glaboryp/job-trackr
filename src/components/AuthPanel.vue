<script setup lang="ts">
import { computed, ref } from 'vue'

import type { AuthCredentials } from '../types/auth'

type AuthMode = 'login' | 'signup' | 'request-reset' | 'confirm-reset'
type Notice = { tone: 'success' | 'info'; title: string; message: string } | null

const props = withDefaults(defineProps<{
  authEnabled: boolean
  isBusy: boolean
  userEmail: string | null
  errorMessage: string | null
  signupPendingEmail?: string | null
  notice?: Notice
}>(), {
  signupPendingEmail: null,
  notice: null,
})

const emit = defineEmits<{
  (e: 'login', credentials: AuthCredentials): void
  (e: 'signup', credentials: AuthCredentials): void
  (e: 'logout'): void
  (e: 'request-reset', email: string): void
  (e: 'confirm-reset', payload: { token?: string; newPassword: string }): void
  (e: 'clear-error'): void
  (e: 'resend-confirmation', email: string): void
  (e: 'clear-signup-pending'): void
}>()

const mode = ref<AuthMode>('login')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const resetEmail = ref('')
const resetToken = ref('')
const newPassword = ref('')
const localError = ref<string | null>(null)

const isLoggedIn = computed(() => typeof props.userEmail === 'string' && props.userEmail.length > 0)

function resetLocalError(): void {
  localError.value = null
  emit('clear-error')
}

function switchMode(nextMode: AuthMode): void {
  emit('clear-signup-pending')
  mode.value = nextMode
  resetLocalError()
}

function submitLogin(): void {
  resetLocalError()

  if (!email.value.trim() || !password.value) {
    localError.value = 'Email y contraseña son obligatorios.'
    return
  }

  emit('login', {
    email: email.value.trim(),
    password: password.value,
  })
}

function submitSignup(): void {
  resetLocalError()

  if (!email.value.trim() || !password.value) {
    localError.value = 'Email y contraseña son obligatorios.'
    return
  }

  if (password.value.length < 8) {
    localError.value = 'La contraseña debe tener al menos 8 caracteres.'
    return
  }

  if (!/\d/.test(password.value)) {
    localError.value = 'La contraseña debe incluir al menos un número.'
    return
  }

  if (password.value !== confirmPassword.value) {
    localError.value = 'Las contraseñas no coinciden.'
    return
  }

  emit('signup', {
    email: email.value.trim(),
    password: password.value,
  })
}

function submitResetRequest(): void {
  resetLocalError()

  if (!resetEmail.value.trim()) {
    localError.value = 'Debes indicar el email de tu cuenta.'
    return
  }

  emit('request-reset', resetEmail.value.trim())
}

function submitResetConfirmation(): void {
  resetLocalError()

  if (newPassword.value.length < 8) {
    localError.value = 'La nueva contraseña debe tener al menos 8 caracteres.'
    return
  }

  if (!/\d/.test(newPassword.value)) {
    localError.value = 'La nueva contraseña debe incluir al menos un número.'
    return
  }

  emit('confirm-reset', {
    token: resetToken.value.trim() || undefined,
    newPassword: newPassword.value,
  })
}
</script>

<template>
  <section
    class="border-4 border-zinc-900 bg-white p-4 shadow-[6px_6px_0px_0px_#18181b]"
    data-testid="auth-panel"
    aria-label="Panel de autenticación"
  >
    <header class="mb-3 flex items-center justify-between gap-3 border-b-2 border-zinc-200 pb-3">
      <div>
        <h2 class="text-xs font-black uppercase tracking-[0.2em] text-zinc-900">Cuenta</h2>
        <p class="text-xs font-mono text-zinc-600">Sincroniza tus postulaciones entre dispositivos.</p>
      </div>

      <button
        v-if="isLoggedIn"
        type="button"
        class="cursor-pointer border-2 border-zinc-900 bg-zinc-900 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-zinc-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-400"
        data-testid="auth-logout"
        :disabled="isBusy"
        @click="emit('logout')"
      >
        Cerrar sesión
      </button>
    </header>

    <p
      v-if="!authEnabled"
      class="rounded border-2 border-amber-600 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800"
      data-testid="auth-disabled-message"
    >
      Auth deshabilitada. Configura las variables VITE_SUPABASE_* para activar registro/login.
    </p>

    <template v-else-if="isLoggedIn">
      <p class="text-xs font-bold uppercase tracking-wider text-zinc-700" data-testid="auth-session-email">
        Sesión activa: {{ userEmail }}
      </p>
    </template>

    <section v-else-if="signupPendingEmail" class="grid gap-3 py-2" data-testid="signup-pending" aria-live="polite">
      <div class="border-l-4 border-indigo-600 bg-indigo-50 px-4 py-3 text-zinc-900">
        <h3 class="text-base font-bold">Revisa tu correo</h3>
        <p class="mt-1 text-sm">Hemos enviado un enlace de confirmación a <strong class="break-all">{{ signupPendingEmail }}</strong>.</p>
        <p class="mt-2 text-sm">Abre el enlace para activar tu cuenta. Después podrás iniciar sesión.</p>
      </div>
      <button
        type="button"
        class="cursor-pointer border-2 border-zinc-900 bg-indigo-600 px-3 py-2 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60"
        data-testid="auth-resend-confirmation"
        :disabled="isBusy"
        @click="emit('resend-confirmation', signupPendingEmail)"
      >
        {{ isBusy ? 'Enviando…' : 'Reenviar correo' }}
      </button>
      <button type="button" class="text-left text-sm font-semibold text-indigo-700 underline" :disabled="isBusy" @click="switchMode('login')">
        Volver a iniciar sesión
      </button>
      <p v-if="notice" class="border-l-4 px-3 py-2 text-sm" :class="notice.tone === 'success' ? 'border-emerald-600 bg-emerald-50 text-emerald-900' : 'border-indigo-600 bg-indigo-50 text-indigo-900'" role="status" data-testid="auth-notice">
        <strong>{{ notice.title }}</strong> {{ notice.message }}
      </p>
      <p v-if="errorMessage" class="border-l-4 border-rose-600 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert" data-testid="auth-error">{{ errorMessage }}</p>
    </section>

    <template v-else>
      <div class="mb-3 flex gap-2" role="tablist" aria-label="Opciones de acceso">
        <button
          type="button"
          class="flex-1 cursor-pointer border-2 px-2 py-1 text-[11px] font-bold uppercase tracking-widest transition-all"
          :class="mode === 'login' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-900 bg-white text-zinc-900'"
          data-testid="auth-tab-login"
          :disabled="isBusy"
          @click="switchMode('login')"
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          class="flex-1 cursor-pointer border-2 px-2 py-1 text-[11px] font-bold uppercase tracking-widest transition-all"
          :class="mode === 'signup' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-900 bg-white text-zinc-900'"
          data-testid="auth-tab-signup"
          :disabled="isBusy"
          @click="switchMode('signup')"
        >
          Crear cuenta
        </button>
      </div>

      <form v-if="mode === 'login'" @submit.prevent="submitLogin" class="grid gap-2">
        <label class="text-[11px] font-bold uppercase tracking-wider text-zinc-700" for="auth-login-email">Email</label>
        <input
          id="auth-login-email"
          v-model="email"
          class="w-full border-2 border-zinc-900 bg-white px-2 py-1 text-sm"
          data-testid="auth-login-email"
          type="email"
          autocomplete="email"
          :disabled="isBusy"
        >

        <label class="text-[11px] font-bold uppercase tracking-wider text-zinc-700" for="auth-login-password">Contraseña</label>
        <input
          id="auth-login-password"
          v-model="password"
          class="w-full border-2 border-zinc-900 bg-white px-2 py-1 text-sm"
          data-testid="auth-login-password"
          type="password"
          autocomplete="current-password"
          :disabled="isBusy"
        >

        <button
          type="submit"
          class="mt-2 cursor-pointer border-2 border-zinc-900 bg-indigo-600 px-3 py-2 text-xs font-bold uppercase tracking-widest text-white"
          data-testid="auth-login-submit"
          :disabled="isBusy"
        >
          Iniciar sesión
        </button>

        <button
          type="button"
          class="text-left text-[11px] font-semibold text-indigo-700 underline"
          data-testid="auth-open-reset"
          :disabled="isBusy"
          @click="switchMode('request-reset')"
        >
          Olvidé mi contraseña
        </button>
      </form>

      <form v-else-if="mode === 'signup'" @submit.prevent="submitSignup" class="grid gap-2">
        <label class="text-[11px] font-bold uppercase tracking-wider text-zinc-700" for="auth-signup-email">Email</label>
        <input
          id="auth-signup-email"
          v-model="email"
          class="w-full border-2 border-zinc-900 bg-white px-2 py-1 text-sm"
          data-testid="auth-signup-email"
          type="email"
          autocomplete="email"
          :disabled="isBusy"
        >

        <label class="text-[11px] font-bold uppercase tracking-wider text-zinc-700" for="auth-signup-password">Contraseña</label>
        <input
          id="auth-signup-password"
          v-model="password"
          class="w-full border-2 border-zinc-900 bg-white px-2 py-1 text-sm"
          data-testid="auth-signup-password"
          type="password"
          autocomplete="new-password"
          :disabled="isBusy"
        >

        <label class="text-[11px] font-bold uppercase tracking-wider text-zinc-700" for="auth-signup-confirm">Repite contraseña</label>
        <input
          id="auth-signup-confirm"
          v-model="confirmPassword"
          class="w-full border-2 border-zinc-900 bg-white px-2 py-1 text-sm"
          data-testid="auth-signup-confirm"
          type="password"
          autocomplete="new-password"
          :disabled="isBusy"
        >

        <button
          type="submit"
          class="mt-2 cursor-pointer border-2 border-zinc-900 bg-emerald-600 px-3 py-2 text-xs font-bold uppercase tracking-widest text-white"
          data-testid="auth-signup-submit"
          :disabled="isBusy"
        >
          Crear cuenta
        </button>
      </form>

      <form v-else-if="mode === 'request-reset'" @submit.prevent="submitResetRequest" class="grid gap-2">
        <label class="text-[11px] font-bold uppercase tracking-wider text-zinc-700" for="auth-reset-email">Email de recuperación</label>
        <input
          id="auth-reset-email"
          v-model="resetEmail"
          class="w-full border-2 border-zinc-900 bg-white px-2 py-1 text-sm"
          data-testid="auth-reset-email"
          type="email"
          autocomplete="email"
          :disabled="isBusy"
        >

        <button
          type="submit"
          class="mt-2 cursor-pointer border-2 border-zinc-900 bg-zinc-900 px-3 py-2 text-xs font-bold uppercase tracking-widest text-white"
          data-testid="auth-reset-request-submit"
          :disabled="isBusy"
        >
          Enviar instrucciones
        </button>

        <button
          type="button"
          class="text-left text-[11px] font-semibold text-indigo-700 underline"
          data-testid="auth-open-reset-confirm"
          :disabled="isBusy"
          @click="switchMode('confirm-reset')"
        >
          Ya tengo token/código
        </button>

        <button
          type="button"
          class="text-left text-[11px] font-semibold text-zinc-700 underline"
          :disabled="isBusy"
          @click="switchMode('login')"
        >
          Volver a iniciar sesión
        </button>
      </form>

      <form v-else @submit.prevent="submitResetConfirmation" class="grid gap-2">
        <label class="text-[11px] font-bold uppercase tracking-wider text-zinc-700" for="auth-reset-token">Token (opcional)</label>
        <input
          id="auth-reset-token"
          v-model="resetToken"
          class="w-full border-2 border-zinc-900 bg-white px-2 py-1 text-sm"
          data-testid="auth-reset-token"
          type="text"
          :disabled="isBusy"
        >

        <label class="text-[11px] font-bold uppercase tracking-wider text-zinc-700" for="auth-reset-new-password">Nueva contraseña</label>
        <input
          id="auth-reset-new-password"
          v-model="newPassword"
          class="w-full border-2 border-zinc-900 bg-white px-2 py-1 text-sm"
          data-testid="auth-reset-new-password"
          type="password"
          autocomplete="new-password"
          :disabled="isBusy"
        >

        <button
          type="submit"
          class="mt-2 cursor-pointer border-2 border-zinc-900 bg-zinc-900 px-3 py-2 text-xs font-bold uppercase tracking-widest text-white"
          data-testid="auth-reset-confirm-submit"
          :disabled="isBusy"
        >
          Actualizar contraseña
        </button>

        <button
          type="button"
          class="text-left text-[11px] font-semibold text-zinc-700 underline"
          :disabled="isBusy"
          @click="switchMode('login')"
        >
          Volver a iniciar sesión
        </button>
      </form>

      <p v-if="notice" class="mt-3 border-l-4 px-3 py-2 text-sm" :class="notice.tone === 'success' ? 'border-emerald-600 bg-emerald-50 text-emerald-900' : 'border-indigo-600 bg-indigo-50 text-indigo-900'" role="status" data-testid="auth-notice">
        <strong>{{ notice.title }}</strong> {{ notice.message }}
      </p>
      <p v-if="localError || errorMessage" class="mt-3 border-l-4 border-rose-600 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert" data-testid="auth-error">
        {{ localError || errorMessage }}
      </p>
    </template>
  </section>
</template>
