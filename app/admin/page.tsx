'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Producto } from '@/lib/types';

export default function AdminPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<'flor' | 'resina' | 'bebida' | 'otro'>('flor');
  const [categoria, setCategoria] = useState<'peso' | 'unidad'>('peso');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');

  useEffect(() => {
    cargarProductos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargarProductos() {
    setLoading(true);
    const { data } = await supabase
      .from('productos')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      setProductos(data as Producto[]);
    }
    setLoading(false);
  }

  const handleCrearProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !precio || !stock) return;

    setSaving(true);
    const { error } = await supabase.from('productos').insert([
      {
        nombre,
        tipo,
        categoria,
        precio: Number(precio),
        stock: Number(stock),
        activo: true
      }
    ]).select();

    if (error) {
      console.error(error);
      alert('❌ Error al crear el producto');
    } else {
      alert('✅ Producto guardado correctamente');
      setNombre('');
      setPrecio('');
      setStock('');
      cargarProductos();
    }
    setSaving(false);
  };

  const toggleActivo = async (id: string, estadoActual: boolean) => {
    const { error } = await supabase
      .from('productos')
      .update({ activo: !estadoActual })
      .eq('id', id);
    
    if (!error) {
      setProductos(prev => prev.map(p => p.id === id ? { ...p, activo: !estadoActual } : p));
    }
  };

  return (
    <div className="min-h-[100dvh] bg-stone-950 text-stone-100 p-4 font-sans selection:bg-emerald-500/30">
      <header className="mb-6 flex flex-row justify-between items-center max-w-6xl mx-auto">
        <h1 className="text-2xl lg:text-3xl font-black bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text text-transparent flex items-center gap-3">
          <Link href="/" className="text-stone-500 hover:text-emerald-500 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          Gestión de Inventario
        </h1>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* PANEL IZQUIERDO: Formulario de Creación */}
        <section className="bg-stone-900 border border-stone-800 rounded-3xl p-6 lg:col-span-4 h-fit sticky top-4">
          <h2 className="text-xl font-bold text-stone-100 mb-6">Añadir Nuevo Producto</h2>
          
          <form onSubmit={handleCrearProducto} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-400 mb-1">Nombre Comercial</label>
              <input 
                type="text" 
                required
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Amnesia Original"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all placeholder:text-stone-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-400 mb-1">Tipo</label>
                <select 
                  value={tipo}
                  onChange={e => setTipo(e.target.value as any)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="flor">Flor</option>
                  <option value="resina">Resina / Extracción</option>
                  <option value="bebida">Bebida</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-400 mb-1">Modo de Venta</label>
                <select 
                  value={categoria}
                  onChange={e => setCategoria(e.target.value as any)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="peso">Peso (Gramos)</option>
                  <option value="unidad">Unidades enteras</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-400 mb-1">Stock Inicial</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={stock}
                  onChange={e => setStock(e.target.value)}
                  placeholder="Ej: 150.5"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all placeholder:text-stone-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-400 mb-1">Precio / Unidad (€)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={precio}
                  onChange={e => setPrecio(e.target.value)}
                  placeholder="Ej: 6.50"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all placeholder:text-stone-700"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={saving}
              className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-stone-800 disabled:text-stone-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20"
            >
              {saving ? 'Guardando...' : '+ Crear Producto'}
            </button>
          </form>
        </section>

        {/* PANEL DERECHO: Lista de Productos */}
        <section className="bg-stone-900 border border-stone-800 rounded-3xl p-6 lg:col-span-8">
          <h2 className="text-xl font-bold text-stone-100 mb-6">Inventario Actual</h2>
          
          {loading ? (
            <div className="text-center py-10 text-stone-500">Cargando inventario...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-800 text-sm tracking-wider text-stone-400 uppercase">
                    <th className="pb-3 font-medium">Línea</th>
                    <th className="pb-3 font-medium">Nombre</th>
                    <th className="pb-3 font-medium">Stock</th>
                    <th className="pb-3 font-medium">Precio</th>
                    <th className="pb-3 font-medium text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60">
                  {productos.map(p => (
                    <tr key={p.id} className="group hover:bg-stone-800/40 transition-colors">
                      <td className="py-4">
                        <span className="px-2.5 py-1 rounded-md bg-stone-800 text-xs font-medium text-stone-300 uppercase tracking-wider">
                          {p.tipo}
                        </span>
                      </td>
                      <td className="py-4 font-semibold text-stone-100">{p.nombre}</td>
                      <td className="py-4 font-mono">
                        <span className={p.stock < 10 ? 'text-rose-400 font-bold' : 'text-stone-300'}>
                          {p.stock}
                        </span>
                        <span className="text-xs text-stone-500 ml-1">
                          {p.categoria === 'peso' ? 'g' : 'u'}
                        </span>
                      </td>
                      <td className="py-4 font-medium text-emerald-400">{p.precio.toFixed(2)}€</td>
                      <td className="py-4 text-right">
                        <button 
                          onClick={() => toggleActivo(p.id, p.activo)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                            p.activo 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' 
                              : 'bg-stone-800 text-stone-500 border-stone-700 hover:bg-stone-700'
                          }`}
                        >
                          {p.activo ? 'Dejar de Vender' : 'Reactivar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  
                  {productos.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-stone-500">
                        No hay productos en la base de datos.<br/>¡Crea el primero usando el formulario!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
