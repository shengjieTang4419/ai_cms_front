import { ref } from 'vue'
import { ElLoading, ElMessage, ElMessageBox } from 'element-plus'

export function useChatLocation({
  locationStore,
  isLocationRelatedQuery
} = {}) {
  const sessionLocation = ref(null)

  const resolveLocationForMessage = async (messageText) => {
    if (!messageText) {
      return { locationInfo: null, enhancedMessageText: messageText || '' }
    }

    let locationInfo = null
    const enhancedMessageText = messageText || ''

    const forceRefreshLocation = /当前位置|现在的位置|我现在在|我的位置/.test(messageText)
    const needLocationForQuery = await isLocationRelatedQuery(messageText)

    if (needLocationForQuery) {
      if (locationStore?.currentLocation && !forceRefreshLocation) {
        locationInfo = locationStore.currentLocation
      } else if (sessionLocation.value && !forceRefreshLocation) {
        locationInfo = sessionLocation.value
      } else {
        let loadingInstance = null
        try {
          loadingInstance = ElLoading.service({
            lock: false,
            text: forceRefreshLocation ? '正在刷新您的位置...' : '正在获取您的位置信息...',
            background: 'rgba(0, 0, 0, 0.7)'
          })

          locationInfo = await locationStore.fetchLocation(forceRefreshLocation)

          if (loadingInstance) {
            loadingInstance.close()
            loadingInstance = null
          }

          if (locationInfo) {
            sessionLocation.value = locationInfo
            ElMessage.success(forceRefreshLocation ? '位置信息已刷新' : '位置信息获取成功')
          }
        } catch (error) {
          if (loadingInstance) {
            loadingInstance.close()
          }

          console.error('定位失败:', error)

          let errorMsg = '定位失败'
          let showDetailedGuide = false

          if (error?.message) {
            if (error.message.includes('定位权限') || error.message.includes('PERMISSION_DENIED')) {
              errorMsg = '定位失败：请允许浏览器访问您的位置信息'
              showDetailedGuide = true
            } else if (error.message.includes('超时') || error.message.includes('TIMEOUT')) {
              errorMsg = '定位超时：请检查网络连接或稍后重试'
            } else if (error.message.includes('不可用') || error.message.includes('UNAVAILABLE')) {
              errorMsg = '定位服务不可用：您的设备可能不支持定位功能'
            } else {
              errorMsg = `定位失败：${error.message}`
            }
          }

          ElMessage.warning(errorMsg)

          if (showDetailedGuide) {
            setTimeout(() => {
              ElMessageBox.alert(
                'Chrome浏览器定位权限设置方法：\n\n' +
                  '1. 点击地址栏左侧的锁图标（或信息图标）\n' +
                  '2. 选择"网站设置"或"权限"\n' +
                  '3. 找到"位置"选项，设置为"允许"\n' +
                  '4. 刷新页面后重试\n\n' +
                  '或者：\n' +
                  '1. 点击浏览器右上角三个点菜单\n' +
                  '2. 选择"设置" > "隐私和安全" > "网站设置"\n' +
                  '3. 找到"位置"权限，设置为"允许"\n' +
                  '4. 刷新页面后重试',
                '定位权限设置指南',
                {
                  confirmButtonText: '知道了',
                  type: 'info'
                }
              )
            }, 500)
          }
        }
      }
    }

    return { locationInfo, enhancedMessageText }
  }

  const clearSessionLocation = () => {
    sessionLocation.value = null
  }

  return {
    sessionLocation,
    resolveLocationForMessage,
    clearSessionLocation
  }
}
