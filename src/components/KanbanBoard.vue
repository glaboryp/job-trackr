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
  <div class="flex overflow-x-auto gap-6 pb-6 min-h-[600px] snap-x snap-mandatory items-start">
    <div 
      v-for="status in APPLICATION_STATUSES" 
      :key="status" 
      class="flex-shrink-0 w-80 bg-slate-50 rounded-xl p-4 snap-center border border-slate-200 kanban-column"
    >
      <h3 class="text-sm font-semibold mb-4 flex justify-between items-center text-slate-800 uppercase tracking-wide">
        {{ status }}
        <span class="bg-slate-200 text-slate-700 text-xs font-bold py-1 px-2.5 rounded-full">
          {{ columns[status].length }}
        </span>
      </h3>
      
      <div
        class="flex flex-col gap-3 min-h-[150px] kanban-cards"
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
