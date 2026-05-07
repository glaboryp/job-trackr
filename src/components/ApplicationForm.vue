<template>
  <div
    ref="modalRef"
    class="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 p-4 sm:p-0 backdrop-blur-sm"
    @keydown.esc="$emit('close')"
  >
    <div
      class="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white p-6 shadow-[12px_12px_0px_0px_#18181b] border-4 border-zinc-900 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <h2 id="modal-title" class="mb-8 text-3xl font-black uppercase tracking-tighter text-zinc-900 border-b-4 border-zinc-900 pb-4">
        {{ isEdit ? 'Editar Aplicación' : 'Nueva Aplicación' }}
      </h2>
      <p id="modal-description" class="mb-4 text-sm font-mono text-zinc-600">
        Los campos marcados con <span class="font-bold text-indigo-600">*</span> son obligatorios.
      </p>
      
      <form @submit.prevent="handleSubmit" class="space-y-5">
        <div>
          <label for="companyName" class="mb-2 block text-sm font-bold uppercase tracking-widest text-zinc-900">Empresa <span class="text-indigo-600">*</span></label>
          <input
            ref="companyNameInput"
            id="companyName"
            v-model="form.companyName"
            type="text"
            :maxlength="LIMITS.companyName"
            required
            aria-required="true"
            :aria-invalid="errors.companyName ? 'true' : 'false'"
            :aria-describedby="errors.companyName ? 'companyName-error' : undefined"
            :class="[
              'block w-full cursor-text border-2 px-3 py-2 text-sm font-mono text-zinc-900 placeholder-zinc-400 transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20',
              errors.companyName ? 'border-rose-600 bg-rose-50 focus:border-rose-600' : 'border-zinc-900 focus:border-indigo-600'
            ]"
            placeholder="Ej: Tech Corp"
          />
          <span v-if="errors.companyName" id="companyName-error" role="alert" class="mt-2 block text-xs font-bold uppercase tracking-wide text-rose-600 error-msg">{{ errors.companyName }}</span>
        </div>

        <div>
          <label for="jobTitle" class="mb-2 block text-sm font-bold uppercase tracking-widest text-zinc-900">Puesto <span class="text-indigo-600">*</span></label>
