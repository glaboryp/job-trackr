<script setup lang="ts">
import { computed } from 'vue'
import type { Application } from '../types/application'
import { APPLICATION_STATUSES } from '../constants/statuses'

const props = defineProps<{
  application: Application
}>()

const emit = defineEmits<{
  (e: 'edit', application: Application): void
  (e: 'delete', id: string): void
  (e: 'update-status', id: string, status: string): void
  (e: 'dragstart', event: DragEvent, id: string): void
}>()

const handleDragStart = (event: DragEvent) => {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('application/json', JSON.stringify({ id: props.application.id }))
  }
  emit('dragstart', event, props.application.id)
}

const handleStatusChange = (event: Event) => {
  const select = event.target as HTMLSelectElement
  emit('update-status', props.application.id, select.value)
}

const safeUrl = computed(() => {
  if (!props.application.url) return '#'
  try {
    const url = new URL(props.application.url)
    if (['http:', 'https:'].includes(url.protocol)) {
      return url.href
    }
  } catch {
    // Malformed URL or non-absolute
  }
  return '#'
})
</script>

<template>
  <div
    class="mb-4 bg-white border-2 border-zinc-900 p-5 shadow-[4px_4px_0px_0px_#18181b] transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#18181b] cursor-default md:cursor-grab active:cursor-grabbing focus-within:ring-4 focus-within:ring-indigo-500/30 kanban-card job-card group"
    draggable="true"
    @dragstart="handleDragStart"
  >
    <div class="mb-4 job-card-header border-b-2 border-zinc-100 pb-3">
      <h3 class="mb-1 text-xl font-black uppercase tracking-tight text-zinc-900 company-name leading-tight">{{ application.companyName }}</h3>
      <p class="text-base font-serif italic text-zinc-700 job-title">{{ application.jobTitle }}</p>
    </div>
    
    <div class="mb-4 flex flex-col gap-2 text-sm text-zinc-800 job-card-meta">
      <div class="flex items-center gap-2">
        <span class="font-mono text-xs uppercase tracking-widest text-zinc-500">Mod</span>
        <span class="job-modality bg-indigo-100 border border-zinc-900 px-2 py-0.5 text-xs font-bold">{{ application.modality || 'No especificada' }}</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="font-mono text-xs uppercase tracking-widest text-zinc-500">Loc</span>
        <span class="job-location bg-indigo-50 border border-zinc-900 px-2 py-0.5 text-xs font-bold truncate">{{ application.workLocation || 'Ubicación no especificada' }}</span>
      </div>
    </div>

    <div class="mb-4 flex items-center justify-between text-xs font-mono text-zinc-500 job-card-details border-y-2 border-dashed border-zinc-100 py-2">
      <span class="date-applied">{{ application.dateApplied }}</span>
      <a 
        v-if="application.url" 
        :href="safeUrl" 
        class="cursor-pointer text-indigo-600 transition-colors duration-200 hover:text-indigo-800 hover:underline underline-offset-2 font-bold job-url" 
        target="_blank" 
        rel="noopener noreferrer"
        :data-safe-url="safeUrl"
      >
        [Enlace]
      </a>
    </div>

    <div class="mb-5 min-h-[1.5rem] job-card-notes">
      <p v-if="application.notes" class="whitespace-pre-wrap text-sm font-medium text-zinc-700 notes-text line-clamp-3">{{ application.notes }}</p>
      <p v-else class="text-sm font-mono text-zinc-400 notes-empty before:content-['//_']">Sin notas</p>
    </div>

    <div class="flex gap-3 job-card-actions">
      <button 
        class="flex-1 cursor-pointer bg-white border-2 border-zinc-900 px-3 py-2 text-xs font-bold uppercase tracking-widest text-zinc-900 transition-all hover:bg-zinc-900 hover:text-white active:translate-y-0.5 active:translate-x-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30 btn-edit shadow-[2px_2px_0px_0px_#18181b] hover:shadow-none" 
        @click="emit('edit', application)"
      >
        Editar
      </button>
      <button 
        class="flex-1 cursor-pointer bg-rose-50 border-2 border-rose-900 px-3 py-2 text-xs font-bold uppercase tracking-widest text-rose-900 transition-all hover:bg-rose-900 hover:text-white active:translate-y-0.5 active:translate-x-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-600/30 btn-delete shadow-[2px_2px_0px_0px_#881337] hover:shadow-none" 
        @click="emit('delete', application.id)"
      >
        Eliminar
      </button>
    </div>

    <div class="mt-4 flex flex-col gap-2 md:hidden job-card-mobile-status">
      <label :for="'status-select-' + application.id" class="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500">Mover a:</label>
      <select 
        :id="'status-select-' + application.id"
        :value="application.status" 
        class="w-full cursor-pointer bg-white border-2 border-zinc-900 p-2 text-sm font-bold text-zinc-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/40 status-select shadow-[2px_2px_0px_0px_#18181b]"
        @change="handleStatusChange"
      >
        <option v-for="status in APPLICATION_STATUSES" :key="status" :value="status">
          {{ status }}
        </option>
      </select>
    </div>
  </div>
</template>

