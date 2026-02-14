import React, { useState, useEffect, useRef } from 'react';
import {
  collection, doc, setDoc, getDoc, onSnapshot, deleteDoc, getDocs, writeBatch
} from 'firebase/firestore';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
  setPersistence,
  browserLocalPersistence 
} from 'firebase/auth';
import { db, auth } from './firebase';
import {
  ChevronRight, ChevronDown, Save, Search, CheckCircle2,
  ArrowLeft, Sparkles, Pencil, X, Plus,
  Loader2, BookOpen, Settings, Trash2, Edit3, Eye, FileText,
  Bold, Italic, Underline, Palette, Calendar, Clock, Tag, Book, LogOut, Lock, RefreshCw, Zap,
  Feather, PenTool
} from 'lucide-react';

const MASTER_UID = "lvztQTkZPyQYYUeBnQSDfJlM9dW2";
const SPONTANEOUS_ID = "journal-spontaneous"; 

const DEFAULT_CONFIG = {
  heroTitle: 'My Spiritual Journey',
  heroSubtitle: "SHAIRA'S SANCTUARY",
  heroDescription: 'A quiet space to document my walk with God, from the first step of faith to the daily rhythms of grace.',
  heroNote: 'Walking in Amazing Grace ✨',
  titleSize: 'text-6xl md:text-7xl',
  titleFont: 'font-sans',
  titleColor: '#2D2A26',
};

