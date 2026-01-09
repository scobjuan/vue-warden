import type { IPermissionPage as IPermissions } from '../types/permission_store'

let permissions: IPermissions | {} = {}

export function setPermissions(
  newPermissionsList: Readonly<IPermissions | null | undefined>
): void {
  permissions = Array.isArray(newPermissionsList) ? [...newPermissionsList] : {}
}

export function getPermissions(): IPermissions | {} {
  return { ...permissions }
}
