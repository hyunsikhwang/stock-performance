import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Treemap
} from 'recharts';
import { 
  TrendingUp, Settings, Calendar, Globe, Database, 
  ChevronRight, Save, Lock, LayoutDashboard, Eye, EyeOff, Loader2, Trophy,
  Plus, Trash2, Edit2, Check, X, Wallet
} from 'lucide-react';
import { format, subDays, startOfYear, isAfter, parseISO } from 'date-fns';
import { cn, formatPercent } from './lib/utils';

// --- Types ---
interface Target {
  code: string;
  name: string;
  quantity: number;
}

interface HistoryPoint {
  date: string;
  close: number;
}

interface SummaryItem {
  name: string;
  code: string;
  startPrice: number;
  currentPrice: number;
  returnPercent: number;
  dailyChangePercent: number;
  baseDate: string;
  quantity: number;
  weight: number;
}

// --- Helper for Category Rendering ---
const renderCategoryLabelText = (cat: string) => {
  if (cat === 'KR') return 'KR';
  if (cat === 'US') return 'US';
  return cat;
};

const renderCategoryLabelRich = (cat: string) => {
  if (cat === 'KR') {
    return (
      <span className="inline-flex items-center justify-center gap-1.5">
        <img 
          src="https://flagcdn.com/w40/kr.png" 
          alt="South Korea Flag" 
          className="w-4.5 h-3 object-cover rounded-sm shadow-sm border border-gray-200"
          referrerPolicy="no-referrer"
        />
        <span>KR</span>
      </span>
    );
  }
  if (cat === 'US') {
    return (
      <span className="inline-flex items-center justify-center gap-1.5">
        <img 
          src="https://flagcdn.com/w40/us.png" 
          alt="USA Flag" 
          className="w-4.5 h-3 object-cover rounded-sm shadow-sm border border-gray-200"
          referrerPolicy="no-referrer"
        />
        <span>US</span>
      </span>
    );
  }
  return <span>{cat}</span>;
};

// --- Components ---

const Header = ({ onManageClick }: { onManageClick: () => void }) => (
  <header className="mb-8 pb-8 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
    <div className="text-center sm:text-left">
      <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-2">Stock Performance</h1>
      <p className="text-xs text-gray-400 font-semibold tracking-wide font-mono uppercase bg-gray-50 border border-gray-100/80 px-2.5 py-1 rounded-md inline-block">
        Real-time stock performance metrics
      </p>
    </div>
    <button 
      onClick={onManageClick}
      className="flex items-center gap-2 px-5 py-2.5 bg-black hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-all shadow-md active:scale-95 duration-200 cursor-pointer"
    >
      <Settings className="w-4 h-4 text-gray-300" />
      <span>종목 등록 / 수정 / 삭제</span>
    </button>
  </header>
);

