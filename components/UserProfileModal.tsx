import React, { useEffect, useState } from 'react';
import { X, Trophy, Gamepad2, Star, Clock, Edit2, Save, Briefcase } from 'lucide-react';
import { User } from '../types';
import { api } from '../lib/api';
import { PAU_DEPARTMENTS } from '../constants';

interface UserInventoryItem {
  id: number;
  user_id: number;
  item_id: number;
  item_title: string;
  code: string;
  is_used: boolean;
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  isEditable?: boolean;
  onSaveProfile?: (department: string) => Promise<void> | void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  isEditable = false,
  onSaveProfile,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [department, setDepartment] = useState(user?.department || '');
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState<UserInventoryItem[]>([]);

  useEffect(() => {
    setDepartment(user?.department || '');
    setIsEditing(false);
    if (isOpen && user) {
      api.store
        .inventory()
        .then((res) => {
          if (res.success) setInventory(res.inventory);
        })
        .catch((err) => console.error('Inventory fetch error', err));
    }
    // user?.id + user?.department capture every field the effect actually
    // reads. Including the raw `user` object as lint suggests would re-fire
    // whenever the parent passes a fresh reference (which it does on every
    // refresh), thrashing the inventory call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.department, isOpen]);

  if (!isOpen || !user) return null;

  // Level calculation based on points (simple logic for demo)
  const level = Math.floor(user.points / 500) + 1;
  const nextLevelProgress = ((user.points % 500) / 500) * 100;

  // Mock history
  const recentHistory = [
    { result: 'WIN', game: 'Nişancı Düellosu', points: '+50', time: '10dk önce' },
    { result: 'LOSS', game: 'Bilgi Yarışı', points: '-20', time: '25dk önce' },
    { result: 'WIN', game: 'Retro Satranç', points: '+100', time: '1sa önce' },
  ];

  const handleSave = async () => {
    setLoading(true);
    try {
      if (onSaveProfile) {
        await onSaveProfile(department);
      } else {
        await api.users.update({ ...user, department });
      }
      setIsEditing(false);
    } catch (err) {
      alert('Güncelleme başarısız.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[115] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[#FBF7EE]/85  " onClick={onClose}></div>

      <div className="relative w-full max-w-md bg-[#050a19] border-t-2 border-r-4 border-b-4 border-l-2 border-t-cyan-400 border-r-pink-500 border-b-pink-500 border-l-cyan-400 shadow-[10px_10px_0px_rgba(0,0,0,0.8)] sm:rounded-none overflow-hidden flex flex-col ">
        {/* Cyber ID Card Header */}
        <div className="from-cyan-500 via-purple-500 to-pink-500 p-[2px]">
          <div className="bg-[#050a19] p-5 flex justify-between items-start relative overflow-hidden">
            {/* Background Lines */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, #00f3ff 0, #00f3ff 2px, transparent 2px, transparent 10px)',
              }}
            ></div>

            <div className="flex gap-4 relative z-10 w-full">
              <div className="w-20 h-20 bg-carbon border-2 border-cyan-400  overflow-hidden flex items-center justify-center shadow-[4px_4px_0_rgba(255,0,234,0.3)] shrink-0">
                <span className="font-riso-display text-4xl text-riso-pink-deep ">
                  {(user.username || '?').substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h2
                  className="font-riso-display text-2xl text-white tracking-widest truncate uppercase glitch-text"
                  data-text={user.username}
                >
                  {user.username}
                </h2>
                <span className="text-xs font-riso-body text-riso-pink-deep block mt-1 tracking-widest">
                  ID: #{user.id.toString().padStart(6, '0')}
                </span>

                {/* Department Section */}
                <div className="mt-2 flex items-center gap-2">
                  {isEditable && isEditing ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="bg-carbon border border-carbon-muted/50 text-cyan-50 font-riso-body text-xs px-2 py-1 outline-none w-48"
                      >
                        <option value="">Bölüm Seçiniz</option>
                        {PAU_DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleSave}
                        disabled={loading}
                        className="text-riso-spring hover:text-riso-spring transition-colors"
                      >
                        <Save size={16} />
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`flex items-center gap-2 ${isEditable ? 'group cursor-pointer' : ''}`}
                      onClick={() => {
                        if (!isEditable) return;
                        setDepartment(user.department || '');
                        setIsEditing(true);
                      }}
                    >
                      <Briefcase size={12} className="text-carbon-muted" />
                      <span className="text-riso-blue text-xs font-riso-body tracking-wider">
                        {user.department || 'Bölüm Girilmedi'}
                      </span>
                      {isEditable && (
                        <Edit2
                          size={10}
                          className="text-riso-pink-deep opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="relative z-10 w-8 h-8 flex items-center justify-center border border-riso-blue/30 text-riso-pink-deep hover:text-riso-pink-deep hover:bg-paper shrink-0 ml-2 transition-colors  group"
            >
              <X size={18} className=" group-hover:skew-x-0" />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-px bg-cyan-900/30 border-b-2 border-carbon-muted/50">
          <div className="bg-[#050a19] p-4 text-center hover:bg-paper transition-colors group">
            <Trophy
              className="mx-auto text-riso-mustard-deep mb-2 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)] group-hover:scale-110 transition-transform"
              size={20}
            />
            <span className="block text-3xl font-riso-display text-white">{user.wins}</span>
            <span className="text-[10px] font-riso-body text-carbon-muted/80 uppercase tracking-widest">
              Galibiyet
            </span>
          </div>
          <div className="bg-[#050a19] p-4 text-center hover:bg-paper transition-colors group">
            <Gamepad2
              className="mx-auto text-riso-pink-deep mb-2 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] group-hover:scale-110 transition-transform"
              size={20}
            />
            <span className="block text-3xl font-riso-display text-white">{user.gamesPlayed}</span>
            <span className="text-[10px] font-riso-body text-carbon-muted/80 uppercase tracking-widest">
              Oyun
            </span>
          </div>
          <div className="bg-[#050a19] p-4 text-center hover:bg-paper transition-colors group">
            <Star
              className="mx-auto text-riso-pink-deep mb-2 drop-shadow-[0_0_8px_rgba(236,72,153,0.5)] group-hover:scale-110 transition-transform"
              size={20}
            />
            <span className="block text-3xl font-riso-display text-white">
              {user.gamesPlayed > 0 ? Math.floor((user.wins / user.gamesPlayed) * 100) : 0}%
            </span>
            <span className="text-[10px] font-riso-body text-carbon-muted/80 uppercase tracking-widest">
              Oran
            </span>
          </div>
        </div>

        {/* Level Progress */}
        <div className="p-5 border-b-2 border-carbon-muted/50 bg-[#050a19] relative overflow-hidden">
          <div className="flex justify-between text-xs font-riso-display tracking-widest text-riso-pink-deep mb-2">
            <span>LEVEL {level}</span>
            <span className="text-riso-pink-deep">LEVEL {level + 1}</span>
          </div>
          <div className="h-4 bg-carbon border-2 border-carbon-muted/50  overflow-hidden relative">
            <div
              className="h-full from-cyan-500 to-pink-500 transition-all duration-1000 relative"
              style={{ width: `${nextLevelProgress}%` }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:1rem_1rem] animate-[stripes_1s_linear_infinite]"></div>
            </div>
          </div>
        </div>

        {/* Inventory / Equipment */}
        {inventory.length > 0 && (
          <div className="p-5 border-b-2 border-carbon-muted/50 bg-[#050a19]">
            <h3 className="font-riso-body text-[10px] tracking-widest text-riso-spring mb-3 flex items-center gap-2 uppercase">
              <Star size={12} className="text-riso-spring" />
              LİSANSLI EKİPMANLAR // ENVANTER
            </h3>
            <div className="flex flex-wrap gap-2 relative z-10">
              {inventory.map((item) => (
                <div
                  key={item.id}
                  className="px-2 py-1 bg-paper-deep/40 border border-riso-blue/30 text-[10px] font-riso-display text-riso-blue uppercase tracking-widest flex items-center gap-1"
                >
                  <span className="w-1.5 h-1.5 bg-emerald-400 animate-pulse"></span>
                  {item.item_title}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="p-5 bg-carbon/40">
          <h3 className="font-riso-body text-[10px] tracking-widest text-carbon-muted/80 mb-3 flex items-center gap-2 uppercase">
            <Clock size={12} className="text-riso-pink-deep" />
            Son Aktiviteler // Sistem Logu
          </h3>
          <div className="space-y-2 relative z-10">
            {recentHistory.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 bg-[#050a19] border-l-2 border border-carbon-muted/30 text-sm hover:border-cyan-400 transition-colors group"
                style={{ borderLeftColor: item.result === 'WIN' ? '#00f3ff' : '#ff00ea' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-1.5 h-1.5 animate-pulse ${item.result === 'WIN' ? 'bg-riso-blue shadow-[0_0_5px_#00f3ff]' : 'bg-riso-pink shadow-[0_0_5px_#ff00ea]'}`}
                  ></div>
                  <span className="text-carbon font-riso-body text-xs tracking-wider">
                    {item.game}
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className={`block font-riso-display tracking-widest ${item.result === 'WIN' ? 'text-riso-pink-deep' : 'text-riso-pink-deep'}`}
                  >
                    {item.points}
                  </span>
                  <span className="text-[9px] text-carbon-muted/60 font-riso-body uppercase">
                    {item.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Bar */}
        <div className="p-3 bg-riso-blue text-center">
          <span className="text-[10px] text-black font-riso-body font-bold tracking-[0.2em] uppercase">
            CAFE DUO LİSANS İZİNLERİ // GÜNCEL
          </span>
        </div>
      </div>
    </div>
  );
};
