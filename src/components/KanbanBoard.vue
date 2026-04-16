<script setup lang="ts">
import { computed } from 'vue'
import JobCard from './JobCard.vue'

import type { Application } from '../types/application'
import {
  APPLICATION_STATUSES,
  normalizeApplicationStatus,
  type ApplicationStatus,
} from '../constants/statuses'

const props = defineProps<{
  applications: readonly Application[]
}>()

const emit = defineEmits<{
  (e: 'edit', id: string): void
  (e: 'delete', id: string): void
  (e: 'move', id: string, newStatus: string, nextIndex: number): void
}>()

const columns = computed(() => {
  const cols = APPLICATION_STATUSES.reduce((acc, status) => {
    acc[status] = []
    return acc
  }, {} as Record<string, Application[]>)

  props.applications.forEach(app => {
    const status = normalizeApplicationStatus(app.status)
    cols[status].push(app)
  })

  return cols
})

function handleDrop(event: DragEvent, targetStatus: ApplicationStatus): void {
  const payloadRaw = event.dataTransfer?.getData('application/json')
  if (!payloadRaw) {
    return
  }

  let draggedApplicationId = ''

  try {
    const payload = JSON.parse(payloadRaw) as { id?: string }
    draggedApplicationId = payload.id ?? ''
  } catch {
    return
  }

  if (!draggedApplicationId) {
    return
  }

  emit('move', draggedApplicationId, targetStatus, columns.value[targetStatus].length)
}

function handleMobileStatusUpdate(id: string, status: string): void {
  emit('move', id, status, columns.value[normalizeApplicationStatus(status)].length)
}
</script>

<template>
  <div class="flex-1 min-h-0 overflow-x-auto md:overflow-y-hidden overflow-y-visible flex gap-8 pb-4 snap-x snap-mandatory items-start kanban-board">
    <div 
      v-for="status in APPLICATION_STATUSES" 
      :key="status" 
      class="flex-shrink-0 w-80 xl:w-96 2xl:w-[30rem] bg-white p-5 snap-center border-4 border-zinc-900 shadow-[8px_8px_0px_0px_#18181b] transition-all duration-200 focus-within:-translate-y-1 focus-within:shadow-[12px_12px_0px_0px_#18181b] focus-within:ring-4 focus-within:ring-indigo-500/30 kanban-column md:max-h-full h-auto flex flex-col"
    >
      <h3 class="text-lg font-black mb-5 flex-none flex justify-between items-center text-zinc-900 uppercase tracking-widest border-b-4 border-zinc-900 pb-3">
        {{ status }}
        <span class="bg-indigo-600 text-white font-mono text-sm font-bold py-1 px-3 border-2 border-zinc-900 shadow-[2px_2px_0px_0px_#18181b]">
          {{ columns[status].length }}
        </span>
      </h3>
      
      <div
        class="flex-1 min-h-[150px] md:overflow-y-auto overflow-y-visible flex flex-col gap-5 transition-colors duration-200 kanban-cards pr-2 -mr-2"
        @dragover.prevent
        @drop="(event) => handleDrop(event, status)"
      >
        <JobCard
          v-for="app in columns[status]"
          :key="app.id"
          :application="app"
          @delete="emit('delete', $event)"
          @edit="emit('edit', $event.id)"
          @update-status="handleMobileStatusUpdate"
        />
      </div>
    </div>
  </div>
</template>