<input
            ref="jobTitleInput"
            id="jobTitle"
            v-model="form.jobTitle"
            type="text"
            :maxlength="LIMITS.jobTitle"
            required
            aria-required="true"
            :aria-invalid="errors.jobTitle ? 'true' : 'false'"
            :aria-describedby="errors.jobTitle ? 'jobTitle-error' : undefined"
            :class="[
              'block w-full cursor-text border-2 px-3 py-2 text-sm font-mono text-zinc-900 placeholder-zinc-400 transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20',
              errors.jobTitle ? 'border-rose-600 bg-rose-50 focus:border-rose-600' : 'border-zinc-900 focus:border-indigo-600'
            ]"
            placeholder="Ej: Frontend Developer"
          />
          <span v-if="errors.jobTitle" id="jobTitle-error" role="alert" class="mt-2 block text-xs font-bold uppercase tracking-wide text-rose-600 error-msg">{{ errors.jobTitle }}</span>
        </div>

        <div>
          <label for="status" class="mb-2 block text-sm font-bold uppercase tracking-widest text-zinc-900">Estado</label>
          <select 
            id="status" 
            v-model="form.status"
            class="block w-full cursor-pointer border-2 border-zinc-900 bg-white px-3 py-2 text-sm font-mono font-bold text-zinc-900 transition-all focus:outline-none focus-visible:border-indigo-600 focus-visible:ring-4 focus-visible:ring-indigo-500/20"
          >
            <option v-for="status in APPLICATION_STATUSES" :key="status" :value="status">
              {{ status }}
            </option>
          </select>
        </div>


        <div>
          <label for="modality" class="mb-2 block text-sm font-bold uppercase tracking-widest text-zinc-900">Modalidad</label>
          <select 
            id="modality" 
            data-testid="application-modality"
            v-model="form.modality"
            class="block w-full cursor-pointer border-2 border-zinc-900 bg-white px-3 py-2 text-sm font-mono font-bold text-zinc-900 transition-all focus:outline-none focus-visible:border-indigo-600 focus-visible:ring-4 focus-visible:ring-indigo-500/20"
          >
            <option v-for="modality in APPLICATION_MODALITIES" :key="modality" :value="modality">
              {{ modality }}
            </option>
          </select>
        </div>

        <div>
          <label for="workLocation" class="mb-2 block text-sm font-bold uppercase tracking-widest text-zinc-900">
            Ubicación <span v-if="isLocationRequired" class="text-indigo-600">*</span>
          </label>
          <input
            ref="workLocationInput"
            id="workLocation"
            data-testid="application-work-location"
            v-model="form.workLocation"
            type="text"
            :maxlength="LIMITS.workLocation"
            :disabled="!isLocationRequired && form.modality === 'Remoto'"
            :aria-required="isLocationRequired ? 'true' : 'false'"
            :aria-invalid="errors.workLocation ? 'true' : 'false'"
            :aria-describedby="errors.workLocation ? 'workLocation-error' : 'workLocation-help'"
            :class="[
              'block w-full cursor-text border-2 px-3 py-2 text-sm font-mono text-zinc-900 placeholder-zinc-400 transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20',
              errors.workLocation ? 'border-rose-600 bg-rose-50 focus:border-rose-600' : 'border-zinc-900 focus:border-indigo-600',
              !isLocationRequired && form.modality === 'Remoto' ? 'bg-zinc-100 text-zinc-400 border-zinc-300' : 'bg-white'
            ]"
            placeholder="Ej: Madrid, España"
          />
          <span id="workLocation-help" class="mt-2 block text-xs font-mono text-zinc-600">
            {{ isLocationRequired ? 'Indica ciudad o país para modalidad presencial/híbrida.' : 'No requerida para modalidad remota.' }}
          </span>
          <span v-if="errors.workLocation" id="workLocation-error" role="alert" class="mt-2 block text-xs font-bold uppercase tracking-wide text-rose-600 error-msg">{{ errors.workLocation }}</span>
        </div>
        <div>
          <label for="dateApplied" class="mb-2 block text-sm font-bold uppercase tracking-widest text-zinc-900">Fecha de Aplicación</label>
          <input 
            id="dateApplied" 
            v-model="form.dateApplied" 
            type="date" 
            class="block w-full cursor-pointer border-2 border-zinc-900 bg-white px-3 py-2 text-sm font-mono font-bold text-zinc-900 transition-all focus:outline-none focus-visible:border-indigo-600 focus-visible:ring-4 focus-visible:ring-indigo-500/20"
          />
        </div>

        <div>
          <label for="url" class="mb-2 block text-sm font-bold uppercase tracking-widest text-zinc-900">URL de la Oferta</label>
          <input 
            id="url" 
            v-model="form.url" 
            type="url" 
            ref="urlInput"
            :maxlength="LIMITS.url"
            placeholder="https://..." 
            class="block w-full cursor-text border-2 border-zinc-900 bg-white px-3 py-2 text-sm font-mono text-zinc-900 placeholder-zinc-400 transition-all focus:outline-none focus-visible:border-indigo-600 focus-visible:ring-4 focus-visible:ring-indigo-500/20"
          />
          <span v-if="errors.url" id="url-error" role="alert" class="mt-2 block text-xs font-bold uppercase tracking-wide text-rose-600 error-msg">{{ errors.url }}</span>
        </div>

        <div class="flex items-center gap-3">
          <input
            id="isInteresting"
            v-model="form.isInteresting"
            data-testid="application-interesting"
            type="checkbox"
            class="h-5 w-5 cursor-pointer border-2 border-zinc-900 accent-indigo-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20"
          />
          <label for="isInteresting" class="text-sm font-bold uppercase tracking-widest text-zinc-900">
            Oferta interesante
          </label>
        </div>

        <div>
          <label for="notes" class="mb-2 block text-sm font-bold uppercase tracking-widest text-zinc-900">Notas</label>
          <textarea 
            id="notes" 
            v-model="form.notes" 
            ref="notesInput"
            rows="4"
            :maxlength="LIMITS.notes"
            class="block w-full cursor-text resize-y border-2 border-zinc-900 bg-white px-3 py-2 text-sm font-mono text-zinc-900 placeholder-zinc-400 transition-all focus:outline-none focus-visible:border-indigo-600 focus-visible:ring-4 focus-visible:ring-indigo-500/20"
          ></textarea>
          <span v-if="errors.notes" id="notes-error" role="alert" class="mt-2 block text-xs font-bold uppercase tracking-wide text-rose-600 error-msg">{{ errors.notes }}</span>
        </div>

        <p
          v-if="hasErrors"
          role="status"
          aria-live="polite"
          class="rounded border-2 border-rose-600 bg-rose-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-rose-700"
          data-testid="form-error-summary"
        >
          Revisa {{ errorCount }} {{ errorCount === 1 ? 'campo obligatorio' : 'campos obligatorios' }} antes de guardar.
        </p>

        <div class="mt-8 flex flex-col-reverse sm:flex-row justify-end gap-4 pt-6 border-t-4 border-zinc-900">
          <button 
            type="button" 
            class="cursor-pointer border-2 border-zinc-900 bg-white px-6 py-3 text-sm font-bold uppercase tracking-widest text-zinc-900 transition-all hover:bg-zinc-100 hover:shadow-[4px_4px_0px_0px_#18181b] active:translate-y-1 active:translate-x-1 active:shadow-none focus:outline-none focus-visible:ring-4 focus-visible:ring-zinc-500/30"
            @click="$emit('close')"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            class="cursor-pointer border-2 border-zinc-900 bg-indigo-600 px-6 py-3 text-sm font-bold uppercase tracking-widest text-white transition-all shadow-[6px_6px_0px_0px_#18181b] hover:bg-indigo-700 hover:shadow-[4px_4px_0px_0px_#18181b] active:translate-y-1 active:translate-x-1 active:shadow-none focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/60"
          >
            Guardar
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useFocusTrap } from '@vueuse/integrations/useFocusTrap'
import { APPLICATION_STATUSES } from '../constants/statuses'
import { APPLICATION_MODALITIES } from '../constants/modalities'
import type { Application } from '../types/application'