// --- RICH EDITOR ---
const RichEditor = ({ initialValue, onSave, isEditing, minHeight = "auto", isDashboard = false }) => {
  const editorRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [activeStates, setActiveStates] = useState({ bold: false, italic: false, underline: false });
  
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== (initialValue || '')) {
      editorRef.current.innerHTML = initialValue || '';
    }
  }, [initialValue]);

  const checkActiveStyles = () => {
    setActiveStates({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
    });
  };

  const exec = (command, value = null) => {
    editorRef.current.focus();
    document.execCommand(command, false, value);
    checkActiveStyles();
  };

  const handleAutoScroll = () => {
    if (!scrollContainerRef.current) return;
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = scrollContainerRef.current.getBoundingClientRect();
    
    const triggerZone = containerRect.bottom - 100;
    if (rect.bottom > triggerZone) {
      scrollContainerRef.current.scrollBy({ top: rect.bottom - triggerZone + 50, behavior: 'smooth' });
    }
  };

  const handleInput = () => {
    if (onSave && editorRef.current) {
      onSave(editorRef.current.innerHTML);
    }
    checkActiveStyles();
    handleAutoScroll();
  };

  return (
    <div className={`flex flex-col bg-white rounded-[1.5rem] border ${isDashboard ? 'border-gray-400 shadow-md' : 'border-gray-100 shadow-sm'} overflow-hidden h-full relative`} style={{ minHeight }}>
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto custom-scrollbar bg-white relative scroll-smooth"
        onClick={() => { if(editorRef.current) editorRef.current.focus(); }}
      >
        <div className="min-h-full p-8 md:p-10">
          <div
            ref={editorRef}
            contentEditable={isEditing}
            onKeyUp={handleInput}
            onMouseUp={handleInput}
            onInput={handleInput}
            onBlur={handleInput}
            className={`outline-none font-sans text-[11pt] text-[#2D2A26] transition-all ${isEditing ? 'bg-white' : 'bg-transparent cursor-default'}`}
            style={{ lineHeight: '1.8', wordBreak: 'break-word', display: 'block' }}
          />
          {isEditing && <div className="h-[150px] w-full" />}
        </div>
      </div>
      {isEditing && (
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white z-30">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-gray-300 mr-2">Format</span>
            <button onMouseDown={(e) => { e.preventDefault(); exec('bold'); }} className={`p-2 rounded-lg transition-all ${activeStates.bold ? 'bg-[#C6A87C] text-white shadow-md' : 'hover:bg-white text-gray-400 hover:shadow-sm'}`}><Bold size={16} /></button>
            <button onMouseDown={(e) => { e.preventDefault(); exec('italic'); }} className={`p-2 rounded-lg transition-all ${activeStates.italic ? 'bg-[#C6A87C] text-white shadow-md' : 'hover:bg-white text-gray-400 hover:shadow-sm'}`}><Italic size={16} /></button>
            <button onMouseDown={(e) => { e.preventDefault(); exec('underline'); }} className={`p-2 rounded-lg transition-all ${activeStates.underline ? 'bg-[#C6A87C] text-white shadow-md' : 'hover:bg-white text-gray-400 hover:shadow-sm'}`}><Underline size={16} /></button>
          </div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-gray-400 px-2">Sans Serif • 11pt</div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [migrationStatus, setMigrationStatus] = useState('');

  const [notebooks, setNotebooks] = useState([]);
  const [siteConfig, setSiteConfig] = useState(DEFAULT_CONFIG);
  const [guides, setGuides] = useState({});
  const [entries, setEntries] = useState({});
  const [currentView, setCurrentView] = useState('library');
  const [adminTab, setAdminTab] = useState('general');
  const [activeNotebookId, setActiveNotebookId] = useState(null);
  const [activeDay, setActiveDay] = useState(null);
  const [homeSearchQuery, setHomeSearchQuery] = useState('');
  const [isAddingDay, setIsAddingDay] = useState(false);
  const [isEditingEntry, setIsEditingEntry] = useState(false);

  // States for Spontaneous Editing
  const [spontaneousTitle, setSpontaneousTitle] = useState('');
  const [spontaneousVerse, setSpontaneousVerse] = useState('');
  const [spontaneousPrayer, setSpontaneousPrayer] = useState('');
  const [isCreatingSpontaneous, setIsCreatingSpontaneous] = useState(false);

  const [newDayForm, setNewDayForm] = useState({ theme: '', date: '', scripture: '', scriptureText: '', reflection: '', prayer: '', challenge: '', tags: '' });
  const [notebookForm, setNotebookForm] = useState({ title: '', subtitle: '', startDate: '', finishDate: '', color: '#C6A87C', status: 'Active' });
  const [editingNotebookId, setEditingNotebookId] = useState(null);
  const [selectedContentNotebook, setSelectedContentNotebook] = useState(null);
  const [editingGuideDay, setEditingGuideDay] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const migrateData = async () => {
    const oldId = prompt("Paste OLD Anonymous ID from Firebase Console:");
    if (!oldId || oldId === MASTER_UID) return;
    setMigrationStatus('Syncing...');
    try {
      const batch = writeBatch(db);
      const configSnap = await getDoc(doc(db, 'users', oldId, 'settings', 'site_config'));
      if (configSnap.exists()) batch.set(doc(db, 'users', MASTER_UID, 'settings', 'site_config'), configSnap.data());
      const guidesSnap = await getDoc(doc(db, 'users', oldId, 'settings', 'guides'));
      if (guidesSnap.exists()) batch.set(doc(db, 'users', MASTER_UID, 'settings', 'guides'), guidesSnap.data());
      const nbSnap = await getDocs(collection(db, 'users', oldId, 'my_notebooks'));
      nbSnap.forEach(d => batch.set(doc(db, 'users', MASTER_UID, 'my_notebooks', d.id), d.data()));
      const entSnap = await getDocs(collection(db, 'users', oldId, 'my_entries'));
      entSnap.forEach(d => batch.set(doc(db, 'users', MASTER_UID, 'my_entries', d.id), d.data()));
      await batch.commit();
      setMigrationStatus('Success!');
      setTimeout(() => setMigrationStatus(''), 3000);
    } catch (err) { setMigrationStatus('Error Syncing.'); }
  };

  useEffect(() => {
    if (!user) return;
    const unsubNB = onSnapshot(collection(db, 'users', MASTER_UID, 'my_notebooks'), (snap) => {
      setNotebooks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    onSnapshot(doc(db, 'users', MASTER_UID, 'settings', 'site_config'), (snap) => {
      if (snap.exists()) setSiteConfig((prev) => ({ ...prev, ...snap.data() }));
      setConfigLoading(false);
    });
    onSnapshot(doc(db, 'users', MASTER_UID, 'settings', 'guides'), (snap) => {
      if (snap.exists()) setGuides(snap.data());
    });
    return () => unsubNB();
  }, [user]);

  useEffect(() => {
    if (!user || !activeNotebookId) return;
    const unsub = onSnapshot(collection(db, 'users', MASTER_UID, 'my_entries'), (snap) => {
      const data = {};
      snap.forEach((d) => {
        if (d.id.startsWith(activeNotebookId)) {
          const parts = d.id.split('_day_');
          if (parts.length > 1) data[`day-${parts[1]}`] = d.data();
        }
      });
      setEntries(data);
    });
    return () => unsub();
  }, [user, activeNotebookId]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) { setLoginError('Invalid credentials.'); }
  };

  const handleLogout = () => {
    signOut(auth);
    setCurrentView('library');
    setActiveNotebookId(null);
  };

  const saveEntry = async (dayId, htmlContent) => {
    if (!user) return;
    await setDoc(doc(db, 'users', MASTER_UID, 'my_entries', `${activeNotebookId}_day_${dayId}`), {
      text: htmlContent, updatedAt: new Date().toISOString()
    });
  };

  const createSpontaneousEntry = async () => {
    if(!spontaneousTitle.trim()) return;
    const newId = Date.now().toString();
    const todayStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const newDay = {
        day: newId,
        theme: spontaneousTitle,
        date: todayStr,
        scriptureText: spontaneousVerse,
        prayer: spontaneousPrayer,
        isSpontaneous: true
    };
    const currentSpontaneous = guides[SPONTANEOUS_ID] || [];
    const newGuidesList = [newDay, ...currentSpontaneous];
    await setDoc(doc(db, 'users', MASTER_UID, 'settings', 'guides'), { 
        ...guides, 
        [SPONTANEOUS_ID]: newGuidesList 
    });
    await setDoc(doc(db, 'users', MASTER_UID, 'my_entries', `${SPONTANEOUS_ID}_day_${newId}`), {
        text: '', updatedAt: new Date().toISOString()
    });
    setIsCreatingSpontaneous(false);
    setSpontaneousTitle('');
    setSpontaneousVerse('');
    setSpontaneousPrayer('');
    setActiveDay(newId);
  };

  const updateSpontaneousMeta = async (dayId, field, value) => {
      const currentList = [...(guides[SPONTANEOUS_ID] || [])];
      const index = currentList.findIndex(item => item.day === dayId);
      if(index === -1) return;
      currentList[index] = { ...currentList[index], [field]: value };
      await setDoc(doc(db, 'users', MASTER_UID, 'settings', 'guides'), {
          ...guides,
          [SPONTANEOUS_ID]: currentList
      });
  };

  // --- DELETE SPONTANEOUS (OR ANY) DAY ---
  const deleteDay = async (notebookId, dayId) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;
    const currentList = guides[notebookId] || [];
    const newList = currentList.filter(d => d.day !== dayId);
    await setDoc(doc(db, 'users', MASTER_UID, 'settings', 'guides'), { ...guides, [notebookId]: newList });
    setEditingGuideDay(null);
  };

  const saveSiteConfig = async (newConfig) => {
    setSiteConfig(newConfig);
    if (user) await setDoc(doc(db, 'users', MASTER_UID, 'settings', 'site_config'), newConfig);
  };
  const saveNotebook = async () => {
    const id = editingNotebookId || `journal-${Date.now()}`;
    await setDoc(doc(db, 'users', MASTER_UID, 'my_notebooks', id), notebookForm, { merge: true });
    setEditingNotebookId(null);
    setNotebookForm({ title: '', subtitle: '', startDate: '', finishDate: '', color: '#C6A87C', status: 'Active' });
  };
  const deleteNotebook = async (id) => {
    if (!confirm('Permanently delete this journal cover?')) return;
    await deleteDoc(doc(db, 'users', MASTER_UID, 'my_notebooks', id));
  };
  const saveGuideContent = async () => {
    if (!selectedContentNotebook || !editingGuideDay) return;
    let currentGuides = [...(guides[selectedContentNotebook] || [])];
    const idx = currentGuides.findIndex((g) => g.day === editingGuideDay.day);
    if (idx >= 0) currentGuides[idx] = editingGuideDay;
    else currentGuides.push(editingGuideDay);
    if(selectedContentNotebook !== SPONTANEOUS_ID) {
      currentGuides.sort((a, b) => a.day - b.day);
    }
    await setDoc(doc(db, 'users', MASTER_UID, 'settings', 'guides'), { ...guides, [selectedContentNotebook]: currentGuides });
    setEditingGuideDay(null);
  };
  const handleAddDay = async () => {
    const current = guides[selectedContentNotebook] || [];
    const newGuides = { ...guides, [selectedContentNotebook]: [...current, { day: current.length + 1, ...newDayForm }] };
    await setDoc(doc(db, 'users', MASTER_UID, 'settings', 'guides'), newGuides);
    setIsAddingDay(false);
    setNewDayForm({ theme: '', date: '', scripture: '', scriptureText: '', reflection: '', prayer: '', challenge: '', tags: '' });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  };

  if (authLoading || (user && configLoading)) return <div className="min-h-screen bg-[#FDFCF6] flex items-center justify-center"><Loader2 className="animate-spin text-[#C6A87C]" size={32} /></div>;

  if (!user) return (
    <div className="min-h-screen bg-[#FDFCF6] flex items-center justify-center p-6 relative">
      <div className="fixed inset-0 opacity-40 pointer-events-none z-0" style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/cream-paper.png")` }}></div>
      <div className="w-full max-w-md bg-white p-12 rounded-[3rem] shadow-2xl border border-white relative z-10 animate-in fade-in zoom-in duration-700">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-[#C6A87C]/10 rounded-full flex items-center justify-center mx-auto mb-6 text-[#C6A87C]"><Lock size={32} /></div>
          <h1 className="text-4xl font-sans font-bold text-[#2D2A26] mb-2 tracking-tight">Welcome Home</h1>
          <p className="text-[10px] uppercase tracking-widest text-gray-300 font-bold italic">Shaira's Sanctuary</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-1"><label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Email</label><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 bg-[#FDFCF6] border border-gray-200 rounded-2xl outline-none text-sm focus:border-[#C6A87C]" placeholder="shairamelegrito@gmail.com" /></div>
          <div className="space-y-1"><label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Master Key</label><input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 bg-[#FDFCF6] border border-gray-200 rounded-2xl outline-none text-sm focus:border-[#C6A87C]" placeholder="••••••••" /></div>
          {loginError && <p className="text-red-500 text-xs text-center font-bold animate-shake">{loginError}</p>}
          <button type="submit" className="w-full py-5 bg-[#2D2A26] text-white rounded-2xl font-bold uppercase tracking-[0.2em] text-xs hover:bg-[#C6A87C] transition-all shadow-xl active:scale-95">Enter Sanctuary</button>
        </form>
        <div className="mt-12 pt-8 border-t border-gray-50 text-center">
          <p className="text-[9px] uppercase tracking-[0.2em] text-gray-400 mb-4">Sync Old Data?</p>
          <button onClick={migrateData} className="flex items-center gap-2 mx-auto text-[10px] font-bold text-[#C6A87C] hover:text-[#2D2A26] transition-colors"><RefreshCw size={14} className={migrationStatus ? 'animate-spin' : ''} /> {migrationStatus || 'Click to Sync'}</button>
        </div>
      </div>
    </div>
  );

  const renderAdmin = () => (
    <div className="max-w-6xl mx-auto px-6 py-12 min-h-screen relative z-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-6">
          <h1 className="text-4xl font-sans font-bold text-[#2D2A26]">Sanctuary Dashboard</h1>
          <button onClick={handleLogout} className="p-2 text-gray-200 hover:text-red-400 transition-colors"><LogOut size={20}/></button>
        </div>
        <button onClick={() => setCurrentView('library')} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#C6A87C]"><Eye size={16} /> View Sanctuary</button>
      </div>
      <div className="grid lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-2">
          {['general', 'journals', 'content'].map(tab => (
            <button key={tab} onClick={() => setAdminTab(tab)} className={`w-full text-left p-4 rounded-xl font-bold text-sm transition-all flex items-center gap-3 ${adminTab === tab ? 'bg-[#2D2A26] text-white shadow-lg' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
              {tab === 'general' ? <Settings size={18}/> : tab === 'journals' ? <BookOpen size={18}/> : <FileText size={18}/>}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        <div className="lg:col-span-3">
          {adminTab === 'general' && (
            <div className="space-y-6 bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-200 animate-in fade-in">
               <h2 className="text-2xl font-serif font-bold text-[#2D2A26] mb-6 border-b pb-4">Branding & Text</h2>
               <div className="space-y-6">
                 <div><label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Main Hero Title</label><input className="w-full p-4 bg-white border border-gray-400 rounded-xl outline-none focus:ring-1 focus:ring-[#C6A87C]" value={siteConfig.heroTitle} onChange={(e) => saveSiteConfig({...siteConfig, heroTitle: e.target.value})} /></div>
                 <div className="grid grid-cols-2 gap-6">
                   <div><label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Subtitle</label><input className="w-full p-4 bg-white border border-gray-400 rounded-xl outline-none" value={siteConfig.heroSubtitle} onChange={(e) => saveSiteConfig({...siteConfig, heroSubtitle: e.target.value})} /></div>
                   <div><label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Focus Badge</label><input className="w-full p-4 bg-white border border-gray-400 rounded-xl outline-none" value={siteConfig.heroNote} onChange={(e) => saveSiteConfig({...siteConfig, heroNote: e.target.value})} /></div>
                 </div>
                 <div><label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Description</label><textarea className="w-full p-4 bg-white border border-gray-400 rounded-xl outline-none h-32" value={siteConfig.heroDescription} onChange={(e) => saveSiteConfig({...siteConfig, heroDescription: e.target.value})} /></div>
               </div>
            </div>
          )}
          {adminTab === 'journals' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
                <h2 className="text-xl font-serif font-bold text-[#2D2A26] mb-6 flex items-center gap-2">{editingNotebookId ? <Edit3 size={20} className="text-[#C6A87C]" /> : <Plus size={20} className="text-[#C6A87C]" />}{editingNotebookId ? 'Edit Journal' : 'Create New Journal'}</h2>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-1"><label className="text-[9px] uppercase font-bold text-gray-400 ml-1">Title</label><input className="w-full p-3 bg-white border border-gray-400 rounded-xl font-sans text-sm outline-none" value={notebookForm.title} onChange={(e) => setNotebookForm({ ...notebookForm, title: e.target.value })} /></div>
                  <div className="space-y-1"><label className="text-[9px] uppercase font-bold text-gray-400 ml-1">Subtitle</label><input className="w-full p-3 bg-white border border-gray-400 rounded-xl font-sans text-sm outline-none" value={notebookForm.subtitle} onChange={(e) => setNotebookForm({ ...notebookForm, subtitle: e.target.value })} /></div>
                  <div className="space-y-1"><label className="text-[9px] uppercase font-bold text-gray-400 ml-1">Start Date</label><input type="date" className="w-full p-3 bg-white border border-gray-400 rounded-xl text-sm outline-none" value={notebookForm.startDate} onChange={(e) => setNotebookForm({ ...notebookForm, startDate: e.target.value })} /></div>
                  <div className="space-y-1"><label className="text-[9px] uppercase font-bold text-gray-400 ml-1">Finish Date</label><input type="date" className="w-full p-3 bg-white border border-gray-400 rounded-xl text-sm outline-none" value={notebookForm.finishDate} onChange={(e) => setNotebookForm({ ...notebookForm, finishDate: e.target.value })} /></div>
                </div>
                <div className="flex gap-4 items-center"><div className="flex-1"><input type="color" className="w-full h-10 rounded cursor-pointer" value={notebookForm.color} onChange={(e) => setNotebookForm({ ...notebookForm, color: e.target.value })} /></div><button onClick={saveNotebook} className="px-8 py-3 bg-[#2D2A26] text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-[#C6A87C] transition-colors">{editingNotebookId ? 'Update' : 'Create'}</button></div>
              </div>
              <div className="grid gap-4">{notebooks.map((nb) => (<div key={nb.id} className="group flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 transition-all"><div className="flex items-center gap-4"><div className="w-12 h-16 rounded shadow-sm" style={{ backgroundColor: nb.color }}></div><div><h3 className="font-sans font-bold text-[#2D2A26]">{nb.title}</h3><p className="text-[10px] text-gray-400">{nb.startDate}</p></div></div><div className="flex items-center gap-2"><button onClick={() => { setEditingNotebookId(nb.id); setNotebookForm(nb); }} className="p-2 text-gray-400 hover:text-[#C6A87C] bg-gray-50 rounded-lg"><Edit3 size={16} /></button><button onClick={() => deleteNotebook(nb.id)} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-lg"><Trash2 size={16} /></button></div></div>))}</div>
            </div>
          )}
          {adminTab === 'content' && (
            <div className="space-y-6 bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-200">
              <h2 className="text-2xl font-serif font-bold text-[#2D2A26] mb-8 border-b pb-4">Manage Devotional Days</h2>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Select Journal</label>
                <select className="w-full p-4 bg-white border border-gray-400 rounded-xl outline-none mb-8" onChange={(e) => setSelectedContentNotebook(e.target.value)} value={selectedContentNotebook || ''}>
                  <option value="">-- Choose Journal --</option>
                  <option value={SPONTANEOUS_ID}>Spontaneous Revelations</option>
                  {notebooks.filter(n => n.id !== SPONTANEOUS_ID).map(nb => <option key={nb.id} value={nb.id}>{nb.title}</option>)}
                </select>
              </div>
              {selectedContentNotebook && (
                <div className="space-y-3">
                  {selectedContentNotebook !== SPONTANEOUS_ID && (
                    <button onClick={() => setIsAddingDay(!isAddingDay)} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-400 hover:border-[#C6A87C] flex items-center justify-center gap-2 transition-all"><Plus size={18}/> {isAddingDay ? 'Cancel' : 'Add New Day'}</button>
                  )}
                  {isAddingDay && selectedContentNotebook !== SPONTANEOUS_ID && (
                    <div className="p-6 bg-[#FDFCF6] rounded-2xl border border-gray-200 space-y-4">
                      <div className="space-y-1"><label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Theme Title</label><input placeholder="New Day Theme" className="w-full p-4 bg-white border border-gray-400 rounded-xl outline-none text-sm" value={newDayForm.theme} onChange={(e) => setNewDayForm({...newDayForm, theme: e.target.value})} /></div>
                      <button onClick={handleAddDay} className="w-full py-4 bg-[#C6A87C] text-white rounded-xl font-bold">Add to Journal</button>
                    </div>
                  )}
                  {(guides[selectedContentNotebook] || []).map(day => (
                    <div key={day.day} className="border border-gray-300 rounded-2xl overflow-hidden bg-white shadow-sm mb-4">
                       <div onClick={() => setEditingGuideDay(editingGuideDay?.day === day.day ? null : day)} className="p-5 flex justify-between items-center cursor-pointer hover:bg-gray-50/50">
                        <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-[#C6A87C]/10 text-[#C6A87C] flex items-center justify-center font-bold text-sm">{day.day.toString().length > 5 ? 'S' : day.day}</div><div className="font-bold text-sm text-[#2D2A26]">{day.theme}</div></div>
                        <div className="flex items-center gap-2">
                           {editingGuideDay?.day === day.day && <button onClick={(e) => { e.stopPropagation(); deleteDay(selectedContentNotebook, day.day); }} className="text-red-400 hover:text-red-600 mr-2"><Trash2 size={16}/></button>}
                           <ChevronDown className={`text-gray-400 transition-all ${editingGuideDay?.day === day.day ? 'rotate-180 text-[#C6A87C]' : ''}`} size={20} />
                        </div>
                      </div>
                      {editingGuideDay?.day === day.day && (
                        <div className="p-8 bg-[#FDFCF6] border-t border-gray-200 space-y-5">
                            <div className="space-y-1"><label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Theme / Title</label><input className="w-full p-3 bg-white border border-gray-400 rounded-xl text-sm" value={editingGuideDay.theme} onChange={e => setEditingGuideDay({...editingGuideDay, theme: e.target.value})}/></div>
                            <div className="space-y-1"><label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Scripture/Note</label><textarea className="w-full p-3 bg-white border border-gray-400 rounded-xl text-sm h-24" value={editingGuideDay.scriptureText} onChange={e => setEditingGuideDay({...editingGuideDay, scriptureText: e.target.value})}/></div>
                            <button onClick={saveGuideContent} className="w-full py-3 bg-[#2D2A26] text-white rounded-xl font-bold">Save Changes</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const searchLower = homeSearchQuery.toLowerCase();
  const searchResults = notebooks.flatMap(nb => {
    const dayMatches = (guides[nb.id] || []).filter(d => 
      d.theme?.toLowerCase().includes(searchLower) || d.scripture?.toLowerCase().includes(searchLower) || d.tags?.toLowerCase().includes(searchLower)
    );
    return dayMatches.map(d => ({ type: 'day', data: d, notebook: nb }));
  }).filter(Boolean);

  return (
    <div className="min-h-screen bg-[#FDFCF6] text-[#2D2A26] font-sans selection:bg-[#C6A87C]/20 relative overflow-x-hidden">
      <div className="fixed inset-0 opacity-40 pointer-events-none z-0" style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/cream-paper.png")` }}></div>
      {currentView === 'admin' ? renderAdmin() : (
        <div className="max-w-7xl mx-auto px-6 py-16 flex flex-col min-h-screen relative z-10 animate-in fade-in duration-700">
          {currentView === 'library' ? (
            <>
              {/* SEARCH */}
              <div className="flex justify-center mb-12"><div className="relative w-full max-w-md group"><input type="text" placeholder="Search theme, scripture, or tag..." value={homeSearchQuery} onChange={(e) => setHomeSearchQuery(e.target.value)} className="w-full pl-14 pr-6 py-4 rounded-full bg-white/80 backdrop-blur-sm shadow-sm outline-none text-sm" /><Search className="absolute left-6 top-[18px] text-gray-300 group-focus-within:text-[#C6A87C]" size={18} /></div></div>
              
              {homeSearchQuery ? (
                // SEARCH RESULTS
                <div className="space-y-6 animate-in fade-in max-w-4xl mx-auto w-full pb-24">
                  {searchResults.map((res, i) => (
                    <div key={i} onClick={() => { setActiveNotebookId(res.notebook.id); setCurrentView('journal'); setActiveDay(res.data.day); }} className="bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-white hover:border-[#C6A87C]/30 hover:shadow-xl transition-all cursor-pointer group">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#C6A87C]/10 text-[#C6A87C] font-bold">{res.data.day.toString().length > 5 ? '★' : res.data.day}</div>
                          <div><p className="text-[10px] font-bold uppercase text-[#C6A87C] tracking-widest">{res.notebook.title}</p><h4 className="text-xl font-bold text-[#2D2A26]">{res.data.theme}</h4></div>
                        </div><ChevronRight className="text-gray-200 group-hover:text-[#C6A87C] transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {/* SPONTANEOUS CARD */}
                  <div className="max-w-4xl mx-auto w-full mb-16 animate-in fade-in slide-in-from-bottom-6">
                    <div 
                        onClick={() => { setActiveNotebookId(SPONTANEOUS_ID); setCurrentView('journal'); }}
                        className="bg-gradient-to-r from-[#2D2A26] to-[#45413C] rounded-[2rem] p-8 md:p-10 shadow-2xl relative overflow-hidden group cursor-pointer transition-all hover:scale-[1.01]"
                    >
                        <div className="relative z-10 flex items-center justify-between">
                            <div>
                                <h2 className="text-white font-serif italic text-3xl mb-2">Spontaneous Revelations</h2>
                                <p className="text-white/60 text-sm font-sans">For the sudden whispers, learning moments, and messages from the Lord.</p>
                            </div>
                            <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center text-white/80 group-hover:bg-white group-hover:text-[#2D2A26] transition-all">
                                <Feather size={24} />
                            </div>
                        </div>
                        <div className="absolute -right-20 -bottom-40 w-80 h-80 bg-[#C6A87C]/20 rounded-full blur-3xl"></div>
                    </div>
                  </div>

                  {/* HERO HEADER */}
                  <div className="text-center mb-16 space-y-6">
                    <h2 className="text-[10px] font-bold tracking-[0.4em] uppercase text-[#C6A87C]">{siteConfig.heroSubtitle}</h2>
                    <h1 className={`${siteConfig?.titleSize} font-sans font-bold`} style={{ color: siteConfig?.titleColor }}>{siteConfig.heroTitle}</h1>
                  </div>

                  {/* NOTEBOOKS GRID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12 justify-items-center pb-24 px-4">
                    {notebooks.filter(n => n.id !== SPONTANEOUS_ID).map(nb => (
                      <div key={nb.id} onClick={() => { setActiveNotebookId(nb.id); setCurrentView('journal'); }} className="group cursor-pointer w-full max-w-[260px] transition-all hover:-translate-y-4">
                        <div className="relative aspect-[3/4.6] rounded-r-2xl rounded-l-md shadow-2xl overflow-hidden flex flex-col justify-between p-8" style={{ backgroundColor: nb.color }}>
                          <div className="absolute left-0 inset-y-0 w-4 bg-black/10 border-r border-black/5"></div>
                          <div className="text-center mt-12"><div className="border-y border-white/20 py-6 mb-4"><h3 className="text-2xl font-bold text-white leading-tight">{nb.title}</h3></div><p className="text-[9px] uppercase tracking-widest text-white/80 leading-snug">{nb.subtitle}</p></div>
                          <div className="text-center"><div className="mb-2 text-[8px] font-bold text-white/60 uppercase">{nb.startDate}</div><span className="inline-block px-3 py-1 bg-black/10 rounded-full text-[8px] uppercase tracking-widest text-white/90">{nb.status}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            // JOURNAL VIEW
            <div className="animate-in fade-in duration-500">
              <button onClick={() => { setCurrentView('library'); setActiveDay(null); setIsCreatingSpontaneous(false); }} className="group flex items-center gap-3 mb-12 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-[#C6A87C] transition-colors"><div className="p-2 rounded-full bg-white border border-gray-100 group-hover:border-[#C6A87C]"><ArrowLeft size={14} /></div>Library Home</button>
              
              <header className="mb-12 text-center">
                <h1 className="text-6xl font-sans font-bold text-[#2D2A26] mb-4 drop-shadow-sm">
                    {activeNotebookId === SPONTANEOUS_ID ? "Revelations" : notebooks.find(n => n.id === activeNotebookId)?.title}
                </h1>
                <p className="text-xl text-gray-400 font-sans italic">
                    {activeNotebookId === SPONTANEOUS_ID ? "Capture what the Lord is speaking to you today." : notebooks.find(n => n.id === activeNotebookId)?.subtitle}
                </p>
              </header>

              {/* SPONTANEOUS ADD BUTTON */}
              {activeNotebookId === SPONTANEOUS_ID && !isCreatingSpontaneous && !activeDay && (
                  <div className="flex justify-center mb-12">
                      <button 
                        onClick={() => setIsCreatingSpontaneous(true)}
                        className="flex items-center gap-3 px-8 py-4 bg-[#2D2A26] text-white rounded-full font-bold shadow-xl hover:bg-[#C6A87C] transition-all"
                      >
                          <Sparkles size={18} /> Receive New Word
                      </button>
                  </div>
              )}

              {/* SPONTANEOUS CREATION FORM */}
              {isCreatingSpontaneous && (
                  <div className="max-w-2xl mx-auto bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100 mb-12 animate-in slide-in-from-bottom-4">
                      <div className="flex justify-between items-center mb-8">
                          <h3 className="font-serif italic text-2xl text-[#2D2A26]">New Revelation</h3>
                          <button onClick={() => setIsCreatingSpontaneous(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
                      </div>
                      <div className="space-y-6">
                          <div><label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Title / Topic</label><input autoFocus className="w-full p-4 bg-[#FDFCF6] border border-gray-200 rounded-xl outline-none text-lg font-bold text-[#2D2A26]" placeholder="e.g. The Season of Waiting" value={spontaneousTitle} onChange={(e) => setSpontaneousTitle(e.target.value)} /></div>
                          <div><label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Key Scripture (Optional)</label><input className="w-full p-4 bg-[#FDFCF6] border border-gray-200 rounded-xl outline-none text-sm" placeholder="e.g. Isaiah 43:19" value={spontaneousVerse} onChange={(e) => setSpontaneousVerse(e.target.value)} /></div>
                          <div><label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Key Insight / Prayer Note (Optional)</label><textarea className="w-full p-4 bg-[#FDFCF6] border border-gray-200 rounded-xl outline-none text-sm h-24" placeholder="Short note..." value={spontaneousPrayer} onChange={(e) => setSpontaneousPrayer(e.target.value)} /></div>
                          <button onClick={createSpontaneousEntry} disabled={!spontaneousTitle.trim()} className="w-full py-4 bg-[#C6A87C] text-white rounded-xl font-bold disabled:opacity-50">Open Journal</button>
                      </div>
                  </div>
              )}

              {/* ENTRY LIST */}
              {!isCreatingSpontaneous && (
                <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/60 overflow-hidden divide-y divide-gray-50">
                    {(guides[activeNotebookId] || []).map(item => (
                    <div key={item.day} className="group">
                        <div onClick={() => { setActiveDay(activeDay === item.day ? null : item.day); setIsEditingEntry(false); }} className={`p-10 cursor-pointer flex items-center gap-8 transition-all hover:bg-[#F5F2E8]/30 ${activeDay === item.day ? 'bg-[#F5F2E8]/50' : ''}`}>
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold border-[3px] transition-all shadow-sm ${activeDay === item.day ? 'bg-[#C6A87C] text-white border-[#C6A87C] scale-110' : 'bg-white text-gray-300 border-gray-100'}`}>
                                {item.isSpontaneous ? <Feather size={20} /> : item.day}
                            </div>
                            <div className="flex-1">
                                <h3 className={`font-sans text-3xl font-bold mb-1 ${activeDay === item.day ? 'text-[#2D2A26]' : 'text-gray-700'}`}>{item.theme}</h3>
                                <div className="flex flex-wrap items-center gap-4 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                    <span><Calendar size={12} className="inline mr-1 text-[#C6A87C]" /> {item.date || 'No Date'}</span>
                                    {item.scripture && <span><Book size={12} className="inline mr-1 text-[#C6A87C]" /> {item.scripture}</span>}
                                </div>
                            </div>
                            <div className="flex items-center gap-6">{entries[`day-${item.day}`] ? <CheckCircle2 className="text-green-500" size={24}/> : <div className="w-6 h-6 rounded-full border-2 border-gray-100"/>}<ChevronDown className={`transition-all ${activeDay === item.day ? 'rotate-180 text-[#C6A87C]' : 'text-gray-200'}`} size={20} /></div>
                        </div>
                        
                        {/* OPEN ENTRY VIEW */}
                        {activeDay === item.day && (
                        <div className="p-16 bg-[#F5F2E8]/30 border-t border-[#F5F2E8] animate-in slide-in-from-top-4">
                            <div className="grid lg:grid-cols-2 gap-20 items-start">
                                {/* LEFT COLUMN */}
                                <div className="space-y-12 pb-12 min-h-[600px]">
                                    {item.isSpontaneous ? (
                                        // EDITABLE FIELDS FOR SPONTANEOUS
                                        <>  
                                            <div className="p-8 bg-white rounded-2xl border border-gray-200 shadow-sm space-y-4">
                                                <div className="flex items-center gap-2 text-[#C6A87C] mb-2"><Pencil size={18} /><span className="text-xs font-bold uppercase tracking-widest">Theme Title</span></div>
                                                <input 
                                                    className="w-full bg-transparent outline-none text-3xl font-bold text-[#2D2A26]" 
                                                    value={item.theme || ''}
                                                    onChange={(e) => updateSpontaneousMeta(item.day, 'theme', e.target.value)}
                                                />
                                            </div>
                                            <div className="p-8 bg-white rounded-2xl border border-gray-200 shadow-sm space-y-4">
                                                <div className="flex items-center gap-2 text-[#C6A87C] mb-2"><Book size={18} /><span className="text-xs font-bold uppercase tracking-widest">Key Scripture</span></div>
                                                <textarea 
                                                    className="w-full bg-transparent outline-none text-2xl font-serif italic text-[#2D2A26] resize-none" 
                                                    rows={4}
                                                    placeholder="Type the verse here..."
                                                    value={item.scriptureText || ''}
                                                    onChange={(e) => updateSpontaneousMeta(item.day, 'scriptureText', e.target.value)}
                                                />
                                            </div>
                                            <div className="p-8 bg-white rounded-2xl border border-gray-200 shadow-sm space-y-4">
                                                <div className="flex items-center gap-2 text-[#C6A87C] mb-2"><Sparkles size={18} /><span className="text-xs font-bold uppercase tracking-widest">Key Insight / Prayer</span></div>
                                                <textarea 
                                                    className="w-full bg-transparent outline-none text-lg text-gray-600 resize-none font-serif" 
                                                    rows={6}
                                                    placeholder="What is the core message?"
                                                    value={item.prayer || ''}
                                                    onChange={(e) => updateSpontaneousMeta(item.day, 'prayer', e.target.value)}
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        // STATIC FIELDS FOR REGULAR
                                        <>
                                            <div><h4 className="text-[10px] uppercase tracking-widest text-[#C6A87C] font-bold mb-6 flex items-center gap-2"><div className="h-[1px] w-8 bg-[#C6A87C]"></div>Scripture Focus</h4><p className="text-3xl font-serif italic text-[#2D2A26] leading-relaxed drop-shadow-sm">"{item.scriptureText}"</p></div>
                                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100"><h4 className="text-[10px] uppercase tracking-widest text-[#C6A87C] font-bold mb-4">Reflection</h4><div className="max-h-[300px] overflow-y-auto custom-scrollbar pr-4 text-gray-600 leading-loose text-lg font-sans" dangerouslySetInnerHTML={{ __html: item.reflection }} /></div>
                                            <div className="p-8 bg-[#C6A87C]/5 rounded-2xl border border-[#C6A87C]/20 relative overflow-hidden"><div className="absolute top-0 left-0 w-1 h-full bg-[#C6A87C]"></div><h4 className="text-[10px] uppercase tracking-widest text-[#C6A87C] font-bold mb-4 flex items-center gap-2"><Sparkles size={14} /> Prayer Guide</h4><p className="font-serif italic text-gray-700 text-lg">{item.prayer}</p></div>
                                            <div className="p-8 bg-black/[0.02] rounded-2xl border border-dashed border-[#C6A87C]/30 relative overflow-hidden"><h4 className="text-[10px] uppercase tracking-widest text-[#C6A87C] font-bold mb-4 flex items-center gap-2"><Zap size={14} /> Action / Challenge Step</h4><p className="font-serif text-gray-700 text-lg">{item.challenge}</p></div>
                                        </>
                                    )}
                                </div>

                                {/* RIGHT COLUMN: EDITOR (Always the same) */}
                                <div className="sticky top-6 h-[calc(100vh-6rem)] flex flex-col">
                                    <div className="flex items-center justify-between mb-6 shrink-0"><div className="flex flex-col"><h4 className="font-sans font-bold text-2xl text-[#4A3F35]">My Heart's Reflection</h4>{entries[`day-${item.day}`]?.updatedAt && <div className="text-[9px] text-gray-400 font-bold uppercase mt-1"><Clock size={10} className="inline mr-1" /> Last edited: {formatDate(entries[`day-${item.day}`].updatedAt)}</div>}</div><button onClick={() => setIsEditingEntry(!isEditingEntry)} className={`p-4 rounded-full shadow-lg transition-all ${isEditingEntry ? 'bg-[#C6A87C] text-white shadow-xl' : 'bg-white text-gray-400 hover:text-[#C6A87C]'}`}>{isEditingEntry ? <Save size={20} /> : <Pencil size={20} />}</button></div>
                                    <div className="flex-1 overflow-hidden h-full">
                                        <RichEditor minHeight="100%" initialValue={entries[`day-${item.day}`]?.text} onSave={(val) => saveEntry(item.day, val)} isEditing={isEditingEntry} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        )}
                    </div>
                    ))}
                </div>
              )}
            </div>
          )}
          <footer className="mt-auto text-center pt-24 pb-8 flex justify-center gap-6"><button onClick={() => { setAdminTab('general'); setCurrentView('admin'); }} className="text-[10px] uppercase tracking-widest text-gray-300 hover:text-[#C6A87C] transition-colors"><Settings size={12} className="inline mr-1" /> Dashboard</button><button onClick={handleLogout} className="text-[10px] uppercase tracking-widest text-gray-300 hover:text-red-400 transition-colors"><LogOut size={12} className="inline mr-1" /> Sign Out</button></footer>
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        .perspective-1000 { perspective: 1000px; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .animate-shake { animation: shake 0.3s ease-in-out; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #E5DCCA; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #C6A87C; }
      ` }} />
    </div>
  );
}