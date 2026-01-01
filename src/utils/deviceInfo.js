/**
 * 设备信息工具类
 * 职责：收集真实设备信息，生成有意义的设备标识
 */

class DeviceInfoUtils {
    /**
     * 获取设备标识符
     * 优先使用真实设备信息，生成有意义的标识
     */
    static getDeviceId() {
        // 尝试从localStorage获取已存在的设备ID
        let deviceId = localStorage.getItem('device_id')
        
        if (!deviceId) {
            // 生成基于真实设备信息的ID
            deviceId = this.generateMeaningfulDeviceId()
            localStorage.setItem('device_id', deviceId)
        }
        
        return deviceId
    }

    /**
     * 生成符合后端策略的设备ID
     * PC端格式：pc_${fingerprint}（固定，不包含时间戳）
     * 移动端格式：mobile_${platform}_${uuid}
     */
    static generateMeaningfulDeviceId() {
        const deviceInfo = this.getRealDeviceInfo()
        const { deviceType, deviceModel, osVersion, browser } = deviceInfo
        
        // 判断是否为移动端
        if (this.isMobileDevice(deviceType)) {
            // 移动端格式：mobile_${platform}_${uuid}
            const platform = deviceType.toLowerCase() // iphone, android, ipad
            const uuid = this.generateUUID()
            return `mobile_${platform}_${uuid}`
        } else {
            // PC端格式：pc_${fingerprint}（固定指纹，无时间戳）
            const fingerprint = this.generateFingerprint(deviceInfo)
            return `pc_${fingerprint}`
        }
    }

    /**
     * 判断是否为移动设备
     */
    static isMobileDevice(deviceType) {
        return ['iPhone', 'Android', 'iPad'].includes(deviceType)
    }

    /**
     * 生成UUID
     */
    static generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0
            const v = c == 'x' ? r : (r & 0x3 | 0x8)
            return v.toString(16)
        })
    }

    /**
     * 获取真实设备信息
     */
    static getRealDeviceInfo() {
        const userAgent = navigator.userAgent
        const platform = navigator.platform
        
        // 解析设备信息
        const deviceInfo = {
            deviceType: this.parseDeviceType(userAgent, platform),
            deviceModel: this.parseDeviceModel(userAgent),
            osVersion: this.parseOSVersion(userAgent),
            browser: this.parseBrowser(userAgent),
            userAgent: userAgent,
            platform: platform
        }
        
        return deviceInfo
    }

    /**
     * 解析设备类型
     */
    static parseDeviceType(userAgent, platform) {
        if (userAgent.includes('iPhone')) return 'iPhone'
        if (userAgent.includes('iPad')) return 'iPad'
        if (userAgent.includes('Android')) return 'Android'
        if (platform.includes('Mac') || userAgent.includes('Macintosh')) return 'Mac'
        if (platform.includes('Win') || userAgent.includes('Windows')) return 'Windows'
        if (platform.includes('Linux')) return 'Linux'
        return 'Unknown'
    }

    /**
     * 解析设备型号
     */
    static parseDeviceModel(userAgent) {
        // iPhone 型号
        if (userAgent.includes('iPhone')) {
            if (userAgent.includes('iPhone14,1')) return 'iPhone14Pro'
            if (userAgent.includes('iPhone14,2')) return 'iPhone14ProMax'
            if (userAgent.includes('iPhone14,3')) return 'iPhone15Pro'
            if (userAgent.includes('iPhone14,4')) return 'iPhone15ProMax'
            if (userAgent.includes('iPhone14,5')) return 'iPhone14'
            if (userAgent.includes('iPhone14,6')) return 'iPhone14Plus'
            if (userAgent.includes('iPhone14,7')) return 'iPhone15'
            if (userAgent.includes('iPhone14,8')) return 'iPhone15Plus'
            return 'iPhone'
        }

        // Android 设备型号
        if (userAgent.includes('Android')) {
            const match = userAgent.match(/; ([^)]+)\)/)
            if (match && match[1]) {
                return match[1].replace(/Build\/.*$/, '').replace(/\s+/g, '_')
            }
            return 'Android'
        }

        // Mac 型号
        if (userAgent.includes('Macintosh')) {
            return 'Mac'
        }

        // Windows 型号
        if (userAgent.includes('Windows')) {
            if (userAgent.includes('Windows NT 10.0')) return 'Windows10'
            if (userAgent.includes('Windows NT 6.3')) return 'Windows8.1'
            if (userAgent.includes('Windows NT 6.1')) return 'Windows7'
            return 'Windows'
        }

        return 'Unknown'
    }

    /**
     * 解析操作系统版本
     */
    static parseOSVersion(userAgent) {
        // iOS 版本
        if (userAgent.includes('CPU OS')) {
            const match = userAgent.match(/CPU OS ([0-9_]+)/)
            if (match) {
                return match[1].replace(/_/g, '.')
            }
        }

        // Android 版本
        if (userAgent.includes('Android')) {
            const match = userAgent.match(/Android ([0-9.]+)/)
            if (match) {
                return match[1]
            }
        }

        // Windows 版本
        if (userAgent.includes('Windows NT')) {
            const match = userAgent.match(/Windows NT ([0-9.]+)/)
            if (match) {
                return match[1]
            }
        }

        // Mac 版本
        if (userAgent.includes('Mac OS X')) {
            const match = userAgent.match(/Mac OS X ([0-9_]+)/)
            if (match) {
                return match[1].replace(/_/g, '.')
            }
        }

        return 'Unknown'
    }

    /**
     * 解析浏览器信息
     */
    static parseBrowser(userAgent) {
        if (userAgent.includes('Chrome')) return 'Chrome'
        if (userAgent.includes('Firefox')) return 'Firefox'
        if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari'
        if (userAgent.includes('Edge')) return 'Edge'
        if (userAgent.includes('Opera')) return 'Opera'
        return 'Unknown'
    }

    /**
     * 生成设备指纹（用于唯一性）
     */
    static generateFingerprint(deviceInfo) {
        const { deviceType, deviceModel, osVersion, browser, platform, userAgent } = deviceInfo
        
        // 简单哈希函数
        const str = `${deviceType}_${deviceModel}_${osVersion}_${browser}_${platform}_${userAgent}`
        let hash = 0
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i)
            hash = ((hash << 5) - hash) + char
            hash = hash & hash // 转换为32位整数
        }
        return Math.abs(hash).toString(16).substring(0, 8)
    }

    /**
     * 获取完整的设备信息（用于调试）
     */
    static getDeviceInfo() {
        return {
            deviceId: this.getDeviceId(),
            ...this.getRealDeviceInfo(),
            timestamp: new Date().toISOString(),
            screenResolution: `${screen.width}x${screen.height}`,
            colorDepth: screen.colorDepth,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
    }

    /**
     * 重置设备ID
     */
    static resetDeviceId() {
        localStorage.removeItem('device_id')
        return this.getDeviceId()
    }
}

export default DeviceInfoUtils
