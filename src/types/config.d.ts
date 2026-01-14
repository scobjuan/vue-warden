import type { AxiosInstance } from './axios'

export interface IPackageConfig {
  permissionsApiUrl: string
  permissionApiMethod: string
  axiosInstance: AxiosInstance
  forbiddenNameRoute: string
}
