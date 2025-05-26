"use client"

import type { Agent } from "@/types/agent"
import { AgentCard } from "./agent-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Brain, Code, Microscope, Users, Shield, TrendingUp, Bitcoin, Briefcase } from "lucide-react"
import { motion } from "framer-motion"
import { useMemo, useState } from "react"

interface AgentGridProps {
  agents: Agent[]
}

const categories = [
  { name: "All Agents", icon: Brain, key: "all" },
  { name: "Programmer", icon: Code, key: "programmer" },
  { name: "Researcher", icon: Microscope, key: "researcher" },
  { name: "Friend", icon: Users, key: "friend" },
  { name: "Security", icon: Shield, key: "security" },
  { name: "Degen Trader", icon: TrendingUp, key: "degenTrader" },
  { name: "Crypto", icon: Bitcoin, key: "crypto" },
  { name: "Personal Assistant", icon: Briefcase, key: "personalAssistant" },
]

export function AgentGrid({ agents }: AgentGridProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOption, setSortOption] = useState("all")
  const [selectedCategory, setSelectedCategory] = useState("all")

  // Filter agents based on category, search query and sort
  const filteredAgents = useMemo(() => {
    let result = [...agents]

    // Category filter
    if (selectedCategory !== "all") {
      result = result.filter(agent => agent.category === selectedCategory)
    }

    // Search filter
    if (searchQuery) {
      result = result.filter(agent =>
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Sort
    if (sortOption === "price-asc") {
      result = result.sort((a, b) => (a.price || 0) - (b.price || 0))
    } else if (sortOption === "price-desc") {
      result = result.sort((a, b) => (b.price || 0) - (a.price || 0))
    }

    return result
  }, [searchQuery, agents, sortOption, selectedCategory])


  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-8">
        {/* Search and Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Search agents..."
              className="w-full border-2 focus:border-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">

            {/* TEMP Disabled: Sort by market cap */}
            {/* <Select defaultValue="market-cap">
              <SelectTrigger className="w-full sm:w-[180px] border-2 bg-white">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-white border-2 border-gray-200">
                <SelectItem value="market-cap">Sort by Market Cap</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
              </SelectContent>
            </Select> */}

            {/* Sort by Price */}
            <Select value={sortOption} onValueChange={(value) => setSortOption(value)}>
              <SelectTrigger className="w-full sm:w-[180px] border-2 bg-white">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-white border-2 border-gray-200">
                <SelectItem value="all">Sort by Price</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>

          </div>
        </div>

       {/* Categories */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          {categories.map((category, index) => {
            const Icon = category.icon
            const isSelected = selectedCategory === category.key
            return (
              <motion.div
                key={category.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Button
                  onClick={() => setSelectedCategory(category.key)}
                  variant="outline"
                  className={`h-auto py-4 w-full flex flex-col gap-2 transition-colors ${
                    isSelected ? "bg-blue-100 border-blue-500" : "hover:bg-blue-50"
                  }`}
                >
                  <Icon className="h-6 w-6 text-blue-500" />
                  <span className="text-sm">{category.name}</span>
                </Button>
              </motion.div>
            )
          })}
        </div>

        {/* Featured Agents Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-6 text-blue-900">AI Agents</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAgents.length > 0 ? (
              filteredAgents.map((agent, index) => (
                <AgentCard key={agent.id} agent={agent} index={index} />
              ))
            ) : searchQuery.length > 0 && filteredAgents.length < 1 ? (
              <motion.p
                className="text-gray-500 col-span-full text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                No agents match your search.
              </motion.p>

            ) : (
              agents.map((agent, index) => (
                <AgentCard key={agent.agentId} agent={agent} index={index} />
              ))
            )}

          </div>
        </div>
      </motion.div>
    </div>
  )
}

