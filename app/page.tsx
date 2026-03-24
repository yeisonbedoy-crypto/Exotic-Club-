'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Producto } from '@/lib/types';

export default function POSTerminal() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState<string>(''); // Peso Real o Unidades
  const [ajuste, setAjuste] = useState<string>(''); // Stock de Cortesía a restar del total cobrado
  const [modoTeclado, setModoTeclado] = useState<'cantidad' | 'ajuste'>('cantidad');
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
    
    if (modoTeclado === 'cantidad') {
      if (productoSeleccionado.categoria === 'unidad' && valor === '.') return;
      if (cantidad.includes('.') && valor === '.') return;
      setCantidad(prev => prev + valor);
    } else {
      if (productoSeleccionado.categoria === 'unidad' && valor === '.') return;
      if (ajuste.includes('.') && valor === '.') return;
      setAjuste(prev => prev + valor);
    }
  };

  const borrarDelTeclado = () => {
    if (modoTeclado === 'cantidad') {
      setCantidad(prev => prev.slice(0, -1));
    } else {
      setAjuste(prev => prev.slice(0, -1));
    }
  };

  const getCantidadesCalculadas = () => {
    const cantReal = Number(cantidad) || 0;
    const cantAjuste = Number(ajuste) || 0;
    const cantCobrar = Math.max(0, cantReal - cantAjuste);
    const precioUnitario = productoSeleccionado?.precio || 0;
    const total = cantCobrar * precioUnitario;
    return { cantReal, cantCobrar, total };
  };

  const procesarVenta = async () => {
    if (!productoSeleccionado || !cantidad || isNaN(Number(cantidad))) return;
    
    const { cantReal, total } = getCantidadesCalculadas();
    if (cantReal <= 0) return;

    setLoading(true);

    try {
      // 1. Guardar la venta (cantReal es lo que se deduce del stock al invocar el trigger SQL)
      // Nota: El trigger actualizará el stock quitando cantReal.
      const cantAjuste = Number(ajuste) || 0;
      const ajusteEuros = cantAjuste * (productoSeleccionado.precio || 0);

      const { error } = await supabase.from('ventas').insert([
        { 
          producto_id: productoSeleccionado.id, 
          cantidad: cantReal, 
          total: total,
          ajuste_peso: cantAjuste,
          ajuste_euros: ajusteEuros
        }
      ]);
      
      if (error) throw error;

      // 2. UI Optimista
      setProductos(prev => prev.map(p => 
        p.id === productoSeleccionado.id ? { ...p, stock: Number((p.stock - cantReal).toFixed(2)) } : p
      ));

      alert(`✅ Venta Exitosa: ${cantReal} ${productoSeleccionado.categoria === 'peso' ? 'g' : 'uds'} de ${productoSeleccionado.nombre} por ${total.toFixed(2)}€`);
      
      // Limpiar
      setProductoSeleccionado(null);
      setCantidad('');
      setAjuste('');
      setModoTeclado('cantidad');
    } catch (error) {
      console.error('Error al cobrar:', error);
      alert('❌ Error al registrar la venta');
    } finally {
      setLoading(false);
    }
  };

  const { cantReal, cantCobrar, total } = getCantidadesCalculadas();

  // Escuchar Teclado Físico
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar escritura si se está en el input de búsqueda
      if (document.activeElement && document.activeElement.tagName === 'INPUT') {
        return;
      }

      if (e.key === 'Escape') {
        // Deseleccionar
        setProductoSeleccionado(null);
        setCantidad('');
        setAjuste('');
        setModoTeclado('cantidad');
        return;
      }

      if (!productoSeleccionado) return;

      // Omitir comportamientos por defecto que puedan fastidiar
      if (e.key === 'Enter') {
        e.preventDefault();
        if (cantReal > 0 && !loading && total >= 0) {
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
  }, [productoSeleccionado, cantidad, ajuste, modoTeclado, loading, cantReal, total]);

  return (
    <div className="min-h-[100dvh] bg-stone-950 text-stone-100 p-4 font-sans flex flex-col selection:bg-emerald-500/30">
      <header className="mb-4 flex flex-row justify-between items-center">
        <h1 className="text-3xl font-black bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text text-transparent">
          EXOTIC OS
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
                    setCantidad(''); 
                    setAjuste('');
                    setModoTeclado('cantidad');
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
              <div className="text-center text-stone-500 py-10 border-2 border-dashed border-stone-800 rounded-2xl">
                No hay productos que coincidan en esta categoría.
              </div>
            )}
          </div>
        </section>

        {/* PANEL DERECHO: Teclado y Resumen */}
        <section className="bg-stone-900 border border-stone-800 rounded-3xl p-5 flex flex-col justify-between lg:col-span-5">
          <div>
            {/* Display Numérico Avanzado */}
            <div className={`rounded-2xl p-4 mb-6 relative overflow-hidden flex flex-col items-center justify-center border-2 transition-colors ${
              productoSeleccionado ? 'bg-stone-950 border-emerald-500/30' : 'bg-stone-950 border-stone-800 dashed'
            }`}>
              
              {/* Selectores de modo teclado */}
              {productoSeleccionado && productoSeleccionado.categoria === 'peso' && (
                <div className="absolute top-3 left-3 flex gap-2">
                  <button onClick={() => setModoTeclado('cantidad')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${modoTeclado === 'cantidad' ? 'bg-emerald-600 text-white shadow-md' : 'bg-stone-800 text-stone-400 hover:bg-stone-700'}`}>PESO REAL</button>
                  <button onClick={() => setModoTeclado('ajuste')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${modoTeclado === 'ajuste' ? 'bg-amber-600 text-white shadow-md' : 'bg-stone-800 text-stone-400 hover:bg-stone-700'}`}>CORTESÍA / AJUSTE</button>
                </div>
              )}

              {productoSeleccionado ? (
                <div className="w-full text-center mt-8">
                  <h2 className="text-stone-400 text-sm font-medium uppercase tracking-widest">{productoSeleccionado.nombre}</h2>
                  
                  {/* Desglose de Pesos */}
                  <div className="mt-2 text-stone-500 text-sm flex justify-center gap-6">
                    <div>Sale Bote: <span className={`font-mono ${modoTeclado === 'cantidad' ? 'text-white' : 'text-stone-400'}`}>{cantidad || '0'}</span></div>
                    {productoSeleccionado.categoria === 'peso' && ajuste && (
                      <div className="text-amber-400">Restar: <span className={`font-mono font-bold ${modoTeclado === 'ajuste' ? 'text-white' : 'text-amber-400'}`}>-{ajuste}</span></div>
                    )}
                  </div>

                  {/* Peso Final a Cobrar */}
                  <div className="text-5xl font-mono font-black text-emerald-400 tracking-tight flex justify-center items-baseline gap-2 mt-3">
                    {cantCobrar > 0 ? cantCobrar.toFixed(2).replace(/\.00$/, '') : '0'} 
                    <span className="text-2xl text-emerald-600 font-sans">
                      {productoSeleccionado.categoria === 'peso' ? 'g' : 'uds'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-stone-600 font-medium text-lg h-32 flex items-center">Selecciona un producto</p>
              )}
            </div>

            {/* Teclado Táctil */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button 
                  key={num} 
                  onClick={() => agregarAlTeclado(num.toString())}
                  disabled={!productoSeleccionado}
                  className="bg-stone-800 hover:bg-stone-700 active:bg-stone-600 text-3xl font-semibold h-16 sm:h-20 rounded-2xl transition-all disabled:opacity-30 disabled:scale-100 active:scale-95 shadow-sm"
                >
                  {num}
                </button>
              ))}
              <button 
                onClick={() => agregarAlTeclado('.')}
                disabled={!productoSeleccionado || productoSeleccionado.categoria === 'unidad'}
                className="bg-stone-800 hover:bg-stone-700 active:bg-stone-600 text-4xl font-semibold h-16 sm:h-20 rounded-2xl transition-all disabled:opacity-30 active:scale-95 shadow-sm"
              >
                .
              </button>
              <button 
                onClick={() => agregarAlTeclado('0')}
                disabled={!productoSeleccionado}
                className="bg-stone-800 hover:bg-stone-700 active:bg-stone-600 text-3xl font-semibold h-16 sm:h-20 rounded-2xl transition-all disabled:opacity-30 active:scale-95 shadow-sm"
              >
                0
              </button>
              <button 
                onClick={borrarDelTeclado}
                disabled={!productoSeleccionado}
                className="bg-stone-800 hover:bg-rose-900/40 active:bg-rose-900 text-stone-400 hover:text-rose-400 h-16 sm:h-20 rounded-2xl transition-all disabled:opacity-30 active:scale-95 shadow-sm flex items-center justify-center border border-transparent"
              >
                ← BORRAR
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Total a cobrar mostrado sobre el botón */}
            <div className="flex justify-between items-end px-2">
              <span className="text-stone-400 text-lg">Total a pagar:</span>
              <span className="text-4xl font-bold text-white">
                {total > 0 ? total.toFixed(2) : '0.00'}€
              </span>
            </div>

            <button
              onClick={procesarVenta}
              disabled={!productoSeleccionado || cantReal <= 0 || loading || total < 0}
              className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-stone-800 disabled:text-stone-500 text-white text-xl lg:text-2xl font-black h-20 rounded-2xl transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-[0.98] border border-emerald-500/50 disabled:border-transparent"
            >
              {loading ? 'REGISTRANDO...' : 'COBRAR'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
