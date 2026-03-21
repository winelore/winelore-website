import { ProfileMenu } from "@/app/components/profile-menu"
import { User, Newspaper, Trophy, Wine, Check } from "lucide-react"

function CompetitionCard() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 max-w-sm">
      <div className="flex items-start gap-3 mb-3">
        <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center">
          <User className="h-7 w-7 text-indigo-400" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Mega Competition 2026</h3>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-green-500">In Progress</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-500">3h 27m</span>
          </div>
        </div>
      </div>
      <p className="text-gray-600 text-sm mb-4">
        This is an example competition for WineLore mega system demonstrating all abilities.
      </p>
      <div className="flex items-center gap-2 text-sm">
        <User className="h-4 w-4 text-indigo-400" />
        <span className="font-medium text-gray-900">Mega Competition</span>
        <span className="text-gray-400">|</span>
        <span className="text-gray-500">by</span>
        <User className="h-4 w-4 text-indigo-400" />
        <span className="font-medium text-gray-900">likespro</span>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <h1 className="text-2xl font-bold text-gray-900">WineLore</h1>

          {/* Navigation */}
          <nav className="flex items-center bg-gray-50 rounded-full px-2 py-1">
            <button className="flex items-center gap-2 px-4 py-2 rounded-full text-gray-600 hover:bg-white transition-colors">
              <Newspaper className="h-4 w-4" />
              <span className="font-medium">Feed</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-green-600 shadow-sm">
              <Trophy className="h-4 w-4" />
              <span className="font-medium">Competitions</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-full text-gray-600 hover:bg-white transition-colors">
              <Wine className="h-4 w-4" />
              <span className="font-medium">Wines</span>
            </button>
          </nav>

          {/* Profile Menu */}
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">likespro</span>
            <div className="h-5 w-5 bg-blue-500 rounded-full flex items-center justify-center">
              <Check className="h-3 w-3 text-white" strokeWidth={3} />
            </div>
            <ProfileMenu />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CompetitionCard />
          <CompetitionCard />
          <CompetitionCard />
          <CompetitionCard />
        </div>
      </main>
    </div>
  )
}
