import { CheckKey, Status } from "@/components/diagnosis-result"

export interface Agent {
  id: string
  agentId: string
  name: string
  token: string
  description: string
  price?: number
  status: "active" | "inactive" | "status"
  avatar: string
  category: string
  tags: string[]
  tier?: {
    name: "None" | "Newborn" | "Baby" | "Child" | "Teen" | "Adult"
    level: number
    stakedAIUS: number
  }
  vrmUrl: string,
  bgUrl: string,
  config: {
    chatbot: string
    tts: string
    stt: string
    vision: string
    amicaLife: string
  }
  integrations: {
    brain?: string
    virtuals?: string
    eacc?: string
    uos?: string
  },
  diagnosisResult?: Record<CheckKey, Status>,
  talentShowScore?: string
}

