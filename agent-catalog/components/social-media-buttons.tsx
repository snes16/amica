import { getExplorerUrl } from "@/lib/agents"
import { Button } from "./ui/button"
import { Twitter, Facebook, Linkedin, Github } from "lucide-react"
import { Agent } from "@/types/agent"

interface SocialMediaProps {
  agent: Agent;
}

export function SocialMediaButtons({agent}: SocialMediaProps) {
  return (
    <div className="flex space-x-4">
      {agent.erc20 && (
        <Button
          variant="outline"
          className="border-blue-700 text-blue-700 hover:bg-blue-100 hover:text-blue-900"
          onClick={() =>
            window.open(getExplorerUrl(agent.erc20!), "_blank", "noopener,noreferrer")
          }
        >
          View on Explorer
        </Button>
      )}
      <Button
        variant="outline"
        size="icon"
        className="border-blue-400 text-blue-400 hover:bg-blue-100 hover:text-blue-600"
      >
        <Twitter className="h-5 w-5" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="border-blue-600 text-blue-600 hover:bg-blue-100 hover:text-blue-800"
      >
        <Facebook className="h-5 w-5" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="border-blue-700 text-blue-700 hover:bg-blue-100 hover:text-blue-900"
      >
        <Linkedin className="h-5 w-5" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="border-gray-700 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
      >
        <Github className="h-5 w-5" />
      </Button>
    </div>
  )
}

