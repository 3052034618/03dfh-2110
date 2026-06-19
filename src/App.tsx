import { useState, useCallback } from 'react';
import './App.css';
import PlayerListPanel from './components/PlayerListPanel';
import CharacterPanel from './components/CharacterPanel';
import SeatingResultPanel from './components/SeatingResultPanel';
import HostSheetModal from './components/HostSheetModal';
import type { Player, Character, MatchResult, HostSheet } from './types';
import { generateAssignments, generateHostSheet } from './utils/matchingAlgorithm';
import { mockPlayers, mockCharacters } from './data/mockData';

type TabType = 'players' | 'characters' | 'result';

function App() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [assignments, setAssignments] = useState<{ playerId: string; characterId: string }[]>([]);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('players');
  const [showHostSheet, setShowHostSheet] = useState(false);
  const [hostSheet, setHostSheet] = useState<HostSheet | null>(null);

  const handleGenerate = useCallback(() => {
    if (players.length === 0 || characters.length === 0) {
      alert('请先添加玩家和角色');
      return;
    }
    const { assignments: newAssignments, results } = generateAssignments(
      players,
      characters
    );
    setAssignments(newAssignments);
    setMatchResults(results);
    setActiveTab('result');
  }, [players, characters]);

  const handleRegenerate = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  const handleAssignmentsChange = useCallback(
    (
      newAssignments: { playerId: string; characterId: string }[],
      newResults: MatchResult[]
    ) => {
      setAssignments(newAssignments);
      setMatchResults(newResults);
    },
    []
  );

  const handleGenerateHostSheet = useCallback(() => {
    const sheet = generateHostSheet(players, characters, assignments, matchResults);
    setHostSheet(sheet);
    setShowHostSheet(true);
  }, [players, characters, assignments, matchResults]);

  const handleLoadDemo = useCallback(() => {
    setPlayers([...mockPlayers]);
    setCharacters([...mockCharacters]);
    setAssignments([]);
    setMatchResults([]);
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎭</span>
              <div>
                <h1 className="text-xl font-bold text-gray-800">剧本杀排位助手</h1>
                <p className="text-xs text-gray-500">反串协调 · 智能匹配 · 一键排位</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleLoadDemo}
                className="text-sm px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                📂 加载示例数据
              </button>
              <button
                onClick={handleGenerate}
                disabled={players.length === 0 || characters.length === 0}
                className="text-sm px-6 py-2 text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md hover:shadow-lg"
              >
                ✨ 生成排位
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {[
              { key: 'players' as TabType, label: '👥 玩家名单', count: players.length },
              { key: 'characters' as TabType, label: '🎬 角色要求', count: characters.length },
              { key: 'result' as TabType, label: '📊 排位结果', count: assignments.length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-3 text-sm font-medium transition relative ${
                  activeTab === tab.key
                    ? 'text-indigo-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                      activeTab === tab.key
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4">
        <div className="h-[calc(100vh-140px)]">
          {activeTab === 'players' && (
            <PlayerListPanel players={players} onPlayersChange={setPlayers} />
          )}
          {activeTab === 'characters' && (
            <CharacterPanel
              characters={characters}
              onCharactersChange={setCharacters}
            />
          )}
          {activeTab === 'result' && (
            <SeatingResultPanel
              players={players}
              characters={characters}
              assignments={assignments}
              results={matchResults}
              onAssignmentsChange={handleAssignmentsChange}
              onGenerateHostSheet={handleGenerateHostSheet}
              onRegenerate={handleRegenerate}
            />
          )}
        </div>
      </main>

      <HostSheetModal
        isOpen={showHostSheet}
        onClose={() => setShowHostSheet(false)}
        hostSheet={hostSheet}
        players={players}
        characters={characters}
        assignments={assignments}
        results={matchResults}
      />
    </div>
  );
}

export default App;