const props = defineProps<{
  initialData?: Application | null
}>()

const emit = defineEmits<{
  (e: 'save', payload: Omit<Application, 'id'> | Application): void
  (e: 'close'): void
}>()

const isEdit = computed(() => !!props.initialData)

const LIMITS = {
  companyName: 200,
  jobTitle: 200,
  workLocation: 300,
  url: 2048,
  notes: 5000,
} as const

// Initialize with a default object pattern
const createDefaultForm = (): Omit<Application, 'id'> => ({
  companyName: '',
  jobTitle: '',
  status: APPLICATION_STATUSES[0],
  modality: 'Remoto',
  workLocation: '',
  dateApplied: new Date().toISOString().split('T')[0],
  url: '',
  notes: '',
  isInteresting: false,
})

const form = ref<Omit<Application, 'id'> | Application>(createDefaultForm())
const companyNameInput = ref<HTMLInputElement | null>(null)
const jobTitleInput = ref<HTMLInputElement | null>(null)
const workLocationInput = ref<HTMLInputElement | null>(null)
const urlInput = ref<HTMLInputElement | null>(null)
const notesInput = ref<HTMLTextAreaElement | null>(null)
const modalRef = ref<HTMLElement | null>(null)

const { activate: activateFocusTrap, deactivate: deactivateFocusTrap } = useFocusTrap(modalRef, {
  allowOutsideClick: false,
})

onMounted(() => {
  nextTick(() => {
    try {
      activateFocusTrap()
    } catch (e) {
      console.warn('Focus trap activation skipped:', e)
    }
  })
})

onUnmounted(() => {
  deactivateFocusTrap()
})

const errors = ref({
  companyName: '',
  jobTitle: '',
  workLocation: '',
  url: '',
  notes: '',
})

const errorCount = computed(() => Object.values(errors.value).filter(Boolean).length)
const hasErrors = computed(() => errorCount.value > 0)

