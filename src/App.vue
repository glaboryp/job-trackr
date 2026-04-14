<script setup lang="ts">
import { computed, ref } from 'vue'

import ApplicationForm from './components/ApplicationForm.vue'
import KanbanBoard from './components/KanbanBoard.vue'
import { normalizeApplicationStatus, type ApplicationStatus } from './constants/statuses'
import { useApplications } from './composables/useApplications'
import type { Application } from './types/application'

type ApplicationSavePayload = Omit<Application, 'id'> | Application

const { applications, createApplication, updateApplication, deleteApplication, moveApplication } = useApplications()

const isFormOpen = ref(false)
const editingApplicationId = ref<string | null>(null)

const editingApplication = computed(() => {
  if (!editingApplicationId.value) {
    return null
  }

  return applications.value.find((application) => application.id === editingApplicationId.value) ?? null
})

function openCreateForm(): void {
  editingApplicationId.value = null
  isFormOpen.value = true
}

function openEditForm(id: string): void {
  editingApplicationId.value = id
  isFormOpen.value = true
}

function closeForm(): void {
  isFormOpen.value = false
}

function toApplicationInput(payload: ApplicationSavePayload): Omit<Application, 'id'> {
  return {
    companyName: payload.companyName,
    jobTitle: payload.jobTitle,
    status: payload.status,
    dateApplied: payload.dateApplied,
    url: payload.url,
    notes: payload.notes,
  }
}

function handleSave(payload: ApplicationSavePayload): void {
  const applicationInput = toApplicationInput(payload)

  if (editingApplicationId.value) {
    updateApplication(editingApplicationId.value, applicationInput)
    return
  }

  createApplication(applicationInput)
}

function handleDelete(id: string): void {
  const shouldDelete = globalThis.confirm('¿Seguro que deseas eliminar esta aplicación?')
  if (!shouldDelete) {
    return
  }

  deleteApplication(id)
}

function handleMove(id: string, status: string, nextIndex: number): void {
  const normalizedStatus: ApplicationStatus = normalizeApplicationStatus(status)
  moveApplication(id, normalizedStatus, nextIndex)
}
</script>

<template>
  <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
    <header class="mb-6 flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Job Trackr</h1>
        <p class="mt-1 text-sm text-slate-600">Gestiona tus aplicaciones con flujo completo.</p>
      </div>

      <button
        class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        data-testid="open-create"
        @click="openCreateForm"
      >
        Nueva aplicación
      </button>
    </header>

    <div v-if="applications.length === 0" class="mt-12 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 py-16 px-6 text-center" data-testid="empty-state">
      <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
        <svg class="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
        </svg>
      </div>
      <h3 class="mb-2 text-lg font-medium text-slate-900">Ninguna aplicación todavía</h3>
      <p class="mb-6 max-w-sm text-sm text-slate-500">Comienza a hacer un seguimiento de tus búsquedas de empleo creando tu primera aplicación.</p>
      <button
        class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        data-testid="empty-state-cta"
        @click="openCreateForm"
      >
        Crear aplicación
      </button>
    </div>

    <KanbanBoard
      v-else
      :applications="applications"
      @delete="handleDelete"
      @edit="openEditForm"
      @move="handleMove"
    />

    <ApplicationForm
      v-if="isFormOpen"
      :initial-data="editingApplication"
      @close="closeForm"
      @save="handleSave"
    />
  </main>
</template>
