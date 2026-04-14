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
    class="mb-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md cursor-default md:cursor-grab active:cursor-grabbing kanban-card job-card"
    draggable="true"
    @dragstart="handleDragStart"
  >
    <div class="mb-3 job-card-header">
      <h3 class="mb-1 text-lg font-semibold text-slate-900 company-name">{{ application.companyName }}</h3>
      <p class="text-base text-slate-600 job-title">{{ application.jobTitle }}</p>
    </div>
    
    <div class="mb-3 flex items-center justify-between text-sm text-slate-500 job-card-details">
      <span class="date-applied">{{ application.dateApplied }}</span>
      <a 
        v-if="application.url" 
        :href="safeUrl" 
        class="text-blue-600 hover:text-blue-700 hover:underline job-url" 
        target="_blank" 
        rel="noopener noreferrer"
        :data-safe-url="safeUrl"
      >
        Enlace de oferta
      </a>
    </div>

    <div class="mb-4 min-h-[1.5rem] job-card-notes">
      <p v-if="application.notes" class="whitespace-pre-wrap text-sm text-slate-700 notes-text">{{ application.notes }}</p>
      <p v-else class="text-sm italic text-slate-400 notes-empty">Sin notas</p>
    </div>

    <div class="mb-3 flex gap-2 job-card-actions">
      <button 
        class="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-200 transition-colors btn-edit" 
        @click="emit('edit', application)"
      >
        Editar
      </button>
      <button 
        class="rounded-md bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors btn-delete" 
        @click="emit('delete', application.id)"
      >
        Eliminar
      </button>
    </div>

    <div class="flex flex-col gap-1 md:hidden job-card-mobile-status">
      <label :for="'status-select-' + application.id" class="text-xs font-semibold text-slate-500">Estado:</label>
      <select 
        :id="'status-select-' + application.id"
        :value="application.status" 
        class="w-full rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 status-select"
        @change="handleStatusChange"
      >
        <option v-for="status in APPLICATION_STATUSES" :key="status" :value="status">
          {{ status }}
        </option>
      </select>
    </div>
  </div>
</template>


