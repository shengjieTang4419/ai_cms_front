<template>
  <div class="feature-hints">
    <div class="hint-card">
      <div class="hint-icon">🌤️</div>
      <div class="hint-content">
        <h3>天气查询</h3>
        <p>现在支持天气查询功能！您可以询问任何城市的天气情况。</p>
        <div class="hint-examples">
          <span class="example-tag" @click="$emit('fill', '北京今天天气怎么样？')">"北京今天天气怎么样？"</span>
          <span class="example-tag" @click="$emit('fill', '上海今天会下雨吗？')">"上海今天会下雨吗？"</span>
        </div>
      </div>
    </div>

    <div class="hint-card">
      <div class="hint-icon">🗺️</div>
      <div class="hint-content">
        <h3>路线规划</h3>
        <p>支持多种出行方式的路线规划！</p>
        <div class="route-types">
          <span class="route-type-tag">🚗 驾车</span>
          <span class="route-type-tag">🚶 步行</span>
          <span class="route-type-tag">🚴 骑行</span>
        </div>
        <div class="hint-examples">
          <span class="example-tag" @click="$emit('fill', '我现在开车去上海南站怎么走？')">"我现在开车去上海南站怎么走？"</span>
          <span class="example-tag" @click="$emit('fill', '从上海外滩步行到东方明珠塔怎么走？')">"从上海外滩步行到东方明珠塔怎么走？"</span>
          <span class="example-tag" @click="$emit('fill', '我现在骑行去上海浦江郊野公园怎么走？')">"我现在骑行去上海浦江郊野公园怎么走？"</span>
        </div>
      </div>
    </div>

    <div class="hint-card">
      <div class="hint-icon">💡</div>
      <div class="hint-content">
        <h3>猜你喜欢</h3>
        <p v-if="loadingRecommendations">正在加载推荐内容...</p>
        <p v-else-if="recommendations.length === 0">暂无推荐内容</p>
        <div v-else class="hint-examples">
          <span
            v-for="(item, index) in recommendations"
            :key="index"
            class="example-tag recommendation-tag"
            @click="$emit('fill', item.question)"
            :title="item.label ? `${item.label}` : ''"
          >
            <span v-if="item.label" class="tag-label">{{ item.label }}</span>
            <span class="tag-question">{{ item.question }}</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '../stores/user'
import { getPersonalizedRecommendations } from '../api/recommendation'

defineEmits(['fill'])

const userStore = useUserStore()

const recommendations = ref([])
const loadingRecommendations = ref(false)

const loadRecommendations = async () => {
  try {
    loadingRecommendations.value = true
    const userId = userStore.user?.id || 1
    const data = await getPersonalizedRecommendations(userId)

    if (data && data.generatedQuestions && Array.isArray(data.generatedQuestions)) {
      recommendations.value = data.generatedQuestions.map(item => {
        if (typeof item === 'string' && item.includes('->')) {
          const parts = item.split('->')
          return {
            label: parts[0].trim(),
            question: parts[1].trim(),
            fullText: item
          }
        }
        return {
          label: '',
          question: item,
          fullText: item
        }
      })
    } else if (Array.isArray(data)) {
      recommendations.value = data.map(item => ({
        label: '',
        question: item,
        fullText: item
      }))
    } else if (data && data.recommendations && Array.isArray(data.recommendations)) {
      recommendations.value = data.recommendations.map(item => ({
        label: '',
        question: item,
        fullText: item
      }))
    } else {
      recommendations.value = []
    }
  } catch (error) {
    console.error('加载个性化推荐失败:', error)
    recommendations.value = []
  } finally {
    loadingRecommendations.value = false
  }
}

onMounted(() => {
  loadRecommendations()
})
</script>

<style scoped>
.feature-hints {
  flex: 1;
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 40px 20px;
  gap: 20px;
  flex-wrap: nowrap;
}

.hint-card {
  background: #2a2a2a;
  border-radius: 16px;
  padding: 20px;
  flex: 1;
  min-width: 0;
  max-width: 380px;
  border: 1px solid #3a3a3a;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  flex-direction: column;
}

.hint-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
}

.hint-icon {
  font-size: 40px;
  text-align: center;
  margin-bottom: 12px;
}

.hint-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.hint-content h3 {
  color: #e6e6e6;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 10px 0;
  text-align: center;
}

.hint-content p {
  color: #b6b6b6;
  font-size: 13px;
  line-height: 1.5;
  margin: 0 0 12px 0;
  text-align: center;
}

.hint-examples {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: auto;
}

.example-tag {
  background: #3a3a3a;
  color: #d6d6d6;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  border: 1px solid #4a4a4a;
  transition: all 0.2s ease;
  cursor: pointer;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.example-tag:hover {
  background: #4a4a4a;
  border-color: #5a5a5a;
  transform: translateY(-1px);
}

.route-types {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.route-type-tag {
  background: #3a3a3a;
  color: #e6e6e6;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid #4a4a4a;
}

/* 推荐标签样式 */
.recommendation-tag {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.tag-label {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
  flex-shrink: 0;
}

.tag-question {
  flex: 1;
  font-size: 12px;
  color: #e6e6e6;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 响应式设计 - 小屏幕时换行 */
@media (max-width: 1200px) {
  .feature-hints {
    flex-wrap: wrap;
  }

  .hint-card {
    max-width: 500px;
    min-width: 300px;
  }
}
</style>
