<script setup lang="ts">
import { computed, ref } from 'vue'

import ApplicationForm from './components/ApplicationForm.vue'
import KanbanBoard from './components/KanbanBoard.vue'
import { APPLICATION_MODALITIES } from './constants/modalities'
import { APPLICATION_STATUSES, normalizeApplicationStatus, type ApplicationStatus } from './constants/statuses'
import { useApplications } from './composables/useApplications'
import type { Application } from './types/application'

type ApplicationSavePayload = Omit<Application, 'id'> | Application

const { applications, createApplication, updateApplication, deleteApplication, moveApplication } = useApplications()

const isFormOpen = ref(false)
const isFiltersOpen = ref(false)
const editingApplicationId = ref<string | null>(null)
const searchQuery = ref('')
const modalityFilter = ref<'all' | Application['modality']>('all')
const statusFilter = ref<'all' | ApplicationStatus>('all')
const sortBy = ref<'dateApplied-desc' | 'dateApplied-asc' | 'status-asc' | 'status-desc'>('dateApplied-desc')

const statusRank = new Map(APPLICATION_STATUSES.map((status, index) => [status, index]))

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
    modality: payload.modality,
    workLocation: payload.workLocation,
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

const hasApplications = computed(() => applications.value.length > 0)

const visibleApplications = computed(() => {
  const normalizedQuery = searchQuery.value.trim().toLowerCase()
  const indexedApplications = applications.value.map((application, index) => ({ application, index }))

  const searchedApplications = normalizedQuery
    ? indexedApplications.filter(({ application }) => {
      const companyName = application.companyName.toLowerCase()
      const jobTitle = application.jobTitle.toLowerCase()
      return companyName.includes(normalizedQuery) || jobTitle.includes(normalizedQuery)
    })
    : indexedApplications

  const filteredByModality = modalityFilter.value === 'all'
    ? searchedApplications
    : searchedApplications.filter(({ application }) => application.modality === modalityFilter.value)

  const filteredByStatus = statusFilter.value === 'all'
    ? filteredByModality
    : filteredByModality.filter(({ application }) => application.status === statusFilter.value)

  const sorted = [...filteredByStatus].sort((left, right) => {
    let comparison = 0

    if (sortBy.value === 'dateApplied-asc' || sortBy.value === 'dateApplied-desc') {
      comparison = left.application.dateApplied.localeCompare(right.application.dateApplied)
      if (sortBy.value === 'dateApplied-desc') {
        comparison *= -1
      }
    }

    if (sortBy.value === 'status-asc' || sortBy.value === 'status-desc') {
      const leftRank = statusRank.get(normalizeApplicationStatus(left.application.status)) ?? Number.MAX_SAFE_INTEGER
      const rightRank = statusRank.get(normalizeApplicationStatus(right.application.status)) ?? Number.MAX_SAFE_INTEGER
      comparison = leftRank - rightRank
      if (sortBy.value === 'status-desc') {
        comparison *= -1
      }
    }

    if (comparison !== 0) {
      return comparison
    }

    const indexComparison = left.index - right.index
    if (indexComparison !== 0) {
      return indexComparison
    }

    return left.application.id.localeCompare(right.application.id)
  })

  return sorted.map(({ application }) => application)
})
</script>

