import type { RawPagePermission } from '../src/core/types'

export const rawPage: RawPagePermission = {
  key: 'users',
  can_access: true,
  components: [
    {
      key: 'filter',
      can_access: true,
      inputs: [
        { key: 'username', can_view: true, can_edit: true },
        { key: 'email', can_view: true, can_edit: false },
        { key: 'password', can_view: false, can_edit: true }
      ]
    },
    { key: 'billing', can_access: false, inputs: [] }
  ]
}
