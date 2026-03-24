'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Producto } from '@/lib/types';

export default function POSTerminal() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [cantidadReal, setCantidadReal] = useState<string>(''); // Peso Real o Unidades
  const [totalCobrado, setTotalCobrado] = useState<string>(''); // Dinero Real a cobrar
  const [concepto, setConcepto] = useState<string>(''); // Nota para ventas genéricas
  const [campoActivo, setCampoActivo] = useState<'peso' | 'precio'>('peso');
  const [loading, setLoading] = useState(false);

  // Tabs de navegación superior
  const [activeTab, setActiveTab] = useState<'weed' | 'extraccion' | 'bebida' | 'otro'>('weed');
  // Subtabs para extracciones
  const [activeSubTab, setActiveSubTab] = useState<'TODO' | 'ICE O LATOR' | 'BHO' | 'DRY SIFT' | 'HASH'>('TODO');

  useEffect(() => {
    async function cargarProductos() {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('activo', true)
        .order('nombre');
      
      if (!error && data) {
        setProductos(data as Producto[]);
      }
    }
    cargarProductos();
  }, []);

  // Filtrado de productos basado en Tabs, Subtabs y Búsqueda
  const productosFiltrados = productos.filter(p => {
    // Buscar
    if (busqueda) {
       return p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || p.tipo.includes(busqueda.toLowerCase());
    }
    
    // Categoría Principal
    if (p.tipo !== activeTab) return false;

    // Subcategoría (solo si es extracción y el tab no es TODO)
    if (activeTab === 'extraccion' && activeSubTab !== 'TODO') {
      if (p.subtipo !== activeSubTab) return false;
    }

    return true;
  });

  const agregarAlTeclado = (valor: string) => {
    if (!productoSeleccionado) return;
    
    if (campoActivo === 'peso') {
      if (productoSeleccionado.categoria === 'unidad' && valor === '.') return;
      if (cantidadReal.includes('.') && valor === '.') return;
      
      const nuevoPeso = cantidadReal + valor;
      setCantidadReal(nuevoPeso);
      
      // Sugerir precio automáticamente basado en el nuevo peso
      if (productoSeleccionado.precio) {
        setTotalCobrado((Number(nuevoPeso) * productoSeleccionado.precio).toFixed(2).replace(/\.00$/, ''));
      }
    } else {
      if (totalCobrado.includes('.') && valor === '.') return;
      setTotalCobrado(prev => prev + valor);
    }
  };

  const borrarDelTeclado = () => {
    if (campoActivo === 'peso') {
      const nuevoPeso = cantidadReal.slice(0, -1);
      setCantidadReal(nuevoPeso);
      if (productoSeleccionado && productoSeleccionado.precio) {
        setTotalCobrado(nuevoPeso ? (Number(nuevoPeso) * productoSeleccionado.precio).toFixed(2).replace(/\.00$/, '') : '');
      }
    } else {
      setTotalCobrado(prev => prev.slice(0, -1));
    }
  };

  const procesarVenta = async () => {
    if (!productoSeleccionado || !cantidadReal || isNaN(Number(cantidadReal))) return;
    
    const cantNumeric = Number(cantidadReal) || 0;
    const totalNumeric = Number(totalCobrado) || 0;
    
    if (cantNumeric <= 0) return;

    setLoading(true);

    try {
      const { error } = await supabase.from('ventas').insert([
        { 
          producto_id: productoSeleccionado.id, 
          cantidad_real: cantNumeric, 
          total_cobrado: totalNumeric,
          concepto: concepto.trim() || null
        }
      ]);
      
      if (error) throw error;

      // UI Optimista
      setProductos(prev => prev.map(p => 
        p.id === productoSeleccionado.id ? { ...p, stock: Number((p.stock - cantNumeric).toFixed(2)) } : p
      ));

      alert(`✅ Venta Exitosa: ${cantNumeric} ${productoSeleccionado.categoria === 'peso' ? 'g' : 'uds'} de ${productoSeleccionado.nombre} por ${totalNumeric.toFixed(2)}€`);
      
      // Limpiar
      setProductoSeleccionado(null);
      setCantidadReal('');
      setTotalCobrado('');
      setConcepto('');
      setCampoActivo('peso');
    } catch (error) {
      console.error('Error al cobrar:', error);
      alert('❌ Error al registrar la venta');
    } finally {
      setLoading(false);
    }
  };

  // Escuchar Teclado Físico
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar escritura si se está en el input de búsqueda
      if (document.activeElement && document.activeElement.tagName === 'INPUT') {
        return;
      }

      if (e.key === 'Escape') {
        setProductoSeleccionado(null);
        setCantidadReal('');
        setTotalCobrado('');
        setCampoActivo('peso');
        return;
      }
      
      if (!productoSeleccionado) return;

      if (e.key === 'Tab' || e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setCampoActivo(prev => {
          if (prev === 'peso') {
            setTotalCobrado(''); // Limpiar al pasar a precio
            return 'precio';
          }
          return 'peso';
        });
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const cantNumeric = Number(cantidadReal);
        const totalNumeric = Number(totalCobrado);
        if (cantNumeric > 0 && !loading && totalNumeric >= 0) {
          procesarVenta();
        }
      } else if (e.key === 'Backspace') {
        borrarDelTeclado();
      } else if (/^[0-9.]$/.test(e.key)) {
        agregarAlTeclado(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [productoSeleccionado, cantidadReal, totalCobrado, campoActivo, loading]);

  return (
    <div className="min-h-[100dvh] bg-stone-950 text-stone-100 p-4 font-sans flex flex-col selection:bg-emerald-500/30">
      <header className="mb-4 flex flex-row justify-between items-center">
        <h1 className="text-3xl font-black bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text text-transparent">
          EXOTIC HUB
        </h1>
        <Link href="/admin" aria-label="Panel de Administración" className="p-3 text-stone-600 hover:text-emerald-400 hover:bg-stone-900 active:bg-stone-800 transition-all rounded-2xl flex items-center justify-center shrink-0 disabled:opacity-50">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20 lg:pb-0">
        
        {/* PANEL IZQUIERDO: Filtros y Lista */}
        <section className="bg-stone-900 border border-stone-800 rounded-3xl p-4 flex flex-col lg:col-span-7 lg:h-[85vh]">
          
          {/* TABS DE CATEGORÍAS */}
          <div className="flex bg-stone-950 p-1.5 rounded-2xl mb-4 text-sm font-bold border border-stone-800">
            {['weed', 'extraccion', 'bebida', 'otro'].map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab as any); setBusqueda(''); setProductoSeleccionado(null); }}
                className={`flex-1 py-3 rounded-xl uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-emerald-600 text-white shadow' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* SUBTABS SI ES EXTRACCION */}
          {activeTab === 'extraccion' && !busqueda && (
            <div className="flex flex-wrap gap-2 mb-4">
              {['TODO', 'ICE O LATOR', 'BHO', 'DRY SIFT', 'HASH'].map((sub) => (
                <button
                  key={sub}
                  onClick={() => setActiveSubTab(sub as any)}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeSubTab === sub ? 'bg-stone-700 text-emerald-400 border border-emerald-500/50' : 'bg-stone-950 text-stone-500 border border-stone-800 hover:text-stone-300'}`}
                >
                  {sub}
                </button>
              ))}
            </div>
          )}

          <input 
            type="text" 
            placeholder="Buscar producto (ej: Amnesia, BHO...)" 
            className="w-full bg-stone-950 border border-stone-800 rounded-2xl p-4 text-lg mb-4 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all placeholder:text-stone-600 shadow-inner"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-stone-700">
            {productosFiltrados.map((prod) => {
              const esSeleccionado = productoSeleccionado?.id === prod.id;
              return (
                <button
                  key={prod.id}
                  onClick={() => { 
                    setProductoSeleccionado(prod); 
                    setCantidadReal(''); 
                    setTotalCobrado('');
                    setCampoActivo('peso');
                  }}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all active:scale-[0.98] ${
                    esSeleccionado 
                      ? 'bg-emerald-900/20 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                      : 'bg-stone-800/40 border-transparent hover:bg-stone-800/80'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-semibold text-stone-100">{prod.nombre}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-medium uppercase tracking-wider text-stone-400 bg-stone-800 px-2 py-1 rounded-md">
                          {prod.subtipo ? `${prod.tipo} - ${prod.subtipo}` : prod.tipo}
                        </span>
                        <span className={`text-sm ${prod.stock < 10 ? 'text-rose-400' : 'text-stone-400'}`}>
                          Stock: {prod.stock} {prod.categoria === 'peso' ? 'g' : 'uds'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-emerald-400">{prod.precio.toFixed(2)}€</span>
      <span className="text-sm text-stone-500 block">/{prod.categoria === 'peso' ? 'g' : 'ud'}</span>
                    </div>
                  </div>
                </button>
              );
            })}
            {productosFiltrados.length === 0 && (
              <div className="text-center text-stone-500 py-10 border-2 border-dashed border-stone-800 rounded-2xl flex flex-col items-center justify-center p-6 gap-4">
                <p>No hay productos que coincidan en esta categoría.</p>
                {activeTab === 'otro' && (
                  <button 
                    onClick={async () => {
                      const { data, error } = await supabase.from('productos').insert([{
                        nombre: 'Artículos Varios', tipo: 'otro', categoria: 'unidad', precio: 1, stock: 9999, activo: true
                      }]).select('*');
                      if (data) {
                         setProductos(prev => [...prev, data[0]]);
                      }
                    }}
                    className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/50 font-bold py-3 px-6 rounded-xl hover:bg-emerald-600 hover:text-white transition-all w-full mt-2"
                  >
                    + CREAR "ARTÍCULOS VARIOS"
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* PANEL DERECHO: Teclado y Resumen */}
        <section className="bg-stone-900 border border-stone-800 rounded-3xl p-5 flex flex-col justify-between lg:col-span-5">
          <div>
            {/* Display Numérico Avanzado */}
            <div className={`rounded-2xl p-4 mb-4 relative overflow-hidden flex flex-col items-center justify-center border-2 transition-colors ${
              productoSeleccionado ? 'bg-stone-950 border-emerald-500/30' : 'bg-stone-950 border-stone-800 dashed'
            }`}>
              {productoSeleccionado ? (
                <div className="w-full text-center">
                  <h2 className="text-stone-400 text-sm font-medium uppercase tracking-widest mb-4">{productoSeleccionado.nombre}</h2>
                  
                  <div className="flex flex-row justify-center gap-4 w-full px-2">
                    {/* Input Falso: Peso Real */}
                    <div 
                      onClick={() => setCampoActivo('peso')}
                      className={`flex-1 p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center ${
                        campoActivo === 'peso' ? 'border-emerald-500 bg-emerald-900/20' : 'border-stone-800 bg-stone-900 hover:border-stone-700'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold text-stone-500 mb-1">Sale (Peso/Ud)</span>
                      <div className={`text-2xl font-mono font-black ${campoActivo === 'peso' ? 'text-emerald-400' : 'text-stone-300'}`}>
                        {cantidadReal || '0'} <span className="text-xs text-stone-600 font-sans">{productoSeleccionado.categoria === 'peso' ? 'g' : 'uds'}</span>
                      </div>
                    </div>

                    {/* Input Falso: Dinero */}
                    <div 
                      onClick={() => {
                        if (campoActivo === 'peso') setTotalCobrado(''); // Limpiar si venimos del peso
                        setCampoActivo('precio');
                      }}
                      className={`flex-1 p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center ${
                        campoActivo === 'precio' ? 'border-emerald-500 bg-emerald-900/20' : 'border-stone-800 bg-stone-900 hover:border-stone-700'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold text-stone-500 mb-1">Total a Cobrar</span>
                      <div className={`text-2xl font-mono font-black ${campoActivo === 'precio' ? 'text-emerald-400' : 'text-stone-300'}`}>
                        {totalCobrado || '0'} <span className="text-xs text-stone-600 font-sans">€</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-[10px] text-stone-500 font-medium">Pulsa TAB o Flechas para cambiar de campo</div>
                </div>
              ) : (
                <p className="text-stone-600 font-medium text-lg h-32 flex items-center justify-center">Selecciona un producto</p>
              )}
            </div>

            {/* Input Concepto (Opcional, para todas las opciones) */}
            {productoSeleccionado && (
              <div className="mb-4 animate-fade-in">
                <input 
                  type="text" 
                  placeholder="✏️ Concepto / Nota Opcional (Ej: Grinder, CLIPPER...)" 
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  onFocus={() => { if(campoActivo === 'peso') setCampoActivo('precio'); }}
                  className="w-full bg-stone-900 border border-emerald-500/30 rounded-xl p-3 text-sm text-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-stone-500 shadow-inner"
                  maxLength={60}
                />
              </div>
            )}

            {/* Teclado Táctil Mejorado y Pequeño */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button 
                  key={num} 
                  onClick={() => agregarAlTeclado(num.toString())}
                  disabled={!productoSeleccionado}
                  className="bg-stone-800 hover:bg-stone-700 active:bg-stone-600 text-2xl font-semibold h-14 rounded-xl transition-all disabled:opacity-30 disabled:scale-100 active:scale-95 shadow-sm"
                >
                  {num}
                </button>
              ))}
              <button 
                onClick={() => agregarAlTeclado('.')}
                disabled={!productoSeleccionado || (campoActivo === 'peso' && productoSeleccionado.categoria === 'unidad')}
                className="bg-stone-800 hover:bg-stone-700 active:bg-stone-600 text-3xl font-semibold h-14 rounded-xl transition-all disabled:opacity-30 active:scale-95 shadow-sm"
              >
                .
              </button>
              <button 
                onClick={() => agregarAlTeclado('0')}
                disabled={!productoSeleccionado}
                className="bg-stone-800 hover:bg-stone-700 active:bg-stone-600 text-2xl font-semibold h-14 rounded-xl transition-all disabled:opacity-30 active:scale-95 shadow-sm"
              >
                0
              </button>
              <button 
                onClick={borrarDelTeclado}
                disabled={!productoSeleccionado}
                className="bg-stone-800 hover:bg-rose-900/40 active:bg-rose-900 text-stone-400 hover:text-rose-400 h-14 rounded-xl transition-all disabled:opacity-30 active:scale-95 shadow-sm flex items-center justify-center border border-transparent font-bold text-sm tracking-wider"
              >
                ← BORRAR
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={procesarVenta}
              disabled={!productoSeleccionado || Number(cantidadReal) <= 0 || loading || Number(totalCobrado) < 0}
              className="w-full flex flex-col justify-center items-center bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-stone-800 disabled:text-stone-500 text-white h-[4.5rem] rounded-2xl transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-[0.98] border border-emerald-500/50 disabled:border-transparent"
            >
              <span className="text-xl font-black">{loading ? 'REGISTRANDO...' : 'PROCESAR VENTA'}</span>
              <span className="text-xs font-semibold uppercase tracking-widest opacity-80 mt-1">{Number(totalCobrado) > 0 ? `${Number(totalCobrado).toFixed(2)}€` : '0.00€'}</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