<template>
  <div class="md:h-screen min-h-screen flex flex-col bg-[#faf9f6] text-zinc-900 font-sans selection:bg-indigo-200 md:overflow-hidden">
    <main class="flex-1 flex flex-col min-h-0 mx-auto w-full px-4 py-6 sm:px-6 lg:px-8">
      <header class="flex-none mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b-4 border-zinc-900 pb-6">
        <div>
          <h1 class="text-4xl sm:text-5xl font-black uppercase tracking-tighter text-zinc-900">
            Job Trackr
          </h1>
          <p class="mt-2 text-sm font-mono tracking-tight text-zinc-600">
            // Gestiona tus aplicaciones con flujo completo.
          </p>
        </div>

        <button
          class="group relative inline-flex cursor-pointer items-center justify-center bg-indigo-600 px-6 py-3 font-bold uppercase tracking-widest text-white transition-all duration-200 hover:bg-indigo-700 active:translate-y-1 active:translate-x-1 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500 shadow-[6px_6px_0px_0px_#18181b] hover:shadow-[2px_2px_0px_0px_#18181b] active:shadow-none border-2 border-zinc-900"
          data-testid="open-create"
          @click="openCreateForm"
        >
          Nueva aplicación
        </button>
      </header>

      <div v-if="hasApplications" class="mb-6 md:hidden">
        <button
          class="w-full group relative inline-flex cursor-pointer items-center justify-center bg-white px-6 py-3 font-bold uppercase tracking-widest text-zinc-900 transition-all duration-200 active:translate-y-1 active:translate-x-1 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500 shadow-[6px_6px_0px_0px_#18181b] hover:shadow-[2px_2px_0px_0px_#18181b] active:shadow-none border-2 border-zinc-900"
          @click="isFiltersOpen = true"
        >
          Filtros y Búsqueda
        </button>
      </div>

      <div 
        v-if="isFiltersOpen && hasApplications" 
        class="fixed inset-0 z-40 bg-zinc-900/50 backdrop-blur-sm md:hidden"
        @click="isFiltersOpen = false"
        aria-hidden="true"
      ></div>

      <section
        v-if="hasApplications"
        :class="[
          isFiltersOpen ? 'fixed inset-x-4 top-24 z-50 p-6 max-h-[80vh] overflow-y-auto' : 'hidden md:block mb-6 p-4',
          'flex-none border-4 border-zinc-900 bg-white shadow-[6px_6px_0px_0px_#18181b]'
        ]"
        aria-label="Controles de productividad"
        @keydown.esc="isFiltersOpen = false"
      >
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-black uppercase tracking-[0.2em] text-zinc-900">Buscar, filtrar y ordenar</h2>
          <button 
            v-if="isFiltersOpen" 
            class="md:hidden p-1 -mr-2 text-zinc-900 hover:text-indigo-600 transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500" 
            @click="isFiltersOpen = false"
            aria-label="Cerrar filtros"
          >
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="square" stroke-linejoin="miter" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label for="search-query" class="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-900">Buscar</label>
            <input
              id="search-query"
              v-model="searchQuery"
              data-testid="search-input"
              type="search"
              placeholder="Empresa o puesto"
              class="block w-full cursor-text border-2 border-zinc-900 bg-white px-3 py-2 text-sm font-mono text-zinc-900 placeholder-zinc-500 transition-all focus:outline-none focus-visible:border-indigo-600 focus-visible:ring-4 focus-visible:ring-indigo-500/20"
            />
          </div>

          <div>
            <label for="modality-filter" class="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-900">Modalidad</label>
            <select
              id="modality-filter"
              v-model="modalityFilter"
              data-testid="modality-filter"
              class="block w-full cursor-pointer border-2 border-zinc-900 bg-white px-3 py-2 text-sm font-mono font-bold text-zinc-900 transition-all focus:outline-none focus-visible:border-indigo-600 focus-visible:ring-4 focus-visible:ring-indigo-500/20"
            >
              <option value="all">Todas</option>
              <option v-for="modality in APPLICATION_MODALITIES" :key="modality" :value="modality">
                {{ modality }}
              </option>
            </select>
          </div>

          <div>
            <label for="status-filter" class="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-900">Estado</label>
            <select
              id="status-filter"
              v-model="statusFilter"
              data-testid="status-filter"
              class="block w-full cursor-pointer border-2 border-zinc-900 bg-white px-3 py-2 text-sm font-mono font-bold text-zinc-900 transition-all focus:outline-none focus-visible:border-indigo-600 focus-visible:ring-4 focus-visible:ring-indigo-500/20"
            >
              <option value="all">Todos</option>
              <option v-for="status in APPLICATION_STATUSES" :key="status" :value="status">
                {{ status }}
              </option>
            </select>
          </div>

          <div>
            <label for="sort-by" class="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-900">Orden</label>
            <select
              id="sort-by"
              v-model="sortBy"
              data-testid="sort-select"
              class="block w-full cursor-pointer border-2 border-zinc-900 bg-white px-3 py-2 text-sm font-mono font-bold text-zinc-900 transition-all focus:outline-none focus-visible:border-indigo-600 focus-visible:ring-4 focus-visible:ring-indigo-500/20"
            >
              <option value="dateApplied-desc">Fecha aplicación (más reciente)</option>
              <option value="dateApplied-asc">Fecha aplicación (más antigua)</option>
              <option value="status-asc">Estado (A - Z del flujo)</option>
              <option value="status-desc">Estado (Z - A del flujo)</option>
            </select>
          </div>
        </div>
      </section>

      <div
        v-if="!hasApplications"
        class="mt-16 mx-auto max-w-2xl flex flex-col items-center justify-center border-4 border-dashed border-zinc-300 bg-white py-20 px-6 text-center shadow-[8px_8px_0px_0px_rgba(24,24,27,0.1)] transition-all hover:border-zinc-900"
        data-testid="empty-state"
        role="status"
        aria-live="polite"
      >
        <div class="mb-6 flex h-20 w-20 items-center justify-center border-4 border-zinc-900 bg-indigo-100 shadow-[4px_4px_0px_0px_#18181b] -rotate-3 transition-transform hover:rotate-12">
          <svg class="h-10 w-10 text-zinc-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="square" stroke-linejoin="miter" stroke-width="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
          </svg>
        </div>
        <h3 class="mb-3 text-2xl font-black uppercase tracking-tight text-zinc-900">Ninguna aplicación todavía</h3>
        <p class="mb-3 max-w-sm text-base font-medium text-zinc-600">Comienza a hacer un seguimiento de tus búsquedas de empleo creando tu primera aplicación.</p>
        <p class="mb-8 max-w-sm text-sm font-mono text-zinc-500">
          Consejo: añade empresa, puesto y estado para ver tu tablero activo.
        </p>
        <button
          class="inline-flex cursor-pointer items-center justify-center bg-indigo-600 px-6 py-3 font-bold uppercase tracking-widest text-white transition-all duration-200 hover:bg-indigo-700 active:translate-y-1 active:translate-x-1 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500 shadow-[6px_6px_0px_0px_#18181b] hover:shadow-[2px_2px_0px_0px_#18181b] active:shadow-none border-2 border-zinc-900"
          data-testid="empty-state-cta"
          aria-label="Crear primera aplicación"
          @click="openCreateForm"
        >
          Crear aplicación
        </button>
      </div>

      <KanbanBoard
        v-else-if="visibleApplications.length > 0"
        :applications="visibleApplications"
        @delete="handleDelete"
        @edit="openEditForm"
        @move="handleMove"
      />

      <div
        v-else
        class="mt-10 border-4 border-dashed border-zinc-400 bg-white px-6 py-10 text-center shadow-[6px_6px_0px_0px_rgba(24,24,27,0.12)]"
        data-testid="no-results-state"
        role="status"
        aria-live="polite"
      >
        <p class="text-xl font-black uppercase tracking-tight text-zinc-900">Sin resultados</p>
        <p class="mt-3 text-sm font-mono text-zinc-600">
          Ajusta tu búsqueda, filtros o criterio de orden para ver coincidencias.
        </p>
      </div>

      <ApplicationForm
        v-if="isFormOpen"
        :initial-data="editingApplication"
        @close="closeForm"
        @save="handleSave"
      />
    </main>
  </div>
</template>
