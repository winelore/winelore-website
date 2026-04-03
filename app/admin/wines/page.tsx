"use client"

import { useState } from "react"
import { Search, ArrowLeft, Wine } from "lucide-react"
import Link from "next/link"

import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

type WineData = {
  id: string
  name: string
  type: string
  year: number
  price: number
  stockStatus: "In Stock" | "Low Stock" | "Out of Stock"
}

const mockWines: WineData[] = [
  { id: "1", name: "Château Margaux", type: "Red", year: 2015, price: 850, stockStatus: "In Stock" },
  { id: "2", name: "Domaine de la Romanée-Conti", type: "Red", year: 2018, price: 4500, stockStatus: "Low Stock" },
  { id: "3", name: "Opus One", type: "Red", year: 2019, price: 350, stockStatus: "In Stock" },
  { id: "4", name: "Louis Roederer Cristal", type: "Sparkling", year: 2014, price: 290, stockStatus: "Out of Stock" },
  { id: "5", name: "Cloudy Bay Sauvignon Blanc", type: "White", year: 2022, price: 35, stockStatus: "In Stock" },
  { id: "6", name: "Whispering Angel Rosé", type: "Rosé", year: 2021, price: 25, stockStatus: "In Stock" },
  { id: "7", name: "Penfolds Grange", type: "Red", year: 2017, price: 750, stockStatus: "Low Stock" },
  { id: "8", name: "Dom Pérignon", type: "Sparkling", year: 2012, price: 210, stockStatus: "In Stock" },
  { id: "9", name: "Screaming Eagle Cabernet", type: "Red", year: 2016, price: 3000, stockStatus: "Out of Stock" },
  { id: "10", name: "Chablis Grand Cru Les Clos", type: "White", year: 2020, price: 120, stockStatus: "In Stock" },
]

export default function AdminWinesPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredWines = mockWines.filter((wine) =>
    wine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    wine.type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStockBadgeVariant = (status: string) => {
    switch (status) {
      case "In Stock":
        return "default"
      case "Low Stock":
        return "secondary"
      case "Out of Stock":
        return "destructive"
      default:
        return "outline"
    }
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-card-foreground tracking-tight">Admin Panel</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground font-medium text-sm">
          <Wine className="h-4 w-4" />
          <span>Wine Inventory</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Wines</h2>
              <p className="text-muted-foreground">Manage your complete wine catalogue.</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search wines by name or type..."
                className="pl-9 bg-card"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[300px]">Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="text-right">Stock Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No wines found matching "{searchQuery}".
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWines.map((wine) => (
                    <TableRow key={wine.id}>
                      <TableCell className="font-medium text-card-foreground">{wine.name}</TableCell>
                      <TableCell>{wine.type}</TableCell>
                      <TableCell>{wine.year}</TableCell>
                      <TableCell>${wine.price.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={getStockBadgeVariant(wine.stockStatus) as any} className="whitespace-nowrap">
                          {wine.stockStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  )
}
