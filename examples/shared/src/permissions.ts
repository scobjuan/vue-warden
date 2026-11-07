export type Role = 'admin' | 'editor' | 'viewer'

export const roles: Role[] = ['admin', 'editor', 'viewer']

interface Input {
  key: string
  can_view: boolean
  can_edit: boolean
}

interface Component {
  key: string
  can_access: boolean
  inputs: Input[]
}

interface Page {
  key: string
  can_access: boolean
  components: Component[]
}

const input = (key: string, can_view = true, can_edit = true): Input => ({
  key,
  can_view,
  can_edit
})

const pages: Record<Role, Record<string, Page>> = {
  admin: {
    home: { key: 'home', can_access: true, components: [] },
    users: {
      key: 'users',
      can_access: true,
      components: [
        {
          key: 'filter',
          can_access: true,
          inputs: [input('username'), input('status')]
        },
        {
          key: 'new-user',
          can_access: true,
          inputs: [
            input('username'),
            input('email'),
            input('password'),
            input('save')
          ]
        }
      ]
    },
    billing: { key: 'billing', can_access: true, components: [] },
    settings: { key: 'settings', can_access: true, components: [] }
  },
  editor: {
    home: { key: 'home', can_access: true, components: [] },
    users: {
      key: 'users',
      can_access: true,
      components: [
        {
          key: 'filter',
          can_access: true,
          inputs: [input('username'), input('status')]
        },
        {
          key: 'new-user',
          can_access: true,
          inputs: [
            input('username'),
            input('email', true, false),
            input('password', false, false),
            input('save')
          ]
        }
      ]
    },
    billing: { key: 'billing', can_access: false, components: [] },
    settings: { key: 'settings', can_access: true, components: [] }
  },
  viewer: {
    home: { key: 'home', can_access: true, components: [] },
    users: {
      key: 'users',
      can_access: true,
      components: [
        {
          key: 'filter',
          can_access: true,
          inputs: [input('username'), input('status', true, false)]
        },
        { key: 'new-user', can_access: false, inputs: [] }
      ]
    },
    billing: { key: 'billing', can_access: false, components: [] },
    settings: { key: 'settings', can_access: false, components: [] }
  }
}

export function permissionsFor(role: string, pageKey: string): Page {
  const byRole = pages[role as Role] ?? pages.viewer
  return byRole[pageKey] ?? { key: pageKey, can_access: false, components: [] }
}