function focusFirstInvalidField(): void {
  if (errors.value.companyName) {
    companyNameInput.value?.focus()
    return
  }

  if (errors.value.jobTitle) {
    jobTitleInput.value?.focus()
    return
  }

  if (errors.value.workLocation) {
    workLocationInput.value?.focus()
    return
  }

  if (errors.value.url) {
    urlInput.value?.focus()
    return
  }

  if (errors.value.notes) {
    notesInput.value?.focus()
  }
}

function focusPrimaryField(): void {
  nextTick(() => {
    companyNameInput.value?.focus()
  })
}

const isLocationRequired = computed(() => {
  return form.value.modality === 'Presencial' || form.value.modality === 'Híbrido'
})

watch(
  () => form.value.modality,
  (newModality) => {
    if (newModality === 'Remoto') {
      form.value.workLocation = ''
      errors.value.workLocation = ''
    }
  }
)

watch(
  () => form.value.companyName,
  (newValue) => {
    if (errors.value.companyName && newValue.trim()) {
      errors.value.companyName = ''
    }
  }
)

watch(
  () => form.value.jobTitle,
  (newValue) => {
    if (errors.value.jobTitle && newValue.trim()) {
      errors.value.jobTitle = ''
    }
  }
)

watch(
  () => form.value.workLocation,
  (newValue) => {
    if (errors.value.workLocation && (!isLocationRequired.value || newValue.trim())) {
      errors.value.workLocation = ''
    }
  }
)

watch(
  () => form.value.url,
  (newValue) => {
    if (errors.value.url && (!newValue || !newValue.trim())) {
      errors.value.url = ''
    }
  }
)

watch(
  () => form.value.notes,
  (newValue) => {
    if (errors.value.notes && (!newValue || !newValue.trim())) {
      errors.value.notes = ''
    }
  }
)

watch(
  () => props.initialData,
  (newData) => {
    if (newData) {
      form.value = { ...newData }
    } else {
      form.value = createDefaultForm()
    }

    errors.value = { companyName: '', jobTitle: '', workLocation: '', url: '', notes: '' }
    focusPrimaryField()
  },
  { immediate: true }
)

onMounted(() => {
  focusPrimaryField()
})

const handleSubmit = () => {
  // Reset errors
  errors.value = { companyName: '', jobTitle: '', workLocation: '', url: '', notes: '' }
  let isValid = true

  const companyNameTrimmed = form.value.companyName.trim()
  const jobTitleTrimmed = form.value.jobTitle.trim()
  const workLocationTrimmed = form.value.workLocation ? form.value.workLocation.trim() : ''

  if (!companyNameTrimmed) {
    errors.value.companyName = 'La empresa es requerida'
    isValid = false
  } else if (companyNameTrimmed.length > LIMITS.companyName) {
    errors.value.companyName = `La empresa no puede exceder ${LIMITS.companyName} caracteres`
    isValid = false
  }

  if (!jobTitleTrimmed) {
    errors.value.jobTitle = 'El puesto es requerido'
    isValid = false
  } else if (jobTitleTrimmed.length > LIMITS.jobTitle) {
    errors.value.jobTitle = `El puesto no puede exceder ${LIMITS.jobTitle} caracteres`
    isValid = false
  }
  
  if (isLocationRequired.value && !workLocationTrimmed) {
    errors.value.workLocation = 'La ubicación es requerida'
    isValid = false
  } else if (workLocationTrimmed && workLocationTrimmed.length > LIMITS.workLocation) {
    errors.value.workLocation = `La ubicación no puede exceder ${LIMITS.workLocation} caracteres`
    isValid = false
  }

  if (form.value.url && form.value.url.length > LIMITS.url) {
    errors.value.url = `La URL no puede exceder ${LIMITS.url} caracteres`
    isValid = false
  }

  if (form.value.notes && form.value.notes.length > LIMITS.notes) {
    errors.value.notes = `Las notas no pueden exceder ${LIMITS.notes} caracteres`
    isValid = false
  }

  if (!isValid) {
    nextTick(() => {
      focusFirstInvalidField()
    })
    return
  }

  const payload = {
    ...form.value,
    companyName: companyNameTrimmed,
    jobTitle: jobTitleTrimmed,
    workLocation: workLocationTrimmed
  }

  emit('save', payload)
  emit('close')
}
</script>
