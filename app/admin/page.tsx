'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Producto } from '@/lib/types';

type VentaHistorial = {
  venta_id: string;
  producto_nombre: string;
  producto_tipo: string;
  producto_subtipo: string | null;
  cantidad_real: number;
  total_cobrado: number;
  fecha_hora: string;
  concepto: string | null;
};

export default function AdminPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ventas, setVentas] = useState<VentaHistorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  // AUTENTICACIÓN
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usuarioInput, setUsuarioInput] = useState('');
  const [passInput, setPassInput] = useState('');
  const [authError, setAuthError] = useState(false);

  // TABS
  const [activeTab, setActiveTab] = useState<'inventario' | 'ventas' | 'dashboard'>('inventario');

  // DASHBOARD
  const [rangoTiempo, setRangoTiempo] = useState<'hoy' | '7dias' | 'mes'>('hoy');
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({ ventasTotales: 0, volumenTotal: 0, unidadesTotales: 0 });
  const [topProductos, setTopProductos] = useState<{nombre: string, total: number}[]>([]);

  // Formulario Producto
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<Producto['tipo']>('weed');
  const [subtipo, setSubtipo] = useState<Producto['subtipo']>(null);
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

  // Cargar dashboard cuando cambia el rango o te logueas
  useEffect(() => {
    if (isAuthenticated) {
      cargarDashboard();
    }
  }, [rangoTiempo, isAuthenticated]);

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
      .order('fecha_hora', { ascending: false })
      .limit(100); // Últimas 100 ventas
      
    if (data) setVentas(data as VentaHistorial[]);
  }

  async function cargarDashboard() {
    setDashboardLoading(true);
    try {
      let fechaInicio = new Date();
      if (rangoTiempo === 'hoy') {
        fechaInicio.setHours(0, 0, 0, 0);
      } else if (rangoTiempo === '7dias') {
        fechaInicio.setDate(fechaInicio.getDate() - 7);
      } else if (rangoTiempo === 'mes') {
        fechaInicio = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), 1);
      }

      const { data, error } = await supabase
        .from('vista_registro_ventas')
        .select('*')
        .gte('fecha_hora', fechaInicio.toISOString());

      if (error) throw error;

      const ventasArr = (data || []) as VentaHistorial[];
      
      let vTotales = 0;
      let volTotal = 0;
      let uTotales = 0;
      
      const prodMap: Record<string, number> = {};

      ventasArr.forEach(v => {
        vTotales += v.total_cobrado;
        
        if (v.producto_tipo === 'weed' || v.producto_tipo === 'extraccion') {
          volTotal += v.cantidad_real;
        } else {
          uTotales += v.cantidad_real;
        }

        const prodName = v.producto_subtipo ? `${v.producto_nombre} (${v.producto_subtipo})` : v.producto_nombre;
        prodMap[prodName] = (prodMap[prodName] || 0) + v.total_cobrado;
      });

      setDashboardStats({
        ventasTotales: vTotales,
        volumenTotal: volTotal,
        unidadesTotales: uTotales
      });

      const top = Object.entries(prodMap)
        .map(([nombre, total]) => ({ nombre, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      setTopProductos(top);

    } catch (err) {
      console.error('Error cargando dashboard', err);
    } finally {
      setDashboardLoading(false);
    }
  }

  const handleCrearProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !precio || !stock) return;

    setSaving(true);
    const { error } = await supabase.from('productos').insert([{
      nombre, tipo, subtipo, categoria,
      precio: Number(precio),
      stock: Number(stock),
      activo: true
    }]);

    if (error) {
      alert('❌ Error al crear el producto');
    } else {
      alert('✅ Producto guardado');
      setNombre(''); setPrecio(''); setStock(''); setSubtipo(null);
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

  const modificarStockAbsoluto = async (id: string, nuevoStock: number) => {
    if (nuevoStock < 0 || isNaN(nuevoStock)) return;
    
    // UI Optimistic Update
    setProductos(prev => prev.map(p => p.id === id ? { ...p, stock: nuevoStock } : p));
    
    const { error } = await supabase
      .from('productos')
      .update({ stock: nuevoStock, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
       alert('Error actualizando stock de forma manual');
       cargarInventario(); // Revertir si hay error
    }
  };

  const toggleActivo = async (id: string, estadoActual: boolean) => {
    setProductos(prev => prev.map(p => p.id === id ? { ...p, activo: !estadoActual } : p));
    await supabase.from('productos').update({ activo: !estadoActual }).eq('id', id);
  };

  const eliminarProducto = async (id: string, nombre: string) => {
    if (!window.confirm(`🔴 ¿Estás MUY seguro de que quieres ELIMINAR permanentemente "${nombre}"?\n\nSi el producto ya tiene ventas registradas, la base de datos bloqueará el borrado para no corromper la contabilidad. Si eso ocurre, por favor usa el botón de ocultar (👁️/🚫).`)) {
      return;
    }
    
    try {
      const { error } = await supabase.from('productos').delete().eq('id', id);
      if (error) {
        console.error('Error al eliminar producto:', error);
        alert('❌ NO se pudo eliminar el producto.\n\nContiene un historial de ventas. Para no dañar tus cuentas, ocúltalo usando el botón (👁️/🚫).');
      } else {
        setProductos(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al intentar eliminar.');
    }
  };

  const handleAnularVenta = async (ventaId: string, nombreProd: string, total: number) => {
    if (!window.confirm(`⚠️ ESTÁS A PUNTO DE ANULAR UNA VENTA\n\n¿Estás seguro de que quieres anular y eliminar la venta de "${nombreProd}" por ${total.toFixed(2)}€?\n\nEl stock descontado regresará inmediatamente al inventario.`)) {
      return;
    }

    try {
      // Borramos de la tabla 'ventas'. El trigger SQL 'trigger_sumar_stock_borrado' se encarga de reponer el stock.
      const { error } = await supabase.from('ventas').delete().eq('id', ventaId);
      
      if (error) {
        console.error('Error al anular venta:', error);
        alert('Error al intentar anular la venta.');
      } else {
        // Refrescar todas las vistas en caliente
        cargarVentas();
        cargarInventario();
        cargarDashboard();
      }
    } catch (err) {
      console.error(err);
      alert('Fallo de conexión.');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Diccionario de usuarios permitidos { 'usuario': 'contraseña' }
    // Puedes añadir, quitar o modificar usuarios fácilmente aquí
    const usuariosPermitidos: Record<string, string> = {
      'admin': 'club123',
      'yeison': 'clave2026',
      'encargado1': '123456'
    };

    const usuarioIntroducido = usuarioInput.toLowerCase();

    // Verificamos si el usuario introducido existe en la lista y la contraseña coincide
    if (usuariosPermitidos[usuarioIntroducido] === passInput) {
      setIsAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
      setPassInput('');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[100dvh] bg-stone-950 flex items-center justify-center p-4 font-sans selection:bg-emerald-500/30 text-stone-100">
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-stone-900 border border-stone-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-green-600"></div>
          
          <div className="mb-8 text-center text-stone-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h2 className="text-2xl font-black text-stone-100 placeholder:block">Acceso Privado</h2>
            <p className="text-sm mt-2">Área de administración</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-400 mb-1">Usuario</label>
              <input type="text" autoFocus required value={usuarioInput} onChange={e => setUsuarioInput(e.target.value)} placeholder="Ej: admin" className="w-full bg-stone-950 border border-stone-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-stone-700" />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-400 mb-1">Contraseña</label>
              <input type="password" required value={passInput} onChange={e => setPassInput(e.target.value)} placeholder="••••••" className="w-full bg-stone-950 border border-stone-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-stone-700" />
            </div>

            {authError && (
              <p className="text-rose-400 text-sm text-center bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">Credenciales incorrectas, intenta de nuevo.</p>
            )}

            <button type="submit" className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-lg py-4 rounded-xl transition-all shadow-lg active:scale-[0.98]">
              INICIAR SESIÓN
            </button>
            
            <div className="text-center mt-4">
              <Link href="/" className="text-sm text-stone-500 hover:text-stone-300 transition-colors shrink-0">← Volver al Terminal</Link>
            </div>
          </div>
        </form>
      </div>
    );
  }

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
        <div className="flex space-x-2 bg-stone-900 border border-stone-800 p-1.5 rounded-2xl w-full max-w-lg lg:ml-auto">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 py-3 px-2 md:px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-emerald-600 shadow-md text-white' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'}`}
          >
            📊 DASHBOARD
          </button>
          <button 
            onClick={() => setActiveTab('inventario')}
            className={`flex-1 py-3 px-2 md:px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'inventario' ? 'bg-emerald-600 shadow-md text-white' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'}`}
          >
            📦 STOCK
          </button>
          <button 
            onClick={() => setActiveTab('ventas')}
            className={`flex-1 py-3 px-2 md:px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'ventas' ? 'bg-emerald-600 shadow-md text-white' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'}`}
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
                    <select value={tipo} onChange={e => { setTipo(e.target.value as Producto['tipo']); if(e.target.value !== 'extraccion') setSubtipo(null); }} className="w-full bg-stone-950 border border-stone-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none h-14">
                      <option value="weed">Weed</option>
                      <option value="extraccion">Extracción</option>
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

                {tipo === 'extraccion' && (
                  <div>
                    <label className="block text-sm font-medium text-stone-400 mb-1">Subtipo Extra.</label>
                    <select required value={subtipo || ''} onChange={e => setSubtipo(e.target.value as Producto['subtipo'])} className="w-full bg-stone-950 border border-stone-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none h-14">
                      <option value="" disabled>Selecciona...</option>
                      <option value="ICE O LATOR">ICE O LATOR</option>
                      <option value="BHO">BHO</option>
                      <option value="DRY SIFT">DRY SIFT</option>
                      <option value="HASH">HASH</option>
                    </select>
                  </div>
                )}

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
                        <div className="flex gap-2">
                          <button onClick={() => toggleActivo(p.id, p.activo)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-stone-800 hover:bg-stone-700 transition-colors border border-stone-700" title={p.activo ? 'Desactivar y ocultar' : 'Reactivar'}>
                            {p.activo ? '👁️' : '🚫'}
                          </button>
                          <button onClick={() => eliminarProducto(p.id, p.nombre)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-colors border border-rose-500/20" title="Eliminar producto permanentemente">
                            🗑️
                          </button>
                        </div>
                      </div>

                      <div className="bg-stone-900 border border-stone-800 rounded-xl p-2 flex items-center justify-between mt-4">
                        <button onClick={() => modificarStock(p.id, -1, p.stock)} className="w-12 h-12 rounded-lg bg-stone-800 active:bg-rose-500/20 active:text-rose-400 text-stone-300 font-bold text-xl active:scale-95 transition-all outline-none touch-manipulation">
                          -
                        </button>
                        <div className="flex flex-col items-center">
                          <input 
                            type="number" 
                            step="0.01"
                            defaultValue={p.stock} 
                            onBlur={(e) => {
                              const v = parseFloat(e.target.value);
                              if (!isNaN(v) && v !== p.stock && v >= 0) {
                                modificarStockAbsoluto(p.id, v);
                              } else {
                                e.target.value = p.stock.toString(); // Devolver visualmente al original si hay error o no cambia
                              }
                            }}
                            className={`w-28 text-center bg-transparent border-b-2 focus:border-emerald-500 focus:outline-none transition-all pb-1 text-2xl font-black font-mono ${p.stock < 10 ? 'text-rose-400 border-rose-500/30' : 'text-stone-200 border-stone-700'}`}
                          />
                          <span className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mt-1">{p.categoria === 'peso' ? 'gramos' : 'unidades'}</span>
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
                    <tr key={v.venta_id} className="hover:bg-stone-800/30 transition-colors group">
                      <td className="py-5 px-4 text-stone-400 font-mono text-sm whitespace-nowrap">
                        {new Date(v.fecha_hora).toLocaleString('es-ES', { 
                          day: '2-digit', month: '2-digit', year: '2-digit',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="py-5">
                        <div className="font-bold text-stone-200">
                          {v.producto_nombre}
                          {v.concepto && <span className="ml-2 text-sm font-normal italic text-emerald-400">"{v.concepto}"</span>}
                        </div>
                        <div className="text-xs text-stone-500 uppercase mt-0.5">
                          {v.producto_subtipo ? `${v.producto_tipo} - ${v.producto_subtipo}` : v.producto_tipo}
                        </div>
                      </td>
                      <td className="py-5">
                        <div className="font-mono text-stone-300">{v.cantidad_real}</div>
                      </td>
                      <td className="py-5 font-bold text-right pr-4 text-lg">
                        <div className="flex justify-end gap-3 items-center">
                          <button 
                            onClick={() => handleAnularVenta(v.venta_id, v.producto_nombre, v.total_cobrado)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-stone-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
                            title="Anular venta y devolver stock"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                          <div className="text-right">
                            <div className="text-emerald-400">+{v.total_cobrado.toFixed(2)}€</div>
                          </div>
                        </div>
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

      {/* VISTA DE DASHBOARD */}
      {activeTab === 'dashboard' && (
        <section className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-xl font-bold text-stone-100 flex items-center gap-2">
              Rendimiento del Club
            </h2>
            <div className="flex bg-stone-950 border border-stone-800 rounded-xl p-1 w-full sm:w-auto">
              <button onClick={() => setRangoTiempo('hoy')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all ${rangoTiempo === 'hoy' ? 'bg-stone-800 text-white' : 'text-stone-500 hover:text-stone-300'}`}>Hoy</button>
              <button onClick={() => setRangoTiempo('7dias')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all ${rangoTiempo === '7dias' ? 'bg-stone-800 text-white' : 'text-stone-500 hover:text-stone-300'}`}>7 Días</button>
              <button onClick={() => setRangoTiempo('mes')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all ${rangoTiempo === 'mes' ? 'bg-stone-800 text-white' : 'text-stone-500 hover:text-stone-300'}`}>Este Mes</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
              <h3 className="text-stone-400 text-sm font-medium mb-1">Ingresos Totales</h3>
              {dashboardLoading ? (
                <div className="h-10 bg-stone-800 rounded animate-pulse w-3/4 mt-2"></div>
              ) : (
                <p className="text-3xl md:text-5xl font-black text-emerald-400">{dashboardStats.ventasTotales.toFixed(2)}€</p>
              )}
            </div>

            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-stone-800/30 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
              <h3 className="text-stone-400 text-sm font-medium mb-1">Salida de Stock (Flores/Extr)</h3>
              {dashboardLoading ? (
                <div className="h-10 bg-stone-800 rounded animate-pulse w-1/2 mt-2"></div>
              ) : (
                <p className="text-3xl md:text-5xl font-black text-stone-100">{dashboardStats.volumenTotal.toFixed(2)}<span className="text-xl md:text-2xl text-stone-600 ml-1">g</span></p>
              )}
            </div>
            
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-stone-800/30 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
              <h3 className="text-stone-400 text-sm font-medium mb-1">Bebidas/Otros</h3>
              {dashboardLoading ? (
                <div className="h-10 bg-stone-800 rounded animate-pulse w-1/3 mt-2"></div>
              ) : (
                <p className="text-3xl md:text-5xl font-black text-stone-100">{dashboardStats.unidadesTotales}<span className="text-xl md:text-2xl text-stone-600 ml-1">ud</span></p>
              )}
            </div>
          </div>

          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl mt-6">
            <h3 className="text-lg font-bold text-stone-100 mb-6 flex items-center gap-2">🏆 Top 5 Productos Estrellas</h3>
            <div className="space-y-3">
              {dashboardLoading ? (
                [1,2,3,4,5].map(i => (
                  <div key={i} className="h-16 bg-stone-950 border border-stone-800 rounded-2xl animate-pulse"></div>
                ))
              ) : topProductos.length > 0 ? (
                topProductos.map((prod, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-stone-950 border border-stone-800 rounded-2xl hover:border-emerald-500/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${index === 0 ? 'bg-emerald-500/20 text-emerald-400' : index === 1 ? 'bg-stone-800 text-stone-300' : index === 2 ? 'bg-stone-800/60 text-stone-400' : 'bg-stone-900 text-stone-600'}`}>
                        {index + 1}
                      </div>
                      <span className="font-bold text-stone-100">{prod.nombre}</span>
                    </div>
                    <span className="font-mono text-emerald-400 font-bold">{prod.total.toFixed(2)}€</span>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-stone-500 border-2 border-dashed border-stone-800 rounded-2xl">
                  No hay ventas en este periodo.
                </div>
              )}
            </div>
          </div>
        </section>
      )}

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
