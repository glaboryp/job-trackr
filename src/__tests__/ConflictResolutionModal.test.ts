import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ConflictResolutionModal from '../components/ConflictResolutionModal.vue'

describe('ConflictResolutionModal', () => {
  it('renders counts and emits selected strategy', async () => {
    const wrapper = mount(ConflictResolutionModal, {
      props: {
        isOpen: true,
        localCount: 2,
        remoteCount: 3,
        isReconciling: false,
        errorMessage: null,
      },
    })

    expect(wrapper.get('[data-testid="conflict-local-count"]').text()).toContain('2')
    expect(wrapper.get('[data-testid="conflict-remote-count"]').text()).toContain('3')

    await wrapper.get('[data-testid="conflict-merge"]').trigger('click')
    expect(wrapper.emitted('resolve')).toBeTruthy()
    expect(wrapper.emitted('resolve')?.[0]).toEqual(['merge'])
  })

  it('does not emit strategy while reconciling', async () => {
    const wrapper = mount(ConflictResolutionModal, {
      props: {
        isOpen: true,
        localCount: 1,
        remoteCount: 1,
        isReconciling: true,
        errorMessage: null,
      },
    })

    await wrapper.get('[data-testid="conflict-keep-local"]').trigger('click')
    expect(wrapper.emitted('resolve')).toBeFalsy()
  })
})
