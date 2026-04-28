<script setup lang="ts">
import type { ReconcileStrategy } from '../types/sync'

const props = defineProps<{
  isOpen: boolean
  localCount: number
  remoteCount: number
  isReconciling: boolean
  errorMessage: string | null
}>()

const emit = defineEmits<{
  (e: 'resolve', strategy: ReconcileStrategy): void
}>()

function selectStrategy(strategy: ReconcileStrategy): void {
  if (props.isReconciling) {
    return
  }

  emit('resolve', strategy)
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/70 p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="conflict-modal-title"
    data-testid="conflict-modal"
  >
    <div class="w-full max-w-xl border-4 border-zinc-900 bg-white p-6 shadow-[10px_10px_0px_0px_#18181b]">
      <h2 id="conflict-modal-title" class="text-2xl font-black uppercase tracking-tight text-zinc-900">
        Resolver conflicto de datos
      </h2>
      <p class="mt-3 text-sm font-medium text-zinc-700">
        Encontramos datos locales y también datos de tu cuenta. Debes elegir una estrategia antes de continuar.
      </p>

      <div class="mt-3 grid gap-2 rounded border-2 border-zinc-900 bg-zinc-50 p-3 text-xs font-bold uppercase tracking-wide text-zinc-700">
        <p data-testid="conflict-local-count">Local: {{ localCount }} registro(s)</p>
        <p data-testid="conflict-remote-count">Cuenta: {{ remoteCount }} registro(s)</p>
      </div>

      <div class="mt-6 grid gap-3">
        <button
          type="button"
          class="cursor-pointer border-2 border-zinc-900 bg-indigo-600 px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-indigo-700"
          data-testid="conflict-merge"
          :disabled="isReconciling"
          @click="selectStrategy('merge')"
        >
          Unificar (más reciente gana)
        </button>

        <button
          type="button"
          class="cursor-pointer border-2 border-zinc-900 bg-zinc-900 px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-zinc-700"
          data-testid="conflict-keep-account"
          :disabled="isReconciling"
          @click="selectStrategy('keep_account')"
        >
          Quedarnos con cuenta
        </button>

        <button
          type="button"
          class="cursor-pointer border-2 border-zinc-900 bg-emerald-600 px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-emerald-700"
          data-testid="conflict-keep-local"
          :disabled="isReconciling"
          @click="selectStrategy('keep_local')"
        >
          Quedarnos con local
        </button>
      </div>

      <p v-if="isReconciling" class="mt-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Sincronizando, por favor espera...
      </p>

      <p
        v-if="errorMessage"
        class="mt-3 rounded border-2 border-rose-600 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
        data-testid="conflict-error"
      >
        {{ errorMessage }}
      </p>
    </div>
  </div>
</template>
