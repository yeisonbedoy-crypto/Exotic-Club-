'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Producto } from '@/lib/types';

type VentaHistorial = {
  venta_id: string;
  producto_nombre: string;
  producto_tipo: string;
  cantidad: number;
  total_euros: number;
  fecha_hora: string;
};

export default function AdminPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ventas, setVentas] = useState<VentaHistorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  // TABS
  const [activeTab, setActiveTab] = useState<'inventario' | 'ventas'>('inventario');

  // Formulario Producto
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<Producto['tipo']>('flor');
  const [categoria, setCategoria] = useState<Producto['categoria']>('peso');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');

  // Tienen que cargarse inicialmentee
  useEffect(() => {
    cargarInventario();
    cargarVentas();

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  async function cargarInventario() {
    setLoading(true);
    const { data } = await supabase
      .from('productos')
      .select('*')
      .order('activo', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (data) setProductos(data as Producto[]);
    setLoading(false);
  }

  async function cargarVentas() {
    const { data } = await supabase
      .from('vista_registro_ventas')
      .select('*')
      .limit(100); // Últimas 100 ventas
      
    if (data) setVentas(data as VentaHistorial[]);
  }

  const handleCrearProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !precio || !stock) return;

    setSaving(true);
    const { error } = await supabase.from('productos').insert([{
      nombre, tipo, categoria,
      precio: Number(precio),
      stock: Number(stock),
      activo: true
    }]);

    if (error) {
      alert('❌ Error al crear el producto');
    } else {
      alert('✅ Producto guardado');
      setNombre(''); setPrecio(''); setStock('');
      cargarInventario();
    }
    setSaving(false);
  };

  const modificarStock = async (id: string, variacion: number, stockActual: number) => {
    const nuevoStock = stockActual + variacion;
    if (nuevoStock < 0) return; // No permitir stock negativo
    
    // UI Optimistic Update
    setProductos(prev => prev.map(p => p.id === id ? { ...p, stock: nuevoStock } : p));
    
    const { error } = await supabase
      .from('productos')
      .update({ stock: nuevoStock, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
       alert('Error actualizando stock');
       cargarInventario(); // Revertir si hay error
    }
  };

  const toggleActivo = async (id: string, estadoActual: boolean) => {
    setProductos(prev => prev.map(p => p.id === id ? { ...p, activo: !estadoActual } : p));
    await supabase.from('productos').update({ activo: !estadoActual }).eq('id', id);
  };

  return (
    <div className="min-h-[100dvh] bg-stone-950 text-stone-100 p-4 font-sans pb-20 selection:bg-emerald-500/30">
      <header className="mb-6 max-w-7xl mx-auto border-b border-stone-800 pb-4">
        <div className="flex flex-row justify-between items-center mb-6">
          <h1 className="text-3xl font-black bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text text-transparent flex items-center gap-3">
            <Link href="/" className="p-2 bg-stone-900 rounded-xl text-stone-400 hover:text-emerald-500 hover:bg-stone-800 transition-all border border-stone-800 active:scale-95">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            Admin Panel
          </h1>
        </div>

        {/* TABS NAVEGACIÓN */}
        <div className="flex space-x-4 bg-stone-900 border border-stone-800 p-1.5 rounded-2xl w-full max-w-sm">
          <button 
            onClick={() => setActiveTab('inventario')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'inventario' ? 'bg-emerald-600 shadow-md text-white' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'}`}
          >
            📦 INVENTARIO
          </button>
          <button 
            onClick={() => setActiveTab('ventas')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'ventas' ? 'bg-emerald-600 shadow-md text-white' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'}`}
          >
            📋 VENTAS
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {/* VISTA DE INVENTARIO */}
        {activeTab === 'inventario' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* PANEL IZQUIERDO: Formulario de Creación */}
            <section id="form-nuevo-producto" className="bg-stone-900 border border-stone-800 rounded-3xl p-6 lg:col-span-4 h-fit relative lg:sticky lg:top-4 shadow-xl">
              <h2 className="text-xl font-bold text-stone-100 mb-6 flex items-center gap-2">
                <span className="text-emerald-500">＋</span> Nuevo Producto
              </h2>
              
              <form onSubmit={handleCrearProducto} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-stone-400 mb-1">Nombre Comercial</label>
                  <input type="text" required value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Amnesia Haze" className="w-full bg-stone-950 border border-stone-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-stone-700" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-400 mb-1">Cepa/Tipo</label>
                    <select value={tipo} onChange={e => setTipo(e.target.value as Producto['tipo'])} className="w-full bg-stone-950 border border-stone-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none h-14">
                      <option value="flor">Flor</option>
                      <option value="resina">Extracción</option>
                      <option value="bebida">Bebida</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-400 mb-1">Categoría Venta</label>
                    <select value={categoria} onChange={e => setCategoria(e.target.value as Producto['categoria'])} className="w-full bg-stone-950 border border-stone-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none h-14">
                      <option value="peso">Peso (g)</option>
                      <option value="unidad">Ud. Entera</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-400 mb-1">Stock Inicial</label>
                    <input type="number" step="0.01" required value={stock} onChange={e => setStock(e.target.value)} placeholder="0.0" className="w-full bg-stone-950 border border-stone-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-stone-700" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-400 mb-1">Precio (€)</label>
                    <input type="number" step="0.01" required value={precio} onChange={e => setPrecio(e.target.value)} placeholder="0.00" className="w-full bg-stone-950 border border-stone-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-stone-700" />
                  </div>
                </div>

                <button type="submit" disabled={saving} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-stone-800 disabled:text-stone-500 text-white font-black text-lg py-5 rounded-xl transition-all shadow-lg active:scale-[0.98]">
                  {saving ? 'GUARDANDO...' : 'AÑADIR AL INVENTARIO'}
                </button>
              </form>
            </section>

            {/* PANEL DERECHO: Inventario Gestionable */}
            <section className="bg-stone-900 flex-1 border border-stone-800 rounded-3xl p-6 lg:col-span-8 shadow-xl">
              <h2 className="text-xl font-bold text-stone-100 mb-6 flex justify-between items-center">
                <span>Gestión de Stock Activo</span>
                <span className="text-sm font-medium bg-stone-800 px-3 py-1 rounded-full text-stone-400">{productos.length} items</span>
              </h2>
              
              {loading ? (
                <div className="h-64 flex items-center justify-center text-stone-500 animate-pulse">Cargando inventario...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                  {productos.map(p => (
                    <div key={p.id} className={`p-5 rounded-2xl border transition-all ${p.activo ? 'bg-stone-950 border-stone-800' : 'bg-stone-900 border-stone-800/50 opacity-60'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-stone-100 line-clamp-1">{p.nombre}</h3>
                          <div className="flex gap-2 items-center mt-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 bg-stone-900 border border-stone-800 px-2 py-0.5 rounded-md">{p.tipo}</span>
                            <span className="text-sm font-medium text-emerald-500">{p.precio.toFixed(2)}€ /{p.categoria === 'peso' ? 'g' : 'u'}</span>
                          </div>
                        </div>
                        <button onClick={() => toggleActivo(p.id, p.activo)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-stone-800 hover:bg-stone-700 transition-colors border border-stone-700" title={p.activo ? 'Desactivar' : 'Activar'}>
                          {p.activo ? '👁️' : '🚫'}
                        </button>
                      </div>

                      <div className="bg-stone-900 border border-stone-800 rounded-xl p-2 flex items-center justify-between mt-4">
                        <button onClick={() => modificarStock(p.id, -1, p.stock)} className="w-12 h-12 rounded-lg bg-stone-800 active:bg-rose-500/20 active:text-rose-400 text-stone-300 font-bold text-xl active:scale-95 transition-all outline-none touch-manipulation">
                          -
                        </button>
                        <div className="flex flex-col items-center">
                          <span className={`text-2xl font-black font-mono ${p.stock < 10 ? 'text-rose-400' : 'text-stone-200'}`}>{p.stock}</span>
                          <span className="text-[10px] font-medium text-stone-500 uppercase tracking-widest">{p.categoria === 'peso' ? 'gramos' : 'unidades'}</span>
                        </div>
                        <button onClick={() => modificarStock(p.id, 1, p.stock)} className="w-12 h-12 rounded-lg bg-stone-800 active:bg-emerald-500/20 active:text-emerald-400 text-stone-300 font-bold text-xl active:scale-95 transition-all outline-none touch-manipulation">
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                  {productos.length === 0 && (
                    <div className="col-span-full py-12 text-center text-stone-500 font-medium border-2 border-dashed border-stone-800 rounded-2xl">
                      No tienes ningún producto creado todavía.
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        {/* VISTA DE VENTAS */}
        {activeTab === 'ventas' && (
          <section className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl w-full">
            <h2 className="text-xl font-bold text-stone-100 mb-6 flex justify-between items-center">
              <span>Registro de Transacciones</span>
              <span className="text-xs text-stone-500">Últimas 100 operaciones</span>
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-stone-800 text-xs tracking-widest text-stone-500 uppercase">
                    <th className="pb-4 font-semibold px-4">Fecha / Hora</th>
                    <th className="pb-4 font-semibold">Producto</th>
                    <th className="pb-4 font-semibold">Cant.</th>
                    <th className="pb-4 font-semibold text-emerald-500 text-right pr-4">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/50">
                  {ventas.map(v => (
                    <tr key={v.venta_id} className="hover:bg-stone-800/30 transition-colors">
                      <td className="py-5 px-4 text-stone-400 font-mono text-sm whitespace-nowrap">
                        {new Date(v.fecha_hora).toLocaleString('es-ES', { 
                          day: '2-digit', month: '2-digit', year: '2-digit',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="py-5">
                        <div className="font-bold text-stone-200">{v.producto_nombre}</div>
                        <div className="text-xs text-stone-500 uppercase mt-0.5">{v.producto_tipo}</div>
                      </td>
                      <td className="py-5 font-mono text-stone-300">
                        {v.cantidad}
                      </td>
                      <td className="py-5 font-bold text-emerald-400 text-right pr-4 text-lg">
                        +{v.total_euros.toFixed(2)}€
                      </td>
                    </tr>
                  ))}
                  {ventas.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-16 text-center text-stone-500 border-2 border-dashed border-stone-800 rounded-2xl">
                        Aún no se ha registrado ninguna venta.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </main>

      {/* Botón Flotante (FAB) para Móviles */}
      {showScrollTop && activeTab === 'inventario' && (
        <button 
          onClick={scrollToTop}
          className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-emerald-600 text-white rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center justify-center text-3xl font-black z-50 active:scale-95 transition-all"
        >
          +
        </button>
      )}
    </div>
  );
}
