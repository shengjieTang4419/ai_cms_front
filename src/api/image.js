const ensureToken = () => {
    const token = localStorage.getItem('token')
    if (!token) {
        throw new Error('认证失败，请重新登录')
    }
    return token
}

const buildAuthHeaders = (token) => ({
    'Authorization': `Bearer ${token}`
})

const handleJsonResponse = async (response, errorPrefix) => {
    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`${errorPrefix}: ${response.status} ${errorText}`)
    }
    return response.json()
}

export class ImageService {
    async uploadImageFile(file, userId = 1) {
        const token = ensureToken()

        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('userId', userId.toString())

            const response = await fetch('/api/images/upload', {
                method: 'POST',
                headers: buildAuthHeaders(token),
                body: formData
            })

            const data = await handleJsonResponse(response, '图片上传失败')
            if (data.success) {
                return {
                    success: true,
                    fileUrl: data.fileUrl,
                    ocrResult: data.ocr || null
                }
            }
            throw new Error(data.message || '图片上传失败')
        } catch (error) {
            console.error('图片上传错误:', error)
            throw error
        }
    }

    async uploadImage(base64Data, contentType = 'image/png', userId = 1) {
        const token = ensureToken()

        try {
            const formData = new FormData()
            formData.append('base64', base64Data)
            formData.append('contentType', contentType)
            formData.append('userId', userId.toString())

            const response = await fetch('/api/images/upload/base64', {
                method: 'POST',
                headers: buildAuthHeaders(token),
                body: formData
            })

            const data = await handleJsonResponse(response, '图片上传失败')
            if (data.success) {
                return data.fileUrl
            }
            throw new Error(data.message || '图片上传失败')
        } catch (error) {
            console.error('图片上传错误:', error)
            throw error
        }
    }

    async deleteImage(fileUrl) {
        const token = ensureToken()

        try {
            const url = `/api/images/delete?fileUrl=${encodeURIComponent(fileUrl)}`
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    ...buildAuthHeaders(token),
                    'Content-Type': 'application/json'
                }
            })

            const data = await handleJsonResponse(response, '图片删除失败')
            if (data.success) {
                return true
            }
            throw new Error(data.message || '图片删除失败')
        } catch (error) {
            console.error('图片删除错误:', error)
            throw error
        }
    }

    async uploadImages(base64ImageList) {
        try {
            const uploadPromises = base64ImageList.map(base64Data => {
                const match = base64Data.match(/^data:([^;]+);base64,(.+)$/)
                const contentType = match ? match[1] : 'image/png'
                return this.uploadImage(base64Data, contentType)
            })

            return Promise.all(uploadPromises)
        } catch (error) {
            console.error('批量上传图片错误:', error)
            throw error
        }
    }
}

export const imageService = new ImageService()
