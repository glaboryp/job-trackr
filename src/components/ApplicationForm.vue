<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 sm:p-0 backdrop-blur-sm" @click.self="$emit('close')">
    <div class="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl sm:p-8" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <h2 id="modal-title" class="mb-6 text-xl font-semibold text-slate-900">
        {{ isEdit ? 'Editar Aplicación' : 'Nueva Aplicación' }}
      </h2>
      
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label for="companyName" class="mb-1 block text-sm font-medium text-slate-700">Empresa <span class="text-slate-400">*</span></label>
          <input
            id="companyName"
            v-model="form.companyName"
            type="text"
            :class="[
              'block w-full rounded-md border px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow',
              errors.companyName ? 'border-red-300 focus:ring-red-500' : 'border-slate-300'
            ]"
            placeholder="Ej: Tech Corp"
          />
          <span v-if="errors.companyName" class="mt-1 block text-sm text-red-500 error-msg">{{ errors.companyName }}</span>
        </div>

        <div>
          <label for="jobTitle" class="mb-1 block text-sm font-medium text-slate-700">Puesto <span class="text-slate-400">*</span></label>
          <input
            id="jobTitle"
            v-model="form.jobTitle"
            type="text"
            :class="[
              'block w-full rounded-md border px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow',
              errors.jobTitle ? 'border-red-300 focus:ring-red-500' : 'border-slate-300'
            ]"
            placeholder="Ej: Frontend Developer"
          />
          <span v-if="errors.jobTitle" class="mt-1 block text-sm text-red-500 error-msg">{{ errors.jobTitle }}</span>
        </div>

        <div>
          <label for="status" class="mb-1 block text-sm font-medium text-slate-700">Estado</label>
          <select 
            id="status" 
            v-model="form.status"
            class="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow bg-white"
          >
            <option v-for="status in APPLICATION_STATUSES" :key="status" :value="status">
              {{ status }}
            </option>
          </select>
        </div>

        <div>
          <label for="dateApplied" class="mb-1 block text-sm font-medium text-slate-700">Fecha de Aplicación</label>
          <input 
            id="dateApplied" 
            v-model="form.dateApplied" 
            type="date" 
            class="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow bg-white"
          />
        </div>

        <div>
          <label for="url" class="mb-1 block text-sm font-medium text-slate-700">URL de la Oferta</label>
          <input 
            id="url" 
            v-model="form.url" 
            type="url" 
            placeholder="https://..." 
            class="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow bg-white"
          />
        </div>

        <div>
          <label for="notes" class="mb-1 block text-sm font-medium text-slate-700">Notas</label>
          <textarea 
            id="notes" 
            v-model="form.notes" 
            rows="3"
            class="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow resize-none bg-white"
          ></textarea>
        </div>

        <div class="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button 
            type="button" 
            class="rounded-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300 transition-colors bg-slate-50 border border-slate-200"
            @click="$emit('close')"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Guardar
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { APPLICATION_STATUSES } from '../constants/statuses'
import type { Application } from '../types/application'

const props = defineProps<{
  initialData?: Application | null
}>()

const emit = defineEmits<{
  (e: 'save', payload: Omit<Application, 'id'> | Application): void
  (e: 'close'): void
}>()

const isEdit = computed(() => !!props.initialData)

// Initialize with a default object pattern
const createDefaultForm = (): Omit<Application, 'id'> => ({
  companyName: '',
  jobTitle: '',
  status: APPLICATION_STATUSES[0],
  dateApplied: new Date().toISOString().split('T')[0],
  url: '',
  notes: ''
})

const form = ref<Omit<Application, 'id'> | Application>(createDefaultForm())
const errors = ref({
  companyName: '',
  jobTitle: ''
})

watch(
  () => props.initialData,
  (newData) => {
    if (newData) {
      form.value = { ...newData }
    } else {
      form.value = createDefaultForm()
    }
  },
  { immediate: true }
)

const handleSubmit = () => {
  // Reset errors
  errors.value = { companyName: '', jobTitle: '' }
  let isValid = true

  const companyNameTrimmed = form.value.companyName.trim()
  const jobTitleTrimmed = form.value.jobTitle.trim()

  if (!companyNameTrimmed) {
    errors.value.companyName = 'La empresa es requerida'
    isValid = false
  }

  if (!jobTitleTrimmed) {
    errors.value.jobTitle = 'El puesto es requerido'
    isValid = false
  }

  if (!isValid) return

  const payload = {
    ...form.value,
    companyName: companyNameTrimmed,
    jobTitle: jobTitleTrimmed
  }

  emit('save', payload)
  emit('close')
}
</script>