const AdminModal = ({ isOpen, onClose, categories }: { isOpen: boolean, onClose: () => void, categories: string[] }) => {
  const [password, setPassword] = useState('');
  const [category, setCategory] = useState(categories[0] || 'KR');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [items, setItems] = useState<Target[]>([]);
  const [isRawMode, setIsRawMode] = useState(false);
  const [rawContent, setRawContent] = useState('');

  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newQuantity, setNewQuantity] = useState('');

  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editQuantity, setEditQuantity] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      setEditingIdx(null);
      fetchCategoryData();
    }
  }, [isOpen, category]);

  const fetchCategoryData = async () => {
    try {
      const res = await fetch('/api/targets');
      const data = await res.json();
      const catData = data[category] || [];
      setItems(catData);
      const formatted = catData.map((d: any) => `${d.code}|${d.name}|${d.quantity}`).join('\n');
      setRawContent(formatted);
    } catch (e) {
      console.error(e);
      setError('종목을 불러오는 도중 오류가 발생했습니다.');
    }
  };

  const syncItemsToRaw = (currentItems: Target[]) => {
    const formatted = currentItems.map((d: any) => `${d.code}|${d.name}|${d.quantity}`).join('\n');
    setRawContent(formatted);
  };

  const syncRawToItems = () => {
    try {
      const parsed = rawContent.split('\n')
        .filter((line: string) => line.trim() && !line.startsWith('#'))
        .map((line: string) => {
          const [code, name, quantityStr] = line.split('|');
          return {
            code: code?.trim() || '',
            name: name?.trim() || '',
            quantity: parseInt(quantityStr || '0', 10)
          };
        });
      setItems(parsed);
      setError('');
    } catch (e) {
      setError('텍스트 구문을 나누는 도중 오류가 발생했습니다. 형식(code|name|quantity)을 맞춰주세요.');
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) {
      setError('종목 코드를 입력해주세요.');
      return;
    }
    if (!newName.trim()) {
      setError('종목 종목명을 입력해주세요.');
      return;
    }
    setError('');

    // Check duplicate
    const cleanCode = newCode.trim().toUpperCase();
    if (items.some(item => item.code.toUpperCase() === cleanCode)) {
      setError('이미 등록된 종목 코드입니다.');
      return;
    }

    const updated = [
      ...items,
      {
        code: cleanCode,
        name: newName.trim(),
        quantity: parseInt(newQuantity || '0', 10)
      }
    ];
    setItems(updated);
    syncItemsToRaw(updated);
    
    setNewCode('');
    setNewName('');
    setNewQuantity('');
  };

  const handleDelete = (indexToDelete: number) => {
    const updated = items.filter((_, idx) => idx !== indexToDelete);
    setItems(updated);
    syncItemsToRaw(updated);
    if (editingIdx === indexToDelete) {
      setEditingIdx(null);
    }
  };

  const startEdit = (index: number) => {
    const item = items[index];
    setEditingIdx(index);
    setEditCode(item.code);
    setEditName(item.name);
    setEditQuantity(String(item.quantity));
    setError('');
  };

  const saveRowEdit = (index: number) => {
    if (!editCode.trim() || !editName.trim()) {
      setError('코드와 종목명을 양식에 맞춰 올바르게 입력해주세요.');
      return;
    }
    setError('');
    const cleanCode = editCode.trim().toUpperCase();

    // Check duplicate
    if (items.some((item, idx) => idx !== index && item.code.toUpperCase() === cleanCode)) {
      setError('다른 종목에서 이미 사용 중인 종목 코드입니다.');
      return;
    }

    const updated = items.map((item, idx) => {
      if (idx === index) {
        return {
          code: cleanCode,
          name: editName.trim(),
          quantity: parseInt(editQuantity || '0', 10)
        };
      }
      return item;
    });
    setItems(updated);
    syncItemsToRaw(updated);
    setEditingIdx(null);
  };

  const cancelRowEdit = () => {
    setEditingIdx(null);
    setError('');
  };

  const handleSaveAll = async () => {
    setLoading(true);
    setError('');
    
    let contentToSubmit = rawContent;
    if (!isRawMode) {
      contentToSubmit = items.map(t => `${t.code}|${t.name}|${t.quantity}`).join('\n');
    }

    if (!password) {
      setError('저장하려면 관리자 비밀번호를 입력해야 합니다.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/targets/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, category, content: contentToSubmit })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '비밀번호 유효인증에 실패했거나 대상 수정에 실패했습니다.');
      }
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden my-8 border border-gray-100 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900">
              <Database className="w-5 h-5 text-gray-700" /> 종목 관리 설정
            </h2>
            <p className="text-xs text-gray-400 mt-1 font-medium">종목을 등록, 수정 또는 삭제하고 포트폴리오 비중을 업데이트합니다.</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 min-h-0">
          
          {/* Settings Bar: Password and Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100/80">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">관리자 비밀번호</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                  placeholder="비밀번호 입력 (저장 시 검증)"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">수정할 카테고리</label>
              <select 
                value={category} 
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
              >
                {categories.map(c => <option key={c} value={c}>{renderCategoryLabelText(c)} Stocks</option>)}
              </select>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-gray-100 pb-0.5">
            <button
              onClick={() => {
                syncRawToItems();
                setIsRawMode(false);
              }}
              className={cn(
                "pb-2 px-4 text-sm font-bold border-b-2 transition-all",
                !isRawMode 
                  ? "border-black text-black" 
                  : "border-transparent text-gray-400 hover:text-gray-600"
              )}
            >
              종목 편집기
            </button>
            <button
              onClick={() => {
                if (!isRawMode) {
                  const contentStr = items.map(t => `${t.code}|${t.name}|${t.quantity}`).join('\n');
                  setRawContent(contentStr);
                }
                setIsRawMode(true);
              }}
              className={cn(
                "pb-2 px-4 text-sm font-bold border-b-2 transition-all",
                isRawMode 
                  ? "border-black text-black" 
                  : "border-transparent text-gray-400 hover:text-gray-600"
              )}
            >
              텍스트 일괄 편집 (Bulk)
            </button>
          </div>

          {/* Main Work Area */}
          {!isRawMode ? (
            <div className="space-y-6">
              {/* Items List Table */}
              <div className="border border-gray-105 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50/75 text-xs text-gray-500 font-bold tracking-wider sticky top-0 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3">코드 (코드/티커)</th>
                      <th className="px-4 py-3">종목명 (이름)</th>
                      <th className="px-4 py-3">수량 / 비중값</th>
                      <th className="px-4 py-3 text-right">관리 작업</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-gray-400 text-xs font-semibold font-mono">
                          등록된 종목이 없습니다. 아래 폼에서 첫 종목을 추가해보세요.
                        </td>
                      </tr>
                    ) : (
                      items.map((item, idx) => {
                        const isEditing = editingIdx === idx;
                        return (
                          <tr key={`${item.code}-${idx}`} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-2.5 font-mono text-xs">
                              {isEditing ? (
                                <input 
                                  value={editCode}
                                  onChange={e => setEditCode(e.target.value)}
                                  className="border rounded px-2 py-1 max-w-[100px] text-xs font-mono"
                                  placeholder="예: AAPL"
                                />
                              ) : (
                                <span className="bg-gray-50 border border-gray-100 px-2 py-0.5 rounded text-gray-600 font-medium">
                                  {item.code}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 font-semibold text-gray-800">
                              {isEditing ? (
                                <input 
                                  value={editName}
                                  onChange={e => setEditName(e.target.value)}
                                  className="border rounded px-2 py-1 w-full text-xs"
                                  placeholder="예: 애플"
                                />
                              ) : (
                                item.name
                              )}
                            </td>
                            <td className="px-4 py-2.5">
                              {isEditing ? (
                                <input 
                                  type="number"
                                  value={editQuantity}
                                  onChange={e => setEditQuantity(e.target.value)}
                                  className="border rounded px-2 py-1 max-w-[70px] text-xs"
                                  placeholder="수량"
                                />
                              ) : (
                                <span className="font-semibold text-gray-900">{item.quantity} 주 / 개</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              {isEditing ? (
                                <div className="flex justify-end gap-1.5">
                                  <button 
                                    onClick={() => saveRowEdit(idx)}
                                    className="p-1 hover:bg-green-50 rounded text-green-600 hover:text-green-700 hover:border-green-100 border border-transparent transition-colors cursor-pointer"
                                    title="저장"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={cancelRowEdit}
                                    className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                                    title="취소"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex justify-end gap-1.5">
                                  <button 
                                    onClick={() => startEdit(idx)}
                                    className="p-1 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
                                    title="수정"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDelete(idx)}
                                    className="p-1 hover:bg-red-50 rounded text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                                    title="삭제"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Inline Add Ticker Form */}
              <form onSubmit={handleAdd} className="bg-gray-50/50 p-4 rounded-2xl border border-gray-150 space-y-3">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <Plus className="w-3.5 h-3.5 text-black" /> 새 종목 신규 등록
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input 
                    value={newCode}
                    onChange={e => setNewCode(e.target.value)}
                    placeholder="종목코드 (예: AAPL, 005930)"
                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  />
                  <input 
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="종목명 (예: 애플, 삼성전자)"
                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  />
                  <div className="flex gap-2">
                    <input 
                      type="number"
                      value={newQuantity}
                      onChange={e => setNewQuantity(e.target.value)}
                      placeholder="수량 (예: 10)"
                      className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all flex-1"
                    />
                    <button 
                      type="submit"
                      className="bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-bold px-4 hover:shadow-md transition-all whitespace-nowrap inline-flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>추가</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 font-mono">
                파일 원본 텍스트 직접 편집 (형식: 코드|종목명|수량)
              </label>
              <textarea 
                value={rawContent} 
                onChange={e => setRawContent(e.target.value)}
                className="w-full border border-gray-200 rounded-2xl p-4 h-64 font-mono text-xs focus:ring-2 focus:ring-black focus:border-transparent outline-none leading-relaxed transition-all"
                placeholder="예시:&#10;AAPL|Apple Inc.|10&#10;005930|삼성전자|25"
              />
            </div>
          )}

          {/* Feedback & Instructions */}
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-semibold flex items-center gap-2">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
          <div className="text-[10px] text-gray-400 font-medium">
            * 변경사항은 우측 '전체 저장하기' 버튼을 누르기 전까지 반영되지 않습니다.
          </div>
          <div className="flex gap-2">
            <button 
              onClick={onClose} 
              className="px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 rounded-xl text-sm font-semibold transition-all hover:shadow-sm cursor-pointer"
            >
              취소
            </button>
            <button 
              onClick={handleSaveAll} 
              disabled={loading}
              className="px-6 py-2 bg-black text-white hover:bg-gray-800 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-2 transition-all shadow-md active:scale-95 duration-200 cursor-pointer"
            >
              {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
              전체 저장하기
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

// --- Helper for performance-based coloring ---
const getPerformanceColors = (changeValue: number, isUS: boolean) => {
  const isPositive = changeValue >= 0;
  if (isUS) {
    if (isPositive) {
      return {
        text: 'text-emerald-600',
        bg: 'bg-emerald-50/40',
        border: 'border-emerald-200/60',
        hoverBorder: 'hover:border-emerald-400',
        accent: '#10b981'
      };
    } else {
      return {
        text: 'text-rose-600',
        bg: 'bg-rose-50/40',
        border: 'border-rose-200/60',
        hoverBorder: 'hover:border-rose-400',
        accent: '#f43f5e'
      };
    }
  } else {
    if (isPositive) {
      return {
        text: 'text-red-600',
        bg: 'bg-red-50/40',
        border: 'border-red-200/60',
        hoverBorder: 'hover:border-red-400',
        accent: '#ef4444'
      };
    } else {
      return {
        text: 'text-blue-600',
        bg: 'bg-blue-50/40',
        border: 'border-blue-200/60',
        hoverBorder: 'hover:border-blue-400',
        accent: '#3b82f6'
      };
    }
  }
};

const formatMonth = (monthStr: string) => {
  const [, month] = monthStr.split('-');
  return `${parseInt(month, 10)}월`;
};

export default function App() {
  const [categories, setCategories] = useState<Record<string, Target[]>>({});
  const [activeTab, setActiveTab] = useState<string>('');
  const [startDate, setStartDate] = useState(format(startOfYear(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [history, setHistory] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [hoveredStock, setHoveredStock] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'return' | 'dailyChange'>('dailyChange');

  const formatPrice = (price: number, code?: string) => {
    if (activeTab === 'US') {
      return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price);
    }
    if (activeTab === 'KR' || activeTab === 'ETF') {
      return new Intl.NumberFormat('ko-KR').format(Math.round(price));
    }
    // Fallback if activeTab is not set
    const isKoreanCode = code && (/^[0-9]+$/.test(code) || code.endsWith('.KS') || code.endsWith('.KQ'));
    if (!isKoreanCode && code) {
      return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price);
    }
    return new Intl.NumberFormat('ko-KR').format(Math.round(price));
  };

  useEffect(() => {
    fetchTargets();
  }, []);

  const fetchTargets = async () => {
    try {
      const res = await fetch('/api/targets');
      const data = await res.json();
      setCategories(data);
      const firstTab = Object.keys(data)[0];
      if (firstTab && !activeTab) setActiveTab(firstTab);
    } catch (e) {
      console.error(e);
    } finally {
      // Don't set loading false yet, wait for history
    }
  };

  useEffect(() => {
    if (activeTab && categories[activeTab]) {
      fetchHistory();
    }
  }, [activeTab, startDate, endDate, categories]);

  const fetchHistory = async () => {
    const targets = categories[activeTab];
    if (!targets) return;
    
    setLoading(true);
    const symbols = targets.map(t => t.code).join(',');
    try {
      const res = await fetch(`/api/history?symbols=${symbols}&start=${startDate}&end=${endDate}`);
      const data = await res.json();
      setHistory(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    const targets = categories[activeTab] || [];
    const results: SummaryItem[] = [];
    let grandTotalMarketValue = 0;

    const dataPoints: { name: string; mktVal: number; item: any }[] = [];

    targets.forEach(t => {
      const rawSym = t.code;
      const data = history[rawSym];
      if (!data || !data.history || data.history.length === 0) return;

      const firstPoint = data.history[0];
      const startPrice = firstPoint.close;
      const currentPrice = data.price; // Use the more accurate price from quote
      const returnPercent = ((currentPrice - startPrice) / startPrice) * 100;
      const dailyChangePercent = data.dailyChangePercent || 0;

      const mktVal = currentPrice * (t.quantity || 0);
      dataPoints.push({
        name: t.name,
        mktVal,
        item: {
          name: t.name,
          code: t.code,
          startPrice,
          currentPrice,
          returnPercent,
          dailyChangePercent,
          baseDate: format(new Date(firstPoint.date), 'yyyy-MM-dd'),
          quantity: t.quantity,
        }
      });
      grandTotalMarketValue += mktVal;
    });

    dataPoints.forEach(dp => {
      results.push({
        ...dp.item,
        weight: grandTotalMarketValue > 0 ? (dp.mktVal / grandTotalMarketValue) * 100 : 0
      });
    });

    if (sortBy === 'dailyChange') {
      return results.sort((a, b) => b.dailyChangePercent - a.dailyChangePercent);
    }
    return results.sort((a, b) => b.returnPercent - a.returnPercent);
  }, [history, categories, activeTab, sortBy]);

  const portfolioStats = useMemo(() => {
    let totalMarketValue = 0;
    let weightedDailyReturn = 0;
    let weightedCumulativeReturn = 0;
    
    summary.forEach(item => {
      const mktVal = item.currentPrice * (item.quantity || 0);
      totalMarketValue += mktVal;
    });
    
    summary.forEach(item => {
      const itemMktVal = item.currentPrice * (item.quantity || 0);
      const weightFraction = totalMarketValue > 0 ? (itemMktVal / totalMarketValue) : 0;
      weightedDailyReturn += weightFraction * item.dailyChangePercent;
      weightedCumulativeReturn += weightFraction * item.returnPercent;
    });
    
    return {
      totalMarketValue,
      weightedDailyReturn,
      weightedCumulativeReturn
    };
  }, [summary]);

  const monthlyReturns = useMemo(() => {
    const monthsSet = new Set<string>();
    Object.values(history).forEach((item: any) => {
      const data = item.history;
      if (Array.isArray(data)) {
        data.forEach((p: any) => {
          if (p && p.date) {
            const dateObj = new Date(p.date);
            const monthStr = format(dateObj, 'yyyy-MM');
            monthsSet.add(monthStr);
          }
        });
      }
    });

    const sortedMonths = Array.from(monthsSet).sort();

    let totalMarketValue = 0;
    summary.forEach(item => {
      const mktVal = item.currentPrice * (item.quantity || 0);
      totalMarketValue += mktVal;
    });

    const results = sortedMonths.map(month => {
      let weightedReturn = 0;
      let totalWeightUsed = 0;

      summary.forEach(item => {
        const symbol = item.code;
        const assetData = history[symbol];
        if (!assetData || !assetData.history || assetData.history.length === 0) return;

        const monthPoints = assetData.history.filter((p: any) => {
          if (!p || !p.date) return false;
          return format(new Date(p.date), 'yyyy-MM') === month;
        });

        if (monthPoints.length === 0) return;

        monthPoints.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const firstPoint = monthPoints[0];
        const lastPoint = monthPoints[monthPoints.length - 1];

        const assetMonthlyReturn = firstPoint.close > 0 
          ? ((lastPoint.close - firstPoint.close) / firstPoint.close) * 100 
          : 0;

        const itemMktVal = item.currentPrice * (item.quantity || 0);
        const weightFraction = totalMarketValue > 0 ? (itemMktVal / totalMarketValue) : 0;

        weightedReturn += weightFraction * assetMonthlyReturn;
        totalWeightUsed += weightFraction;
      });

      const finalMonthlyReturn = totalWeightUsed > 0 ? (weightedReturn / totalWeightUsed) : 0;

      return {
        month,
        returnPercent: finalMonthlyReturn
      };
    });

    return results;
  }, [history, summary]);

  const chartData = useMemo(() => {
    const allDates = new Set<string>();
    Object.values(history).forEach((item: any) => {
      const data = item.history;
      if (Array.isArray(data)) {
        data.forEach((p: any) => {
          if (p && p.date) {
            allDates.add(format(new Date(p.date), 'yyyy-MM-dd'));
          }
        });
      }
    });

    const sortedDates = Array.from(allDates).sort();
    
    // Carry forward dictionary for filled-forward normalized indexes (LOCF)
    const lastKnownIndex: Record<string, number> = {};
    
    return sortedDates.map(date => {
      const row: any = { date };
      Object.entries(history).forEach(([sym, item]: [string, any]) => {
        const target = (categories[activeTab] || []).find(t => t.code === sym);
        if (!target || visibility[target.name] === false) return;

        const data = item.history;
        if (!Array.isArray(data) || data.length === 0) return;

        const point = data.find((p: any) => format(new Date(p.date), 'yyyy-MM-dd') === date);
        if (point) {
          // Base 100 calculation
          const firstPrice = data[0].close;
          if (firstPrice && firstPrice > 0) {
            const indexValue = (point.close / firstPrice) * 100;
            row[target.name] = indexValue;
            lastKnownIndex[target.name] = indexValue;
          }
        } else {
          // Carry forward the last observation
          if (lastKnownIndex[target.name] !== undefined) {
            row[target.name] = lastKnownIndex[target.name];
          }
        }
      });
      return row;
    });
  }, [history, activeTab, categories, visibility]);

  const treemapData = useMemo(() => {
    return summary
      .filter(s => s.weight > 0.05 && visibility[s.name] !== false)
      .sort((a, b) => b.weight - a.weight) // Strict descending order by weight
      .map(s => ({
        name: s.name,
        value: s.weight,
        dailyChangePercent: s.dailyChangePercent,
        displayLabel: `${s.name}\n${s.weight.toFixed(1)}%`
      }));
  }, [summary, visibility]);

  const monthlyRankings = useMemo(() => {
    if (!history || Object.keys(history).length === 0) return [];

    const monthsMap: Record<string, Record<string, number>> = {};
    const symToName: Record<string, string> = {};
    const targets = categories[activeTab] || [];
    targets.forEach(t => symToName[t.code] = t.name);

    Object.entries(history).forEach(([sym, data]: [string, any]) => {
      const name = symToName[sym];
      if (!name || !data.history) return;

      data.history.forEach((d: any) => {
        const monthKey = d.date.substring(0, 7); // yyyy-MM
        if (!monthsMap[monthKey]) monthsMap[monthKey] = {};
        monthsMap[monthKey][name] = d.close;
      });
    });

    const sortedMonthKeys = Object.keys(monthsMap).sort();
    if (sortedMonthKeys.length === 0) return [];

    return sortedMonthKeys.map((m, idx) => {
      const returns = targets.map(t => {
        const name = t.name;
        const currentPrice = monthsMap[m][name];
        let prevPrice = idx > 0 ? monthsMap[sortedMonthKeys[idx - 1]][name] : undefined;

        if (prevPrice === undefined && history[t.code]?.history?.length > 0) {
           prevPrice = history[t.code].history[0].close;
        }

        const ret = currentPrice && prevPrice ? (currentPrice / prevPrice) - 1 : 0;
        return { name, return: ret, code: t.code };
      }).sort((a, b) => b.return - a.return);

      return {
        month: m,
        label: format(parseISO(m + '-01'), 'MMM yyyy'),
        ranks: returns
      };
    });
  }, [history, categories, activeTab]);

  const toggleVisibility = (name: string) => {
    setVisibility(prev => ({ ...prev, [name]: prev[name] === false }));
  };

  if (!activeTab && loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin w-8 h-8 text-black" /></div>;
  }

  const COLORS = [
    '#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea', 
    '#0891b2', '#ea580c', '#be123c', '#1d4ed8', '#059669'
  ];

  const getColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return COLORS[Math.abs(hash) % COLORS.length];
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-blue-100">
      <div className="max-w-7xl mx-auto px-4 py-12 md:px-8">
        <Header onManageClick={() => setIsAdminOpen(true)} />

        {/* Portfolio Overview Cards */}
        <div className="flex flex-col gap-3 mb-8 max-w-4xl">
          {/* Main Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
            {/* Today's Return Card */}
            <div className={cn(
              "relative rounded-xl border py-2.5 px-3.5 shadow-sm overflow-hidden flex flex-col justify-center transition-all duration-300",
              getPerformanceColors(portfolioStats.weightedDailyReturn, activeTab === 'US').bg,
              getPerformanceColors(portfolioStats.weightedDailyReturn, activeTab === 'US').border
            )}>
              <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: getPerformanceColors(portfolioStats.weightedDailyReturn, activeTab === 'US').accent }} />
              <div className="pl-1">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">실시간 오늘 하루 수익률</span>
                  <TrendingUp className={cn("w-3 h-3", getPerformanceColors(portfolioStats.weightedDailyReturn, activeTab === 'US').text)} />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <div className={cn(
                    "text-lg font-black tracking-tight font-mono",
                    getPerformanceColors(portfolioStats.weightedDailyReturn, activeTab === 'US').text
                  )}>
                    {portfolioStats.weightedDailyReturn >= 0 ? '+' : '-'}{Math.abs(portfolioStats.weightedDailyReturn).toFixed(2)}%
                  </div>
                  <span className="text-[8.5px] text-gray-400 font-medium">당일 가중평균</span>
                </div>
              </div>
            </div>

            {/* Cumulative Return Card */}
            <div className={cn(
              "relative rounded-xl border py-2.5 px-3.5 shadow-sm overflow-hidden flex flex-col justify-center transition-all duration-300",
              getPerformanceColors(portfolioStats.weightedCumulativeReturn, activeTab === 'US').bg,
              getPerformanceColors(portfolioStats.weightedCumulativeReturn, activeTab === 'US').border
            )}>
              <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: getPerformanceColors(portfolioStats.weightedCumulativeReturn, activeTab === 'US').accent }} />
              <div className="pl-1">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">분석 기간 가중 수익률</span>
                  <Trophy className={cn("w-3 h-3", getPerformanceColors(portfolioStats.weightedCumulativeReturn, activeTab === 'US').text)} />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <div className={cn(
                    "text-lg font-black tracking-tight font-mono",
                    getPerformanceColors(portfolioStats.weightedCumulativeReturn, activeTab === 'US').text
                  )}>
                    {portfolioStats.weightedCumulativeReturn >= 0 ? '+' : '-'}{Math.abs(portfolioStats.weightedCumulativeReturn).toFixed(2)}%
                  </div>
                  <span className="text-[8.5px] text-gray-400 font-medium">시작일({startDate}) 대비</span>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Return Card (Full width row, compact layout, wraps cleanly without scrollbars) */}
          <div className="relative rounded-xl border border-gray-150 p-2.5 shadow-sm bg-gray-50/50 max-w-4xl overflow-hidden flex flex-col justify-between transition-all duration-300">
            <div className="absolute top-0 left-0 w-1 h-full bg-gray-400/80" />
            <div className="pl-1 w-full">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-gray-400" />
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">분석 기간 월별 수익률</span>
                </div>
                <span className="text-[8.5px] text-gray-400">보유 비중 반영 가중평균 월별 변동률</span>
              </div>
              <div className="flex flex-wrap gap-1.5 w-full">
                {monthlyReturns.length === 0 ? (
                  <span className="text-[10px] text-gray-400">데이터 없음</span>
                ) : (
                  monthlyReturns.map(item => {
                    const isPositive = item.returnPercent >= 0;
                    const monthColors = activeTab === 'US'
                      ? (isPositive ? 'text-emerald-600 bg-emerald-50/40 border-emerald-100/60' : 'text-rose-600 bg-rose-50/40 border-rose-100/60')
                      : (isPositive ? 'text-red-600 bg-red-50/40 border-red-100/60' : 'text-blue-600 bg-blue-50/40 border-blue-100/60');
                    return (
                      <div 
                        key={item.month} 
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-center font-medium",
                          monthColors
                        )}
                      >
                        <span className="text-[8.5px] font-bold opacity-80 leading-none">{formatMonth(item.month)}</span>
                        <span className="text-[9.5px] font-extrabold font-mono leading-none">
                          {isPositive ? '+' : ''}{item.returnPercent.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 items-end">
          <div className="md:col-span-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Analysis Category</label>
            <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100 h-12">
              {Object.keys(categories).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className={cn(
                    "flex-1 rounded-lg text-sm font-semibold transition-all duration-200",
                    activeTab === cat ? "bg-white shadow-sm text-black ring-1 ring-black/5" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  {renderCategoryLabelRich(cat)}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Start Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-gray-50 border-gray-100 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none h-12"
                />
              </div>
            </div>
            <div className="relative">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">End Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full bg-gray-50 border-gray-100 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none h-12"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sort Controls & Metric Grid Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">종목별 실시간 성과</h2>
            <p className="text-xs text-gray-400 font-medium">카드를 클릭하면 차트에서 표시 여부를 전환할 수 있습니다.</p>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200/60 shadow-inner">
            <button
              onClick={() => setSortBy('return')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer duration-200",
                sortBy === 'return' 
                  ? "bg-white shadow-md text-black ring-1 ring-black/5" 
                  : "text-gray-500 hover:text-gray-800"
              )}
            >
              분석 기간 수익률 순
            </button>
            <button
              onClick={() => setSortBy('dailyChange')}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer duration-200",
                sortBy === 'dailyChange' 
                  ? "bg-white shadow-md text-black ring-1 ring-black/5" 
                  : "text-gray-500 hover:text-gray-800"
              )}
            >
              실시간 당일 변동률 순
            </button>
          </div>
        </div>

        {/* Metric Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 mb-16">
          {(() => {
            const maxWeight = Math.max(...summary.map(s => s.weight), 1);
            return summary.map((item, idx) => {
              const isHidden = visibility[item.name] === false;
              const isUS = activeTab === 'US';
              const valueToShow = sortBy === 'dailyChange' ? item.dailyChangePercent : item.returnPercent;
              const perfColors = getPerformanceColors(valueToShow, isUS);

              return (
                <button 
                  key={`${item.code}-${item.name}`}
                  onClick={() => toggleVisibility(item.name)}
                  className={cn(
                    "group relative p-2 rounded-xl border transition-all duration-300 text-left overflow-hidden h-[88px] flex flex-col justify-between shadow-sm",
                    isHidden 
                      ? "bg-gray-50 border-gray-100 opacity-40 grayscale" 
                      : `${perfColors.bg} ${perfColors.border} ${perfColors.hoverBorder} hover:shadow-md hover:scale-[1.02] active:scale-95`
                  )}
                >
                  {!isHidden && <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: perfColors.accent }} />}
                  <div className="overflow-hidden w-full pl-1 flex flex-col h-full justify-between">
                    <div className="flex justify-between items-start gap-1">
                      <h3 className="text-[10px] uppercase text-gray-500 tracking-wider font-bold truncate pr-1">{item.name}</h3>
                      {!isHidden ? <Eye className="w-2.5 h-2.5 text-gray-400 opacity-60 flex-shrink-0" /> : <EyeOff className="w-2.5 h-2.5 text-gray-400 opacity-60 flex-shrink-0" />}
                    </div>
                    <div className="text-xs sm:text-sm font-black tracking-tight leading-none my-0.5 truncate text-gray-900">
                      {formatPrice(item.currentPrice, item.code)}
                    </div>
                    <div className="flex justify-between items-center w-full gap-1">
                      <div className={cn(
                        "text-[10px] font-black font-mono flex items-center gap-0.5 flex-shrink-0",
                        perfColors.text
                      )}>
                        <span>{valueToShow >= 0 ? '▲' : '▼'}</span>
                        <span>{Math.abs(valueToShow).toFixed(2)}%</span>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 min-w-0 max-w-[50%]">
                        <div className="flex items-center gap-0.5">
                          <span className="text-[8px] font-medium text-gray-400">비중</span>
                          <span className="text-[9.5px] font-extrabold text-gray-700 font-mono">{item.weight.toFixed(1)}%</span>
                        </div>
                        <div className="w-12 h-1 bg-gray-200/60 rounded-full overflow-hidden relative">
                          <div 
                            className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${(item.weight / maxWeight) * 100}%`,
                              backgroundColor: isHidden ? '#cbd5e1' : perfColors.accent
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })
          })()}
        </div>

        {/* Charts Section */}
        {summary.length > 0 && (
          <div className="space-y-16">
            <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-gray-400" /> Performance Trend
                </h2>
                <div className="text-xs font-medium text-gray-400">Daily Close (Base 100 Normalized)</div>
              </div>
              <div className="h-[500px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fill: '#9ca3af'}} 
                      minTickGap={30}
                    />
                    <YAxis 
                      domain={['auto', 'auto']} 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fill: '#9ca3af'}}
                      label={{ value: 'Index (Base 100)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#9ca3af' }}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                      itemStyle={{ fontWeight: '600' }}
                      // Ensure quantity/value not in tooltip, only normalized index
                      formatter={(val: number, name: string) => [`${val.toFixed(2)}`, name]}
                      itemSorter={(item: any) => -item.value}
                    />
                    <Legend 
                      iconType="diamond"
                      wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: '500' }}
                    />
                    {summary.map((s, idx) => (
                      visibility[s.name] !== false && (
                        <Line 
                          key={s.name} 
                          type="monotone" 
                          dataKey={s.name} 
                          stroke={getColor(s.name)} 
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 0 }}
                          animationDuration={1500}
                          connectNulls={true}
                        />
                      )
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {monthlyRankings.length > 0 && (
              <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" /> Monthly Return Ranking
                  </h2>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">
                    상승/하락 그룹별 성과 분석
                  </div>
                </div>
                <div className="overflow-x-auto -mx-8 px-8 pb-4">
                  <div className="flex gap-6 min-w-max pb-2">
                    {monthlyRankings.map(m => {
                      const rising = m.ranks.filter(r => r.return >= 0);
                      const falling = m.ranks.filter(r => r.return < 0);

                      return (
                        <div 
                          key={m.month} 
                          className="w-[200px] min-w-[200px] flex-shrink-0 bg-gray-50/40 border border-gray-100 p-4 rounded-2xl flex flex-col gap-4 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]"
                        >
                          {/* Month Header */}
                          <div className="border-b border-gray-100/80 pb-2 text-center">
                            <div className="text-[14px] font-extrabold text-gray-800 tracking-tight">{m.label}</div>
                            <div className="flex justify-center gap-2 mt-1.5 font-mono text-[10px] font-bold">
                              <span className="text-red-500 bg-red-50/80 px-2 py-0.5 rounded-full border border-red-100/50">
                                ▲ {rising.length}
                              </span>
                              <span className="text-blue-500 bg-blue-50/80 px-2 py-0.5 rounded-full border border-blue-100/50">
                                ▼ {falling.length}
                              </span>
                            </div>
                          </div>

                          {/* Groups */}
                          <div className="flex-1 flex flex-col gap-4">
                            {/* Rising Group Box */}
                            <div className={cn(
                              "border border-red-200 bg-red-50/10 rounded-2xl p-2.5 flex flex-col gap-2 shrink-0",
                              rising.length === 0 && "opacity-50 grayscale border-dashed border-red-150"
                            )}>
                              <div className="text-[10px] font-bold text-red-600 px-1 tracking-wider uppercase flex justify-between items-center font-sans">
                                <span>상승 종목</span>
                                <span className="bg-red-100/80 text-red-700 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold font-mono">{rising.length}</span>
                              </div>
                              <div className="flex flex-col gap-1.5">
                                {rising.length === 0 ? (
                                  <div className="text-[10px] text-gray-400/80 text-center py-3 font-semibold">상승 종목 없음</div>
                                ) : (
                                  rising.map(item => {
                                    const itemColor = getColor(item.name);
                                    const isHovered = hoveredStock === item.name;
                                    const isDimmed = hoveredStock !== null && !isHovered;

                                    return (
                                      <div 
                                        key={item.name}
                                        className={cn(
                                          "relative flex flex-col p-2 rounded-xl border transition-all duration-200 cursor-pointer",
                                          isHovered 
                                            ? "scale-[1.03] shadow-md z-20" 
                                            : "border-transparent",
                                          isDimmed ? "opacity-30 scale-95 grayscale-[0.3]" : "opacity-100"
                                        )}
                                        style={{ 
                                          backgroundColor: isHovered ? `${itemColor}20` : `${itemColor}08`,
                                          borderColor: isHovered ? itemColor : 'transparent'
                                        }}
                                        onMouseEnter={() => setHoveredStock(item.name)}
                                        onMouseLeave={() => setHoveredStock(null)}
                                      >
                                        <div 
                                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-sm"
                                          style={{ backgroundColor: itemColor }}
                                        />
                                        <div className="pl-1.5">
                                          <div className="text-[11px] text-gray-900 font-bold truncate tracking-tight leading-tight">{item.name}</div>
                                          <div className="text-[9px] mt-0.5 leading-none font-bold text-red-500 font-mono">
                                            ▲ {(item.return * 100).toFixed(1)}%
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>

                            {/* Falling Group Box */}
                            <div className={cn(
                              "border border-blue-200 bg-blue-50/10 rounded-2xl p-2.5 flex flex-col gap-2 shrink-0",
                              falling.length === 0 && "opacity-50 grayscale border-dashed border-blue-150"
                            )}>
                              <div className="text-[10px] font-bold text-blue-600 px-1 tracking-wider uppercase flex justify-between items-center font-sans">
                                <span>하락 종목</span>
                                <span className="bg-blue-100/80 text-blue-700 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold font-mono">{falling.length}</span>
                              </div>
                              <div className="flex flex-col gap-1.5">
                                {falling.length === 0 ? (
                                  <div className="text-[10px] text-gray-400/80 text-center py-3 font-semibold">하락 종목 없음</div>
                                ) : (
                                  falling.map(item => {
                                    const itemColor = getColor(item.name);
                                    const isHovered = hoveredStock === item.name;
                                    const isDimmed = hoveredStock !== null && !isHovered;

                                    return (
                                      <div 
                                        key={item.name}
                                        className={cn(
                                          "relative flex flex-col p-2 rounded-xl border transition-all duration-200 cursor-pointer",
                                          isHovered 
                                            ? "scale-[1.03] shadow-md z-20" 
                                            : "border-transparent",
                                          isDimmed ? "opacity-30 scale-95 grayscale-[0.3]" : "opacity-100"
                                        )}
                                        style={{ 
                                          backgroundColor: isHovered ? `${itemColor}20` : `${itemColor}08`,
                                          borderColor: isHovered ? itemColor : 'transparent'
                                        }}
                                        onMouseEnter={() => setHoveredStock(item.name)}
                                        onMouseLeave={() => setHoveredStock(null)}
                                      >
                                        <div 
                                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-sm"
                                          style={{ backgroundColor: itemColor }}
                                        />
                                        <div className="pl-1.5">
                                          <div className="text-[11px] text-gray-900 font-bold truncate tracking-tight leading-tight">{item.name}</div>
                                          <div className="text-[9px] mt-0.5 leading-none font-bold text-blue-500 font-mono">
                                            ▼ {(item.return * 100).toFixed(1)}%
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <LayoutDashboard className="w-5 h-5 text-gray-400" /> Portfolio Weights
                  </h2>
                  <div className="text-xs font-medium text-gray-400">Relative Concentration by Market Value</div>
                </div>
                <div className="h-[500px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                      data={treemapData}
                      dataKey="value"
                      stroke="#fff"
                      fill="#000"
                      aspectRatio={4 / 3}
                      isAnimationActive={false}
                      content={<CustomTreemapContent activeTab={activeTab} />}
                    >
                        <Tooltip 
                          formatter={(val: number, name: string) => [`${val.toFixed(2)}%`, name]}
                        />
                    </Treemap>
                  </ResponsiveContainer>
                </div>
            </div>

            {summary.length > 0 && (
              <div className="mt-12 bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                <details className="group">
                  <summary className="text-sm font-bold text-gray-500 cursor-pointer list-none flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
                    View Raw Data Details
                  </summary>
                  <div className="mt-8 overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-gray-100 pb-4">
                          <th className="py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Asset Name</th>
                          <th className="py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Code</th>
                          <th className="py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Start Price</th>
                          <th className="py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Current Price</th>
                          <th className="py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Return</th>
                          <th className="py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Base Date</th>
                          <th className="py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Weight</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {summary.map(s => (
                          <tr key={`${s.code}-${s.name}`} className="hover:bg-gray-50 transition-colors">
                            <td className="py-4 font-semibold">{s.name}</td>
                            <td className="py-4 text-gray-400 font-mono text-xs">{s.code}</td>
                            <td className="py-4 font-medium">{formatPrice(s.startPrice, s.code)}</td>
                            <td className="py-4 font-medium">{formatPrice(s.currentPrice, s.code)}</td>
                            <td className={cn("py-4 font-bold", s.returnPercent >= 0 ? "text-red-500" : "text-blue-500")}>
                              {formatPercent(s.returnPercent)}
                            </td>
                            <td className="py-4 text-gray-400 text-xs">{s.baseDate}</td>
                            <td className="py-4 font-bold text-gray-900">{s.weight.toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </div>
            )}
          </div>
        )}

        <footer className="mt-24 pt-8 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400 font-medium">
          <div className="flex items-center gap-4">
            <span>Source: Yahoo Finance | Enterprise Edition Data Engine</span>
             <button 
              onClick={() => setIsAdminOpen(true)}
              className="p-1.5 bg-gray-50 rounded hover:bg-gray-100 transition-colors border border-gray-100"
            >
              <Settings className="w-3 h-3 text-gray-400" />
            </button>
          </div>
           <div className="flex gap-4">
              <span>GDPR Compliant</span>
              <span>•</span>
              <span>Encrypted Configuration</span>
           </div>
        </footer>

        <AdminModal 
          isOpen={isAdminOpen} 
          onClose={() => {
            setIsAdminOpen(false);
            fetchTargets();
          }} 
          categories={Object.keys(categories)}
        />
      </div>
    </div>
  );
}

const CustomTreemapContent = (props: any) => {
  const { x, y, width, height, name, value, dailyChangePercent, activeTab } = props;

  if (width < 30 || height < 30) return null;

  const isUS = activeTab === 'US';
  const changeValue = dailyChangePercent || 0;
  
  let fillCol = '#64748b'; // Slate fallback
  if (changeValue > 0) {
    fillCol = isUS ? '#10b981' : '#ef4444'; // Emerald for US, Crimson for KR
  } else if (changeValue < 0) {
    fillCol = isUS ? '#ef4444' : '#2563eb'; // Crimson for US, Royal Blue for KR
  }

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: fillCol,
          stroke: '#fff',
          strokeWidth: 2,
        }}
      />
      {width > 50 && height > 35 && (
        <foreignObject x={x + 4} y={y + 4} width={width - 8} height={height - 8}>
           <div className="h-full flex flex-col items-center justify-center text-center text-white overflow-hidden pointer-events-none select-none">
              <div className="text-[13px] sm:text-[15px] font-black truncate w-full px-1 leading-tight drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.5)]">
                {name}
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold opacity-90 leading-none mt-1.5 bg-black/25 px-2 py-0.5 rounded-full inline-block">
                {value.toFixed(1)}%
              </div>
              <div className="text-[10px] font-black font-mono leading-none mt-1.5 opacity-95">
                {changeValue >= 0 ? '▲' : '▼'} {Math.abs(changeValue).toFixed(2)}%
              </div>
           </div>
        </foreignObject>
      )}
    </g>
  );
};
