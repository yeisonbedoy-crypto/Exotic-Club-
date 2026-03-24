'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Producto } from '@/lib/types';

export default function POSTerminal() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function cargarProductos() {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('activo', true)
        .order('nombre');
      
      if (error) {
        console.error('Error cargando productos:', error);
      } else if (data) {
        setProductos(data as Producto[]);
      }
    }
    cargarProductos();
  }, []);

  const productosFiltrados = productos.filter(p => 
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    p.tipo.includes(busqueda.toLowerCase())
  );

  const agregarAlTeclado = (valor: string) => {
    if (!productoSeleccionado) return;
    
    // Si se vende por unidad, ignorar puntos decimales
    if (productoSeleccionado.categoria === 'unidad' && valor === '.') return;
    // Prevenir dos puntos decimales
    if (cantidad.includes('.') && valor === '.') return;
    
    setCantidad(prev => prev + valor);
  };

  const procesarVenta = async () => {
    if (!productoSeleccionado || !cantidad || isNaN(Number(cantidad))) return;
    
    setLoading(true);
    const cantNum = Number(cantidad);
    const total = cantNum * productoSeleccionado.precio;

    try {
      // 1. Guardar la venta en Supabase (esto disparará el Trigger que resta el stock)
      const { error } = await supabase.from('ventas').insert([
        { 
          producto_id: productoSeleccionado.id, 
          cantidad: cantNum, 
          total: total 
        }
      ]);
      
      if (error) throw error;

      // 2. Actualización en caché local para feedback instantáneo (Optimistic UI)
      setProductos(prev => prev.map(p => 
        p.id === productoSeleccionado.id ? { ...p, stock: p.stock - cantNum } : p
      ));

      alert(`✅ Venta Exitosa: ${cantNum} ${productoSeleccionado.categoria === 'peso' ? 'g' : 'uds'} de ${productoSeleccionado.nombre} por ${total.toFixed(2)}€`);
      
      // Limpiar estado
      setProductoSeleccionado(null);
      setCantidad('');
    } catch (error) {
      console.error('Error al cobrar:', error);
      alert('❌ Error al registrar la venta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-stone-950 text-stone-100 p-4 font-sans flex flex-col selection:bg-emerald-500/30">
      <header className="mb-4 flex flex-row justify-between items-center">
        <h1 className="text-3xl font-black bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text text-transparent">
          CLUB POS Terminal
        </h1>
        <Link href="/admin" aria-label="Panel de Administración" className="p-3 text-stone-600 hover:text-emerald-400 hover:bg-stone-900 active:bg-stone-800 transition-all rounded-2xl flex items-center justify-center shrink-0 disabled:opacity-50">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20 lg:pb-0">
        
        {/* PANEL IZQUIERDO: Lista de Productos */}
        <section className="bg-stone-900 border border-stone-800 rounded-3xl p-4 flex flex-col lg:col-span-7 lg:h-[85vh]">
          <input 
            type="text" 
            placeholder="Buscar por nombre o tipo..." 
            className="w-full bg-stone-950 border border-stone-800 rounded-2xl p-4 text-xl mb-4 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all placeholder:text-stone-600 shadow-inner"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-stone-700">
            {productosFiltrados.map((prod) => {
              const esSeleccionado = productoSeleccionado?.id === prod.id;
              return (
                <button
                  key={prod.id}
                  onClick={() => { setProductoSeleccionado(prod); setCantidad(''); }}
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
                          {prod.tipo}
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
          </div>
        </section>

        {/* PANEL DERECHO: Teclado y Resumen */}
        <section className="bg-stone-900 border border-stone-800 rounded-3xl p-5 flex flex-col justify-between lg:col-span-5">
          <div>
            {/* Pantalla del Display Numérico */}
            <div className={`rounded-2xl p-6 mb-6 h-36 flex flex-col items-center justify-center border-2 transition-colors ${
              productoSeleccionado ? 'bg-stone-950 border-emerald-500/30' : 'bg-stone-950 border-stone-800 dashed'
            }`}>
              {productoSeleccionado ? (
                <>
                  <h2 className="text-stone-400 text-lg mb-1">{productoSeleccionado.nombre}</h2>
                  <div className="text-5xl font-mono font-black text-stone-100 tracking-tight flex items-baseline gap-2">
                    {cantidad || '0'} 
                    <span className="text-2xl text-stone-500 font-sans">
                      {productoSeleccionado.categoria === 'peso' ? 'g' : 'uds'}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-stone-600 font-medium text-lg">Selecciona un producto</p>
              )}
            </div>

            {/* Teclado Táctil */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button 
                  key={num} 
                  onClick={() => agregarAlTeclado(num.toString())}
                  disabled={!productoSeleccionado}
                  className="bg-stone-800 active:bg-stone-700 text-3xl font-semibold h-20 rounded-2xl transition-all disabled:opacity-30 disabled:scale-100 active:scale-95 shadow-sm"
                >
                  {num}
                </button>
              ))}
              <button 
                onClick={() => agregarAlTeclado('.')}
                disabled={!productoSeleccionado || productoSeleccionado.categoria === 'unidad'}
                className="bg-stone-800 active:bg-stone-700 text-4xl font-semibold h-20 rounded-2xl transition-all disabled:opacity-30 active:scale-95 shadow-sm"
              >
                .
              </button>
              <button 
                onClick={() => agregarAlTeclado('0')}
                disabled={!productoSeleccionado}
                className="bg-stone-800 active:bg-stone-700 text-3xl font-semibold h-20 rounded-2xl transition-all disabled:opacity-30 active:scale-95 shadow-sm"
              >
                0
              </button>
              <button 
                onClick={() => setCantidad(prev => prev.slice(0, -1))}
                disabled={!productoSeleccionado || !cantidad}
                className="bg-stone-800/80 active:bg-rose-500/20 text-stone-400 active:text-rose-400 h-20 rounded-2xl transition-all disabled:opacity-30 active:scale-95 shadow-sm flex items-center justify-center border border-transparent active:border-rose-500/30"
              >
                ← BORRAR
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Total a cobrar mostrado sobre el botón */}
            <div className="flex justify-between items-end px-2">
              <span className="text-stone-400 text-lg">Total a cobrar:</span>
              <span className="text-4xl font-bold text-emerald-400">
                {productoSeleccionado && cantidad 
                  ? (Number(cantidad) * productoSeleccionado.precio).toFixed(2) 
                  : '0.00'}€
              </span>
            </div>

            <button
              onClick={procesarVenta}
              disabled={!productoSeleccionado || !cantidad || Number(cantidad) <= 0 || loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-stone-800 disabled:text-stone-500 text-white text-2xl font-black h-20 rounded-2xl transition-all shadow-lg hover:shadow-emerald-500/20 active:scale-[0.98] border border-emerald-500/50 disabled:border-transparent"
            >
              {loading ? 'REGISTRANDO...' : 'COBRAR'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
