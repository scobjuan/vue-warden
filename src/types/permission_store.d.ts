export interface IPermissionInput {
  key: string
  can_view: boolean
  can_edit: boolean
}

export interface IPermissionComponent {
  key: string
  can_access: boolean
  inputs: IPermissionInput[]
}

export interface IPermissionPage {
  key: string
  can_access: boolean
  components: IPermissionComponent[]
}
