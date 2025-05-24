import { CheckKey, Status } from "@/components/diagnosis-result"

export interface Agent {
  id: string
  name: string
  token: string
  description: string
  price: number
  status: "active" | "inactive" | "status"
  avatar: string
  category: string
  tags: string[]
  tier: {
    name: "None" | "Newborn" | "Baby" | "Child" | "Teen" | "Adult"
    level: number
    stakedAIUS: number
  }
  vrmUrl: string,
  bgUrl: string,
  config: {
    chatbotBackend: string
    ttsBackend: string
    sttBackend: string
    visionBackend: string
    amicaLifeBackend: string
  }
  diagnosisResult?: Record<CheckKey, Status>
}

