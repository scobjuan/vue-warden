import { defineComponent, h, type VNode } from 'vue'

import { getPermissions } from './stores/permissions.store'

import type {
  IPermissionComponent,
  IPermissionInput
} from './types/permission_store'

const permissions = getPermissions()

let componentContext: IPermissionComponent | undefined = undefined

function allowComponent(element: any): element is IPermissionComponent {
  return element?.can_access
}

function allowInput(element: any): element is IPermissionInput {
  return !element?.can_access
}

function cloneVNodeShallow(vnode: VNode): VNode {
  return { ...vnode }
}

function permissionResolver(type: 'component' | 'input', key: string) {
  if (!('components' in permissions)) return

  const elementList =
    type === 'component' ? permissions.components : componentContext?.inputs

  const elementPermission = elementList?.filter(
    (element: any) => element.key === key
  )[0]

  return elementPermission
}

function renderChildren(vnode: any) {
  const children = vnode.children ? vnode.children.default() : []
  const childrenCloned = children.map((child: any) => {
    const inputKey = child.props['input-key']

    const inputPermission = permissionResolver('input', inputKey)

    if (!allowInput(inputPermission)) return

    if (!inputPermission?.can_view) return

    if (!inputPermission?.can_edit) {
      child.props = {
        ...(child.props || {}),
        disable: true
      }
    }
    return child
  })

  childrenCloned.filter((child: any) => child).map((child: any) => h(child))

  return childrenCloned
}

function renderComponent(vnode: VNode | undefined): VNode {
  if (!vnode) return h('div', 'You dont have permissions in this component.')

  const componentKey = vnode.props!['component-key']

  const componentPermission = permissionResolver('component', componentKey)

  componentContext = componentPermission as IPermissionComponent

  if (!allowComponent(componentPermission) && componentPermission !== undefined)
    return h('div', 'You dont have permissions in this component.')

  const newChildren = renderChildren(vnode)

  if (!newChildren) return h(vnode)

  return h(
    vnode.type as any,
    { ...vnode.props, ref: vnode.ref as any },
    () => newChildren
  )
}

export default defineComponent({
  name: 'PermissionWrapper',
  props: {
    enabled: {
      type: Boolean,
      default: true
    }
  },
  setup(props, { slots }) {
    const component = slots.default?.()[0]
      ? cloneVNodeShallow(slots.default?.()[0])
      : undefined

    const children = component?.children as any
    if (!props.enabled)
      return () =>
        h(
          component?.type as any,
          { ...component?.props, ref: component?.ref as any },
          children
        )

    return () => renderComponent(component)
  }
})
